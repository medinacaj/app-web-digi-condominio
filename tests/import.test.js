import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../server/store.js';
import { sqliteTempCleanup } from './helpers/sqlite-fixture.js';
import { parseCsv,readUnitRows } from '../server/import-csv.js';
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('parser CSV preserva comillas, separadores y líneas dentro del campo',()=>{
 const input='\uFEFFcode,kind,resident\r\n"A,101",Casa,"Usuario ""demo"""\r\nB-02,Departamento,"Usuario\nDemostración"\r\n';
 assert.equal(readUnitRows(input).length,2);
 assert.equal(readUnitRows(input)[0].code,'A,101');
 assert.equal(readUnitRows(input)[1].resident,'Usuario\nDemostración');
 assert.throws(()=>readUnitRows('code,kind,resident\nA,Casa,X\na,Casa,Y'),/Código duplicado/);
 assert.throws(()=>readUnitRows('code,kind,resident\n"sin cerrar,Casa,X'),/sin cierre/);
 assert.throws(()=>readUnitRows('code,kind,resident\nA,Casa,X,extra'),/tres columnas/);
});
test('importación previa no escribe; aplicación es atómica y verificable',t=>{
 const tmp=mkdtempSync(join(tmpdir(),'digi-import-'));t.after(()=>rmSync(tmp,{force:true,recursive:true}));
 const db=join(tmp,'app.sqlite'),csv=join(tmp,'units.csv');
 const s=new Store(db);const admin=s.createUser('admin@example.test','VeryStrongPassword#2026');const c=s.createCommunity('Prueba','',s.createAccount(admin,{name:'Prueba',kind:'independent'}).id);s.setMembership(admin,c,'admin');s.close();
 writeFileSync(csv,'code,kind,resident\nA-101,Casa,Residente test\nA-102,Departamento,Otra prueba\n');
 const env={...process.env,DIGI_DB_PATH:db,DIGI_TARGET_COMMUNITY_ID:c,DIGI_ADMIN_EMAIL:'admin@example.test',DIGI_IMPORT_FILE:csv};
 const run=(apply)=>spawnSync(process.execPath,['server/import-csv.js'],{cwd:new URL('../',import.meta.url).pathname,env:{...env,...(apply?{DIGI_IMPORT_APPLY:'yes'}:{})},encoding:'utf8'});
 assert.equal(run(false).status,0);
 let view=new Store(db);assert.equal(view.overview(admin,c).units.length,0);view.close();
 assert.equal(run(true).status,0);
 view=new Store(db);assert.equal(view.overview(admin,c).units.length,2);assert.equal(view.overview(admin,c).audit.filter(e=>e.action==='unit.created').length,2);view.close();
 assert.notEqual(run(true).status,0,'La importación repetida debe ser rechazada antes de modificar datos');
});
test('alta local de propietario enlaza unidad y conserva permiso restringido',t=>{
 const tmp=mkdtempSync(join(tmpdir(),'digi-provision-'));const cleanup=sqliteTempCleanup(t,tmp);
 const db=join(tmp,'app.sqlite'),s=new Store(db);
 const admin=s.createUser('admin@example.test','VeryStrongPassword#2026');const c=s.createCommunity('Prueba','',s.createAccount(admin,{name:'Prueba',kind:'independent'}).id);s.setMembership(admin,c,'admin');
 s.addUnit(admin,c,{code:'N-01',kind:'Casa'});s.addUnit(admin,c,{code:'N-02',kind:'Casa'});s.close();
 const env={...process.env,DIGI_DB_PATH:db,DIGI_ADMIN_EMAIL:'admin@example.test',DIGI_TARGET_COMMUNITY_ID:c,DIGI_NEW_USER_EMAIL:'owner@example.test',DIGI_NEW_USER_PASSWORD:'VeryStrongPassword#2026',DIGI_NEW_USER_ROLE:'owner',DIGI_NEW_USER_NAME:'Propietario de prueba',DIGI_ASSIGN_UNIT_CODE:'N-01'};
 const res=spawnSync(process.execPath,['server/add-user.js'],{cwd:new URL('../',import.meta.url).pathname,env,encoding:'utf8'});
 assert.equal(res.status,0,res.stderr);
 const view=cleanup.track(new Store(db));
 const login=view.authenticate('owner@example.test','VeryStrongPassword#2026');
 const data=view.overview(login.user.id,c);assert.equal(data.units.length,1);assert.equal(data.units[0].code,'N-01');
});
