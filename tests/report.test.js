import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../server/store.js';
import { csv, csvCell, report } from '../server/report.js';

test('CSV neutraliza fórmulas de Excel y conserva escapado',()=>{
  for(const value of ['=1+1','+cmd','-12','@SUM(1,2)','\t=2','  =HYPERLINK(1)'])assert.ok(csvCell(value).startsWith('"\''));
  assert.equal(csvCell('Texto,"comillas"'),'"Texto,""comillas"""');
  assert.ok(csv(['A'],[['Título']]).startsWith('\uFEFF'));
});
test('proveedores y gastos son privados por comunidad y se exportan sin ejecutar fórmulas',t=>{
  const s=new Store();t.after(()=>s.close());
  const admin=s.createUser('admin@example.test','VeryStrongPassword#2026');
  const outsider=s.createUser('outside@example.test','VeryStrongPassword#2026');
  const committee=s.createUser('committee@example.test','VeryStrongPassword#2026');
  const a=s.createCommunity('Edificio A'),b=s.createCommunity('Edificio B');
  s.setMembership(admin,a,'admin');s.setMembership(outsider,b,'admin');s.setMembership(committee,a,'committee');
  const provider=s.addProvider(admin,a,{name:'=IMPORTXML("mal")',category:'Electricidad'}).id;
  const providerB=s.addProvider(outsider,b,{name:'Seguridad B',category:'Seguridad'}).id;
  assert.throws(()=>s.addExpense(admin,a,{providerId:providerB,period:'2026-10',concept:'Falso',amountMinor:100}),/Proveedor no disponible/);
  const expense=s.addExpense(admin,a,{providerId:provider,period:'2026-10',concept:'Reparación',amountMinor:12500});
  assert.ok(expense.id);
  assert.equal(s.overview(admin,a).providers.length,1);
  assert.equal(s.overview(admin,a).expenses[0].amountMinor,12500);
  assert.equal(s.overview(committee,a).providers.length,0);
  assert.equal(s.overview(committee,a).expenses.length,0);
  assert.throws(()=>s.addProvider(committee,a,{name:'Otro',category:'Servicios'}),/Acceso no autorizado/);
  assert.throws(()=>report(s,committee,a,'expenses'),/Acceso no autorizado/);
  assert.throws(()=>report(s,admin,b,'expenses'),/Acceso no autorizado|Comunidad no disponible/);
  const csvExport=report(s,admin,a,'expenses');
  assert.ok(csvExport.includes("'=IMPORTXML"));
  assert.ok(csvExport.includes('12500'));
});
