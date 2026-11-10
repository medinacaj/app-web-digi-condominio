import test from 'node:test';
import assert from 'node:assert/strict';
import { backup } from 'node:sqlite';
import { Store } from '../server/store.js';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('respaldo y restauración recuperan saldos y membresías',async t=>{
 const root=mkdtempSync(join(tmpdir(),'digi-backup-'));t.after(()=>rmSync(root,{force:true,recursive:true}));
 const original=join(root,'origen.sqlite'),copy=join(root,'respaldo.sqlite');
 const db=new Store(original);
 const user=db.createUser('qa@example.test','VeryStrongPassword#2026');
 const community=db.createCommunity('QA','',db.createAccount(user,{name:'QA',kind:'independent'}).id);db.setMembership(user,community,'admin');
 const unit=db.addUnit(user,community,{code:'12',kind:'Departamento'}).id;
 db.addCharge(user,community,{unitId:unit,period:'2026-10',concept:'Cuota',amountMinor:5000});
 await backup(db.db,copy);db.close();
 const restored=new Store(copy);t.after(()=>restored.close());
 assert.equal(restored.db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
 assert.equal(restored.communitiesFor(user).length,1);
 assert.equal(restored.overview(user,community).units[0].balanceMinor,5000);
});
