import test from 'node:test';
import assert from 'node:assert/strict';
import {Store} from '../server/store.js';
test('tarifa mensual USD exacta y mínimo por condominio',async()=>{
 const {monthlyPrice}=await import('../server/pricing.js');
 assert.equal(monthlyPrice(0),2500);assert.equal(monthlyPrice(33),2500);assert.equal(monthlyPrice(34),2550);assert.equal(monthlyPrice(100),7500);
 for(const invalid of [-1,1.5,'100',NaN,Number.MAX_SAFE_INTEGER])assert.throws(()=>monthlyPrice(invalid));
});
test('cotización administrativa suma mínimos por condominio y aísla cuentas',async t=>{
 const s=new Store();t.after(()=>s.close());
 const admin=s.createUser('pricing@example.test','SyntheticPricing123!'),other=s.createUser('outside@example.test','SyntheticPricing123!');
 const account=s.createAccount(admin,{name:'Cliente',kind:'management_company'}).id;
 const {quoteAccount}=await import('../server/pricing.js');
 assert.equal(quoteAccount(s,admin,account).amountMinor,0);
 s.createCommunity('Uno','',account);s.createCommunity('Dos','',account);
 const quote=quoteAccount(s,admin,account);assert.equal(quote.amountMinor,5000);assert.equal(quote.currency,'USD');assert.equal(quote.communities.length,2);assert.equal(quote.billingEnabled,false);
 assert.throws(()=>quoteAccount(s,other,account));
});
