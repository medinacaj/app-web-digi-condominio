import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Store } from '../server/store.js';
import { sqliteTempCleanup } from './helpers/sqlite-fixture.js';

test('versiona una base existente sin eliminar unidades, cuotas ni incidencias',t=>{
  const root=mkdtempSync(join(tmpdir(),'digi-version-'));const cleanup=sqliteTempCleanup(t,root);
  const file=join(root,'version.sqlite');
  let s=new Store(file);
  const admin=s.createUser('version@example.test','VeryStrongPassword#2026');
  const c=s.createCommunity('Comunidad de versiones','',s.createAccount(admin,{name:'Comunidad de versiones',kind:'independent'}).id);s.setMembership(admin,c,'admin');
  const unit=s.addUnit(admin,c,{code:'101',kind:'Casa'}).id;
  s.addCharge(admin,c,{unitId:unit,period:'2026-10',concept:'Cuota',amountMinor:4000});
  s.addIncident(admin,c,{title:'Prueba de persistencia',detail:'Sin pérdida de reportes',category:'other'});
  s.db.exec('DROP TABLE invitations; DROP TABLE password_reset_tokens; DROP TABLE password_reset_requests; DROP TABLE identity_audit_events; DROP TABLE account_subscriptions; DROP TABLE subscription_events; PRAGMA user_version=4');s.close();
  s=cleanup.track(new Store(file));
  assert.equal(s.db.prepare('PRAGMA user_version').get().user_version,8);
  assert.equal(s.overview(admin,c).units[0].balanceMinor,4000);
  assert.equal(s.incidentsFor(admin,c).length,1);
  assert.equal(s.db.prepare("SELECT COUNT(*) n FROM unit_notifications").get().n,0);
  assert.equal(s.db.prepare("SELECT COUNT(*) n FROM unit_people").get().n,0);
  assert.equal(s.db.prepare("SELECT COUNT(*) n FROM charge_deadlines").get().n,0);
});

test('rehúsa abrir una base con esquema de una versión futura',t=>{
  const root=mkdtempSync(join(tmpdir(),'digi-future-'));const cleanup=sqliteTempCleanup(t,root);
  const file=join(root,'future.sqlite');
  const db=new DatabaseSync(file);db.exec('PRAGMA user_version=99');db.close();
  assert.throws(()=>new Store(file),/versión más reciente/);
  const reopened=cleanup.track(new DatabaseSync(file,{readOnly:true}));
  assert.equal(reopened.prepare('PRAGMA user_version').get().user_version,99);
});
