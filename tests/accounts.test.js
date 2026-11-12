import test from 'node:test';
import assert from 'node:assert/strict';
import {Store} from '../server/store.js';
const password='VeryStrongPassword#2026';
function fixture(t){const s=new Store();t.after(()=>s.close());const a=s.createUser('a@example.test',password),b=s.createUser('b@example.test',password),c=s.createUser('c@example.test',password);return {s,a,b,c};}
test('accounts require explicit ownership and do not imply operational permissions',t=>{const {s,a,b}=fixture(t);const x=s.createAccount(a,{name:'Independent',kind:'independent'}).id;assert.throws(()=>s.createCommunity('Missing'),/cuenta/i);const c=s.addCommunity(a,x,{name:'Tower'}).id;assert.equal(s.communitiesFor(a).length,0);assert.throws(()=>s.overview(a,c));assert.equal(s.accountOverview(a,x).communities[0].id,c);assert.throws(()=>s.accountOverview(b,x));s.changeAccountMember(a,x,b,'member');s.changeCommunityMember(a,x,c,b,'admin');assert.equal(s.member(b,c),'admin');assert.equal(s.communitiesFor(b,x)[0].accountId,x);assert.throws(()=>s.changeAccountMember(b,x,b,'account_admin'));assert.throws(()=>s.changeAccountMember(a,x,a,null),/último/i);});
test('revocation immediately blocks every operational path and candidate list',t=>{const {s,a,b,c}=fixture(t);const x=s.createAccount(a,{name:'Management',kind:'management_company'}).id;const co=s.createCommunity('Tower','',x);s.setMembership(a,co,'admin');s.setMembership(b,co,'owner');s.setMembership(c,co,'admin');const u=s.addUnit(a,co,{code:'A',kind:'flat',ownerUserId:b}).id;const i=s.addIncident(b,co,{category:'other',title:'Test incident',detail:'Some detail',unitId:u}).id;s.changeAccountMember(a,x,b,null);assert.equal(s.communitiesFor(b).length,0);for(const op of [()=>s.member(b,co),()=>s.overview(b,co),()=>s.incidentsFor(b,co),()=>s.commentIncident(b,co,i,'hello'),()=>s.addIncident(b,co,{})])assert.throws(op);assert(!s.membersFor(a,co).some(m=>m.id===b));assert.throws(()=>s.addUnit(a,co,{code:'B',kind:'flat',ownerUserId:b}));assert.throws(()=>s.assignUnitOwner(a,co,u,b));assert.throws(()=>s.changeCommunityMember(a,x,co,b,'owner'));assert.equal(s.db.prepare('SELECT role FROM memberships WHERE user_id=?').get(b).role,'owner');});
test('account writes roll back when their distinct audit fails',t=>{const {s,a,b}=fixture(t);const x=s.createAccount(a,{name:'Account',kind:'independent'}).id;s.db.exec("CREATE TRIGGER fail_account_audit BEFORE INSERT ON account_audit_events BEGIN SELECT RAISE(ABORT,'audit unavailable'); END");assert.throws(()=>s.changeAccountMember(a,x,b,'member'),/audit unavailable/);assert.equal(s.accountsFor(b).length,0);assert.throws(()=>s.addCommunity(a,x,{name:'No persist'}));assert.equal(s.accountOverview(a,x).communities.length,0);assert.throws(()=>s.createAccount(a,{name:'No persist',kind:'independent'}));assert.equal(s.accountsFor(a).length,1);});
test('cross account ids cannot grant access; trusted memberships only create ordinary members',t=>{const {s,a,b,c}=fixture(t);const x=s.createAccount(a,{name:'One',kind:'independent'}).id,y=s.createAccount(b,{name:'Two',kind:'management_company'}).id;const co=s.createCommunity('Other','',y);s.setMembership(c,co,'committee');assert.equal(s.accountsFor(c)[0].role,'member');assert.throws(()=>s.changeCommunityMember(a,x,co,c,'admin'));assert.throws(()=>s.communitiesFor(a,y));s.changeAccountMember(b,y,c,null);assert.equal(s.accountsFor(c).length,0);});
test('community grants and revocations roll back with account audit; revoking one account preserves another',t=>{
  const {s,a,b}=fixture(t);
  const x=s.createAccount(a,{name:'First',kind:'independent'}).id;
  const y=s.createAccount(a,{name:'Second',kind:'management_company'}).id;
  const first=s.createCommunity('First tower','',x),second=s.createCommunity('Second tower','',y);
  s.setMembership(b,first,'owner');s.setMembership(b,second,'committee');
  s.changeAccountMember(a,x,b,'account_admin');
  s.db.exec("CREATE TRIGGER fail_account_changes BEFORE INSERT ON account_audit_events BEGIN SELECT RAISE(ABORT,'audit unavailable'); END");
  assert.throws(()=>s.changeCommunityMember(a,x,first,b,'admin'),/audit unavailable/);
  assert.equal(s.member(b,first),'owner');
  assert.throws(()=>s.changeCommunityMember(a,x,first,b,null),/audit unavailable/);
  assert.equal(s.member(b,first),'owner');
  assert.throws(()=>s.changeAccountMember(a,x,b,null),/audit unavailable/);
  assert.equal(s.accountsFor(b).find(c=>c.id===x).role,'account_admin');
  s.db.exec('DROP TRIGGER fail_account_changes');
  s.changeAccountMember(a,x,b,null);
  assert.deepEqual(s.accountsFor(b).map(c=>c.id),[y]);
  assert.equal(s.member(b,second),'committee');
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM audit_events').get().n,0);
  assert(s.accountOverview(a,x).audit.some(e=>e.action==='account.member_revoked'));
});
test('last administrator cannot be demoted; a second account administrator permits explicit transfer',t=>{
  const {s,a,b}=fixture(t);const x=s.createAccount(a,{name:'Transfer',kind:'independent'}).id;
  assert.throws(()=>s.changeAccountMember(a,x,a,'member'),/último/);
  s.changeAccountMember(a,x,b,'account_admin');s.changeAccountMember(a,x,a,'member');
  assert.equal(s.accountsFor(a)[0].role,'member');
  assert.throws(()=>s.changeAccountMember(a,x,a,'account_admin'));
  assert.equal(s.accountOverview(b,x).account.role,'account_admin');
});
