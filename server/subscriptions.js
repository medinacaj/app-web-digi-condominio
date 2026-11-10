/** Assisted plan metadata. This module never charges money or activates a checkout. */
import { randomUUID } from 'node:crypto';
import { Problem,requireText } from './store.js';
export class Subscriptions {
  constructor(store){this.store=store;}
  get(accountId){
    if(!this.store.db.prepare('SELECT 1 FROM accounts WHERE id=?').get(accountId))throw new Problem(404,'Cuenta no disponible');
    const row=this.store.db.prepare('SELECT plan,status,expires_at expiresAt FROM account_subscriptions WHERE account_id=?').get(accountId);
    return row?{...row}:{status:'unconfigured',plan:null,expiresAt:null};
  }
  set(accountId,{plan,status,expiresAt=null}){
    this.get(accountId);plan=requireText(plan,'Plan',80);
    if(!['trial','active','suspended'].includes(status))throw new Problem(400,'Estado de suscripción no válido');
    if(expiresAt!==null&&(typeof expiresAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(expiresAt)||!Number.isFinite(Date.parse(expiresAt))||new Date(expiresAt).toISOString()!==expiresAt))throw new Problem(400,'Fecha de suscripción no válida; use ISO UTC');
    const now=new Date().toISOString();
    this.store.atomic(()=>{
      this.store.db.prepare('INSERT INTO account_subscriptions VALUES (?,?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET plan=excluded.plan,status=excluded.status,expires_at=excluded.expires_at,updated_at=excluded.updated_at').run(accountId,plan,status,expiresAt,now);
      this.store.db.prepare('INSERT INTO subscription_events VALUES (?,?,?,?,?)').run(randomUUID(),accountId,'subscription.operator_updated',JSON.stringify({plan,status,expiresAt,actor:'local_operator'}),now);
    });
    return {ok:true};
  }
}
