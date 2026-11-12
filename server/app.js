import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Problem } from './store.js';
import { report } from './report.js';
import { quoteAccount } from './pricing.js';
import { webSecurity } from './web-security.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const assets = new Map([
  ['/', ['index.html','text/html; charset=utf-8']],
  ['/index.html', ['index.html','text/html; charset=utf-8']],
  ...['domain.js','ui.js','demo-data.js','main.js','entry.js','connected.js'].map((x) => [`/src/${x}`, [`src/${x}`,'text/javascript; charset=utf-8']]),
  ...['styles.css','connected.css'].map((x) => [`/src/${x}`, [`src/${x}`,'text/css; charset=utf-8']]),
]);
const LIMIT = 16_384;
function send(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
function headers(res){
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
}
async function body(req){
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw new Problem(415,'Se requiere application/json');
  let size=0,chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>LIMIT)throw new Problem(413,'Solicitud demasiado grande');chunks.push(chunk);}
  try{const parsed=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('object expected');return parsed;}
  catch{throw new Problem(400,'JSON inválido');}
}
export function createApp(store,options={}){
  const security=webSecurity(options);
  const {identity=null,subscriptions=null}=options;
  const attempts=new Map();
  const server=createServer(async(req,res)=>{
    headers(res);
    try{
      security.guard(req,res);
      const url=new URL(req.url,'http://localhost');
      const pathname=url.pathname;
      if(req.method==='GET' && pathname==='/api/health')return send(res,200,{status:'ok',service:'digi-condominio',mode:security.hosted?'hosted-pilot':'local-mvp'});
      if(pathname==='/api/login' && req.method==='POST'){
        const data=await body(req);
        // Scope failed attempts to the normalized identity, not the shared reverse-proxy IP.
        // Client-supplied forwarding headers cannot reset or bypass this key.
        const key=createHash('sha256').update(typeof data.email==='string'?data.email.trim().toLowerCase().slice(0,254):'invalid').digest('hex');
        const now=Date.now();
        if(attempts.size>=4096){for(const [k,v] of attempts)if(v.until<now)attempts.delete(k);}
        if(!attempts.has(key)&&attempts.size>=4096)throw new Problem(429,'Demasiadas solicitudes, intente más tarde');
        const a=attempts.get(key)??{n:0,until:now+600_000};
        if(a.until<now){a.n=0;a.until=now+600_000;}
        if(a.n>=8)throw new Problem(429,'Demasiados intentos, intente más tarde');
        const session=store.authenticate(data.email,data.password);
        if(!session){a.n++;attempts.set(key,a);throw new Problem(401,'Credenciales no válidas');}
        attempts.delete(key);
        const previous=security.token(req);if(previous)store.logout(previous);
        security.setSession(res,session.token,session.expires);
        return send(res,200,security.hosted?{user:session.user,expires:session.expires,csrfToken:security.csrf(session.token)}:session);
      }
      if(req.method==='POST'&&['/api/password-reset/request','/api/password-reset/complete','/api/invitations/accept'].includes(pathname)){
        if(!identity)throw new Problem(503,'El servicio de correo e identidad no está configurado');
        const input=await body(req);
        if(pathname==='/api/password-reset/request')return send(res,200,await identity.requestPasswordReset(input.email));
        if(pathname==='/api/password-reset/complete'){
          const result=identity.resetPassword(input);security.clearSession(res);return send(res,200,result);
        }
        const current=store.session(security.token(req));
        return send(res,200,identity.acceptInvitation(input,current?.id??null));
      }
      if(pathname.startsWith('/api/')){
        const token=security.token(req);const user=store.session(token);
        if(!user)throw new Problem(401,'Sesión requerida');
        security.requireCsrf(req,token);
        if(pathname==='/api/session' && req.method==='GET')return send(res,200,{user,...(security.hosted?{csrfToken:security.csrf(token)}:{})});
        if(pathname==='/api/logout' && req.method==='POST'){store.logout(token);security.clearSession(res);return send(res,200,{ok:true});}
        if(pathname==='/api/accounts' && req.method==='GET')return send(res,200,{accounts:store.accountsFor(user.id)});
        const invitationMatch=/^\/api\/accounts\/([a-zA-Z0-9-]{36})\/invitations$/.exec(pathname);
        if(invitationMatch){
          if(req.method!=='POST')throw new Problem(405,'Método no permitido');
          store.requireAccountAdmin(user.id,invitationMatch[1]);
          if(!identity)throw new Problem(503,'El servicio de correo e identidad no está configurado');
          return send(res,201,await identity.createInvitation(user.id,invitationMatch[1],await body(req)));
        }
        const quoteMatch=/^\/api\/accounts\/([a-zA-Z0-9-]{36})\/quote$/.exec(pathname);
        if(quoteMatch){if(req.method!=='GET')throw new Problem(405,'Método no permitido');return send(res,200,{quote:quoteAccount(store,user.id,quoteMatch[1])});}
        const subscriptionMatch=/^\/api\/accounts\/([a-zA-Z0-9-]{36})\/subscription$/.exec(pathname);
        if(subscriptionMatch){
          if(req.method!=='GET')throw new Problem(405,'Método no permitido');
          store.requireAccountAdmin(user.id,subscriptionMatch[1]);
          return send(res,200,{subscription:subscriptions?subscriptions.get(subscriptionMatch[1]):{status:'unconfigured',plan:null,expiresAt:null}});
        }
        const accountMatch=/^\/api\/accounts\/([a-zA-Z0-9-]{36})$/.exec(pathname);
        if(accountMatch){
          if(req.method!=='GET')throw new Problem(405,'Método no permitido');
          return send(res,200,store.accountOverview(user.id,accountMatch[1]));
        }
        const accountCommunities=/^\/api\/accounts\/([a-zA-Z0-9-]{36})\/communities$/.exec(pathname);
        if(accountCommunities){
          if(req.method==='GET')return send(res,200,{communities:store.communitiesFor(user.id,accountCommunities[1])});
          if(req.method==='POST')return send(res,201,store.addCommunity(user.id,accountCommunities[1],await body(req)));
          throw new Problem(405,'Método no permitido');
        }
        const accountMember=/^\/api\/accounts\/([a-zA-Z0-9-]{36})\/members\/([a-zA-Z0-9-]{36})$/.exec(pathname);
        if(accountMember){
          if(req.method!=='PATCH')throw new Problem(405,'Método no permitido');
          const data=await body(req);
          if(!Object.hasOwn(data,'role'))throw new Problem(400,'Indique rol o null para revocar');
          return send(res,200,store.changeAccountMember(user.id,accountMember[1],accountMember[2],data.role));
        }
        const communityMember=/^\/api\/accounts\/([a-zA-Z0-9-]{36})\/communities\/([a-zA-Z0-9-]{36})\/members\/([a-zA-Z0-9-]{36})$/.exec(pathname);
        if(communityMember){
          if(req.method!=='PATCH')throw new Problem(405,'Método no permitido');
          const data=await body(req);
          if(!Object.hasOwn(data,'role'))throw new Problem(400,'Indique rol o null para revocar');
          return send(res,200,store.changeCommunityMember(user.id,communityMember[1],communityMember[2],communityMember[3],data.role));
        }
        if(pathname==='/api/communities' && req.method==='GET')return send(res,200,{communities:store.communitiesFor(user.id)});
        const directoryPersonMatch=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/units\/([a-zA-Z0-9-]{36})\/directory\/([a-zA-Z0-9-]{36})$/.exec(pathname);
        if(directoryPersonMatch){
          const [,communityId,unitId,personId]=directoryPersonMatch;
          if(req.method==='PATCH')return send(res,200,store.changeUnitPerson(user.id,communityId,unitId,personId,await body(req)));
          if(req.method==='DELETE')return send(res,200,store.deactivateUnitPerson(user.id,communityId,unitId,personId));
          throw new Problem(405,'Método no permitido');
        }
        const directoryMatch=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/units\/([a-zA-Z0-9-]{36})\/directory$/.exec(pathname);
        if(directoryMatch){
          const [,communityId,unitId]=directoryMatch;
          if(req.method==='GET')return send(res,200,{directory:store.unitDirectory(user.id,communityId,unitId)});
          if(req.method==='POST')return send(res,201,store.addUnitPerson(user.id,communityId,unitId,await body(req)));
          throw new Problem(405,'Método no permitido');
        }
        const unitNoticeMatch=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/units\/([a-zA-Z0-9-]{36})\/messages$/.exec(pathname);
        if(unitNoticeMatch){
          if(req.method!=='POST')throw new Problem(405,'Método no permitido');
          return send(res,201,store.sendUnitMessage(user.id,unitNoticeMatch[1],unitNoticeMatch[2],await body(req)));
        }
        const consentMatch=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/communication-consent$/.exec(pathname);
        if(consentMatch){
          if(req.method==='GET')return send(res,200,store.communicationConsent(user.id,consentMatch[1]));
          if(req.method==='PUT')return send(res,200,store.setCommunicationConsent(user.id,consentMatch[1],await body(req)));
          throw new Problem(405,'Método no permitido');
        }
        const readNoticeMatch=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/notifications\/([a-zA-Z0-9-]{36})\/read$/.exec(pathname);
        if(readNoticeMatch){
          if(req.method!=='PATCH')throw new Problem(405,'Método no permitido');
          return send(res,200,store.readUnitNotification(user.id,readNoticeMatch[1],readNoticeMatch[2]));
        }
        const inboxMatch=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/notifications$/.exec(pathname);
        if(inboxMatch){
          if(req.method!=='GET')throw new Problem(405,'Método no permitido');
          return send(res,200,{notifications:store.notificationsFor(user.id,inboxMatch[1])});
        }
        const ownerMatch=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/units\/([a-zA-Z0-9-]{36})\/owner$/.exec(pathname);
        if(ownerMatch){
          if(req.method!=='PATCH')throw new Problem(405,'Método no permitido');
          const data=await body(req);
          return send(res,200,store.assignUnitOwner(user.id,ownerMatch[1],ownerMatch[2],data.ownerUserId));
        }
        const membersMatch=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/members$/.exec(pathname);
        if(membersMatch){
          if(req.method!=='GET')throw new Problem(405,'Método no permitido');
          return send(res,200,{members:store.membersFor(user.id,membersMatch[1])});
        }
        const incidentMatch=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/incidents\/([a-zA-Z0-9-]{36})\/(comments|status)$/.exec(pathname);
        if(incidentMatch){
          const [,communityId,incidentId,action]=incidentMatch;
          if(action==='comments' && req.method==='POST'){
            const data=await body(req);
            return send(res,201,store.commentIncident(user.id,communityId,incidentId,data.note));
          }
          if(action==='status' && req.method==='PATCH'){
            const data=await body(req);
            return send(res,200,store.changeIncidentStatus(user.id,communityId,incidentId,data.status,data.note));
          }
          throw new Problem(405,'Método no permitido');
        }
        const reminderMatch=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/reminders\/(preview|prepare)$/.exec(pathname);
        if(reminderMatch){
          const [,communityId,operation]=reminderMatch;
          if(operation==='preview'&&req.method==='GET')return send(res,200,store.previewDueReminders(user.id,communityId));
          if(operation==='prepare'&&req.method==='POST')return send(res,201,store.prepareDueReminders(user.id,communityId));
          throw new Problem(405,'Método no permitido');
        }
        const allocationMatch=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/units\/([a-zA-Z0-9-]{36})\/allocations$/.exec(pathname);
        if(allocationMatch){
          const [,communityId,unitId]=allocationMatch;
          if(req.method==='GET')return send(res,200,store.allocationSnapshot(user.id,communityId,unitId));
          if(req.method==='POST'){
            const input=await body(req);
            if(!input||typeof input!=='object'||Array.isArray(input)||
              Object.keys(input).sort().join(',')!=='amountMinor,chargeId,paymentId')
              throw new Problem(400,'Campos de imputación inválidos');
            return send(res,201,store.allocatePayment(user.id,communityId,{...input,unitId}));
          }
          throw new Problem(405,'Método no permitido');
        }
        const reportDecision=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/payment-reports\/([a-zA-Z0-9-]{36})\/decision$/.exec(pathname);
        if(reportDecision){
          if(req.method!=='POST')throw new Problem(405,'Método no permitido');
          return send(res,200,store.decidePaymentReport(user.id,reportDecision[1],reportDecision[2],await body(req)));
        }
        const paymentReportsMatch=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/payment-reports$/.exec(pathname);
        if(paymentReportsMatch){
          if(req.method==='GET')return send(res,200,{reports:store.paymentReportsFor(user.id,paymentReportsMatch[1])});
          if(req.method==='POST')return send(res,201,store.submitPaymentReport(user.id,paymentReportsMatch[1],await body(req)));
          throw new Problem(405,'Método no permitido');
        }
        const reversalMatch=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/(charges|payments)\/([a-zA-Z0-9-]{36})\/reverse$/.exec(pathname);
        if(reversalMatch){
          if(req.method!=='POST')throw new Problem(405,'Método no permitido');
          const data=await body(req);return send(res,201,store.reverseEntry(user.id,reversalMatch[1],reversalMatch[2]==='charges'?'charge':'payment',reversalMatch[3],data.reason));
        }
        const exportMatch=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/reports\/(units|charges|payments|providers|expenses)\.csv$/.exec(pathname);
        if(exportMatch && req.method==='GET'){
          const output=report(store,user.id,exportMatch[1],exportMatch[2]);
          res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="digi-${exportMatch[2]}.csv"`,'Cache-Control':'no-store'});
          return res.end(output);
        }
        const match=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/(overview|units|charges|payments|announcements|documents|providers|expenses|incidents)$/.exec(pathname);
        if(!match)throw new Problem(404,'Ruta no disponible');
        const [, communityId,resource]=match;
        if(req.method==='GET' && resource==='overview')return send(res,200,store.overview(user.id,communityId));
        if(req.method==='GET' && resource==='incidents')return send(res,200,{incidents:store.incidentsFor(user.id,communityId)});
        if(req.method!=='POST' || resource==='overview')throw new Problem(405,'Método no permitido');
        const input=await body(req);
        const act={units:'addUnit',charges:'addCharge',payments:'addPayment',announcements:'addAnnouncement',documents:'addDocument',providers:'addProvider',expenses:'addExpense',incidents:'addIncident'}[resource];
        return send(res,201,store[act](user.id,communityId,input));
      }
      if(req.method==='GET' && assets.has(pathname)){
        const [file,type]=assets.get(pathname);
        const data=readFileSync(resolve(root,file));
        res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});
        return res.end(data);
      }
      throw new Problem(404,'Ruta no disponible');
    }catch(error){
      const status=error instanceof Problem?error.status:500;
      if(status===500)console.error('Solicitud fallida:',error?.message??'Error interno');
      if(!res.headersSent)send(res,status,{error:status===500?'Error interno':error.message});
      else res.end();
    }
  });
  return server;
}
