// Test-only HTTPS server and synthetic mail capture; never used by hosted-start.
import { createServer } from 'node:https';
import { readFileSync,writeFileSync } from 'node:fs';
import { Store } from '../../server/store.js';
import { createApp } from '../../server/app.js';
import { IdentityService } from '../../server/identity.js';
import { Subscriptions } from '../../server/subscriptions.js';
const s=new Store(process.env.DIGI_DB_PATH);
const admin=s.createUser('admin@online.test','OnlineTestPassword123!');
const account=s.createAccount(admin,{name:'Cliente en línea',kind:'management_company'}).id;
const c=s.createCommunity('Condominio Inicial','',account);s.setMembership(admin,c,'admin');
s.addUnit(admin,c,{code:'WEB-101',kind:'Departamento'});
const messages=[];
const identity=new IdentityService(s,{publicOrigin:process.env.DIGI_PUBLIC_ORIGIN,sendMail:async message=>{messages.push(message);writeFileSync(process.env.TEST_MAIL_PATH,JSON.stringify(messages),{mode:0o600});}});
const app=createApp(s,{hosted:true,publicOrigin:process.env.DIGI_PUBLIC_ORIGIN,identity,subscriptions:new Subscriptions(s)});
const server=createServer({key:readFileSync(process.env.TEST_TLS_KEY),cert:readFileSync(process.env.TEST_TLS_CERT)},(req,res)=>app.emit('request',req,res));
server.listen(Number(process.env.PORT),'127.0.0.1',()=>console.log('TEST HTTPS READY'));
process.on('SIGTERM',()=>{server.close(async()=>{await identity.drain();s.close();process.exit(0);});server.closeAllConnections();});
