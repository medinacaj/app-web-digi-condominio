import { resolve } from 'node:path';
import { Store } from './store.js';
import { createApp } from './app.js';

const host='127.0.0.1';
const port=Number(process.env.PORT??4173);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('PORT debe estar entre 1024 y 65535');
const location=resolve(process.env.DIGI_DB_PATH??'.data/condominio.sqlite');
const store=new Store(location);
const server=createApp(store);
server.listen(port,host,()=>console.log(`Digi-Condominio local: http://${host}:${port} (usuarios registrados: ${store.countUsers()})`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close(()=>{store.close();process.exit(0);});});
