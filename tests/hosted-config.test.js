import test from 'node:test';
import assert from 'node:assert/strict';
test('configuración alojada exige HTTPS y almacenamiento explícito, sin proxy implícito',async()=>{
  const {hostedConfig}=await import('../server/hosted-config.js');
  assert.throws(()=>hostedConfig({}),/HTTPS/);
  assert.throws(()=>hostedConfig({DIGI_PUBLIC_ORIGIN:'https://app.example.test'}),/DIGI_DB_PATH/);
  const config=hostedConfig({DIGI_PUBLIC_ORIGIN:'https://app.example.test',DIGI_DB_PATH:'/data/app.sqlite'});
  assert.equal(config.trustProxy,false);assert.equal(config.host,'127.0.0.1');
  assert.throws(()=>hostedConfig({DIGI_PUBLIC_ORIGIN:'https://app.example.test/path',DIGI_DB_PATH:'/data/app.sqlite'}));
});
test('transporte de correo usa HTTPS y errores sin secretos; configuración ausente falla cerrado',async()=>{
  const {createMailer}=await import('../server/mailer.js');
  assert.throws(()=>createMailer({}),/correo/i);
  const sent=[];
  const mailer=createMailer({DIGI_MAIL_FROM:'admin@example.test',DIGI_MAIL_API_KEY:'synthetic-test-key'},{fetchImpl:async(url,options)=>{sent.push({url,options});return {ok:true,status:200};}});
  await mailer({to:'owner@example.test',subject:'Invitación',text:'Mensaje sintético'});
  assert.equal(sent[0].url,'https://api.resend.com/emails');
  assert.deepEqual(JSON.parse(sent[0].options.body).to,['owner@example.test']);
  const broken=createMailer({DIGI_MAIL_FROM:'admin@example.test',DIGI_MAIL_API_KEY:'synthetic-test-key'},{fetchImpl:async()=>{throw Error('sensitive-provider-body');}});
  await assert.rejects(broken({to:'owner@example.test',subject:'Reset',text:'Prueba'}),e=>!e.message.includes('sensitive-provider-body')&&!e.message.includes('synthetic-test-key'));
});
