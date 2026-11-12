import { createHmac, timingSafeEqual } from 'node:crypto';
import { Problem } from './store.js';
const TOKEN=/^[a-f0-9]{64}$/;
const MUTATIONS=new Set(['POST','PUT','PATCH','DELETE']);
export function webSecurity({hosted=false,publicOrigin,trustProxy=false}={}){
  let origin;
  if(hosted){
    try{origin=new URL(publicOrigin);}catch{throw new Error('Defina un origen público HTTPS válido');}
    if(origin.protocol!=='https:'||origin.username||origin.password||origin.search||origin.hash||origin.pathname!=='/')throw new Error('El origen público debe ser HTTPS sin ruta, usuario ni parámetros');
  }
  const csrf=token=>createHmac('sha256',token).update('digi-condominio-csrf-v1').digest('hex');
  return {
    hosted,origin:origin?.origin,
    guard(req,res){
      if(!hosted)return;
      // Health is intentionally public, contains no session/account information, and supports edge probes.
      if(req.method==='GET'&&req.url==='/api/health')return;
      if(req.headers.host!==origin.host)throw new Problem(403,'Host no permitido');
      const secure=req.socket.encrypted===true||(trustProxy&&req.headers['x-forwarded-proto']==='https');
      // Liveness reveals no account/session data and is also used by private container healthchecks.
      if(!secure && !(req.method==='GET'&&req.url==='/api/health'))throw new Problem(426,'Se requiere HTTPS');
      if(secure)res.setHeader('Strict-Transport-Security','max-age=31536000');
      if(MUTATIONS.has(req.method)&&req.headers.origin!==origin.origin)throw new Problem(403,'Origen no permitido');
    },
    token(req){
      if(!hosted){const found=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization??'');return found?.[1]??null;}
      const cookies=(req.headers.cookie??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith('__Host-digi_session='));
      if(cookies.length!==1)return null;
      const token=cookies[0].slice('__Host-digi_session='.length);return TOKEN.test(token)?token:null;
    },
    requireCsrf(req,token){
      if(!hosted||!MUTATIONS.has(req.method))return;
      const value=req.headers['x-csrf-token'];
      if(typeof value!=='string'||!TOKEN.test(value)||!timingSafeEqual(Buffer.from(value),Buffer.from(csrf(token))))throw new Problem(403,'Protección CSRF: recarga la página');
    },
    csrf:token=>hosted?csrf(token):undefined,
    setSession(res,token,expires){
      if(hosted)res.setHeader('Set-Cookie',`__Host-digi_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.max(0,Math.floor((Date.parse(expires)-Date.now())/1000))}`);
    },
    clearSession(res){if(hosted)res.setHeader('Set-Cookie','__Host-digi_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');}
  };
}
