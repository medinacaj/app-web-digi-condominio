import { randomBytes,randomUUID,createHash } from 'node:crypto';
import { Problem,requireText,roles } from './store.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
const emailValue=value=>{const email=requireText(value,'Correo',254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Problem(400,'Correo inválido');return email;};
const invalid=()=>new Problem(400,'Enlace inválido o vencido');
export class IdentityService {
  constructor(store,{publicOrigin,sendMail,now=()=>Date.now()}){
    const url=new URL(publicOrigin);
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Problem(400,'Origen público HTTPS obligatorio');
    if(typeof sendMail!=='function')throw new Problem(400,'Transporte de correo obligatorio');
    this.store=store;this.origin=url.origin;this.sendMail=sendMail;this.now=now;this.pendingDeliveries=new Set();this.maxPendingDeliveries=32;
  }
  timestamp(){return new Date(this.now()).toISOString();}
  async createInvitation(actorId,accountId,{email,role='member',communityId=null,communityRole=null}){
    email=emailValue(email);const s=this.store;
    s.requireAccountAdmin(actorId,accountId);
    if(!['account_admin','member'].includes(role))throw new Problem(400,'Rol de cuenta inválido');
    if((communityId===null)!==(communityRole===null)||communityRole!==null&&!roles.has(communityRole))throw new Problem(400,'Asignación inválida');
    if(communityId!==null&&!s.db.prepare('SELECT 1 FROM communities WHERE id=? AND account_id=?').get(communityId,accountId))throw new Problem(404,'Comunidad no disponible');
    const token=randomBytes(32).toString('hex'),id=randomUUID(),expiresAt=new Date(this.now()+24*3600_000).toISOString();
    s.atomic(()=>{s.db.prepare('DELETE FROM invitations WHERE account_id=? AND email=? AND consumed_at IS NULL').run(accountId,email);s.db.prepare('INSERT INTO invitations VALUES (?,?,?,?,?,?,?,?,?,NULL)').run(id,hash(token),accountId,actorId,email,role,communityId,communityRole,expiresAt);
      s.accountAudit(actorId,accountId,'invitation.created',id);});
    try{await this.sendMail({to:email,subject:'Invitación a Digi-Condominio',text:`Acepta tu invitación: ${this.origin}/#invite=${token}`});}
    catch(error){s.atomic(()=>{s.db.prepare('DELETE FROM invitations WHERE id=? AND consumed_at IS NULL').run(id);s.accountAudit(actorId,accountId,'invitation.delivery_failed',id);});throw new Problem(502,'No se pudo entregar la invitación');}
    return {id,expiresAt};
  }
  acceptInvitation({token,name,password},currentUserId=null){
    if(typeof token!=='string'||! /^[a-f0-9]{64}$/.test(token))throw invalid();
    const s=this.store;
    return s.atomic(()=>{
      const invite=s.db.prepare('SELECT * FROM invitations WHERE token_hash=? AND consumed_at IS NULL AND expires_at>?').get(hash(token),this.timestamp());
      if(!invite)throw invalid();
      s.requireAccountAdmin(invite.issuer_id,invite.account_id);
      if(invite.community_id&&!s.db.prepare('SELECT 1 FROM communities WHERE id=? AND account_id=?').get(invite.community_id,invite.account_id))throw invalid();
      let user=s.db.prepare('SELECT id FROM users WHERE email=?').get(invite.email);
      if(user){if(user.id!==currentUserId)throw new Problem(403,'Inicia sesión con el correo invitado');}
      else {if(currentUserId)throw new Problem(403,'La sesión no corresponde al correo invitado');user={id:s.createUser(invite.email,password,name)};}
      // An invitation grants access without silently demoting existing administrators.
      s.db.prepare("INSERT INTO account_memberships VALUES (?,?,?) ON CONFLICT(account_id,user_id) DO UPDATE SET role=CASE WHEN account_memberships.role='account_admin' THEN 'account_admin' ELSE excluded.role END").run(invite.account_id,user.id,invite.role);
      if(invite.community_id)s.db.prepare('INSERT INTO memberships VALUES (?,?,?) ON CONFLICT(user_id,community_id) DO UPDATE SET role=excluded.role').run(user.id,invite.community_id,invite.community_role);
      s.db.prepare('UPDATE invitations SET consumed_at=? WHERE account_id=? AND email=? AND consumed_at IS NULL').run(this.timestamp(),invite.account_id,invite.email);
      s.accountAudit(user.id,invite.account_id,'invitation.accepted',invite.id);
      return {ok:true};
    });
  }
  async requestPasswordReset(value){
    const email=emailValue(value),s=this.store,now=this.timestamp(),emailHash=hash(email);
    const token=randomBytes(32).toString('hex');
    const user=s.atomic(()=>{
      const last=s.db.prepare('SELECT requested_at FROM password_reset_requests WHERE email_hash=?').get(emailHash);
      if(last&&this.now()-Date.parse(last.requested_at)<60_000)return null;
      s.db.prepare('INSERT INTO password_reset_requests VALUES (?,?) ON CONFLICT(email_hash) DO UPDATE SET requested_at=excluded.requested_at').run(emailHash,now);
      const user=s.db.prepare('SELECT id,email FROM users WHERE email=?').get(email);
      if(user&&this.pendingDeliveries.size<this.maxPendingDeliveries)s.db.prepare('INSERT INTO password_reset_tokens VALUES (?,?,?,NULL)').run(hash(token),user.id,new Date(this.now()+3600_000).toISOString());
      return this.pendingDeliveries.size<this.maxPendingDeliveries?user:null;
    });
    if(user)this.enqueueResetDelivery(user,token);
    return {ok:true};
  }
  enqueueResetDelivery(user,token){
    const s=this.store;
    const delivery=new Promise(resolve=>setImmediate(resolve)).then(async()=>{try{await this.sendMail({to:user.email,subject:'Recupera tu acceso a Digi-Condominio',text:`Cambia tu contraseña: ${this.origin}/#reset=${token}`});}
      catch{ s.db.prepare('DELETE FROM password_reset_tokens WHERE token_hash=? AND consumed_at IS NULL').run(hash(token)); }
    }).finally(()=>this.pendingDeliveries.delete(delivery));
    this.pendingDeliveries.add(delivery);
  }
  async drain(){
    while(this.pendingDeliveries.size)await Promise.allSettled([...this.pendingDeliveries]);
  }
  resetPassword({token,password}){
    if(typeof token!=='string'||! /^[a-f0-9]{64}$/.test(token))throw invalid();
    const s=this.store;
    return s.atomic(()=>{
      const reset=s.db.prepare('SELECT user_id FROM password_reset_tokens WHERE token_hash=? AND consumed_at IS NULL AND expires_at>?').get(hash(token),this.timestamp());
      if(!reset)throw invalid();
      s.changePassword(reset.user_id,password);
      s.db.prepare('UPDATE password_reset_tokens SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL').run(this.timestamp(),reset.user_id);
      s.db.prepare('INSERT INTO identity_audit_events VALUES (?,?,?,?)').run(randomUUID(),reset.user_id,'password.reset',this.timestamp());
      return {ok:true};
    });
  }
}
