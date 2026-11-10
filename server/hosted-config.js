import { isAbsolute } from 'node:path';
export function hostedConfig(env=process.env){
  let url;try{url=new URL(env.DIGI_PUBLIC_ORIGIN);}catch{throw new Error('Defina DIGI_PUBLIC_ORIGIN con el origen HTTPS público');}
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('DIGI_PUBLIC_ORIGIN debe ser HTTPS sin ruta ni credenciales');
  if(!env.DIGI_DB_PATH||!isAbsolute(env.DIGI_DB_PATH))throw new Error('Defina DIGI_DB_PATH absoluto en almacenamiento persistente');
  const port=Number(env.PORT??3000);
  if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('PORT debe estar entre 1024 y 65535');
  const host=env.DIGI_HOST??'127.0.0.1';
  if(!['127.0.0.1','0.0.0.0'].includes(host))throw new Error('DIGI_HOST no válido');
  if(env.DIGI_TRUST_PROXY!==undefined&&!['0','1'].includes(env.DIGI_TRUST_PROXY))throw new Error('DIGI_TRUST_PROXY debe ser 0 o 1');
  return {publicOrigin:url.origin,location:env.DIGI_DB_PATH,port,host,trustProxy:env.DIGI_TRUST_PROXY==='1'};
}
