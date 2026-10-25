import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Problem } from './store.js';
import { report } from './report.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const assets = new Map([
  ['/', ['index.html','text/html; charset=utf-8']],
  ['/index.html', ['index.html','text/html; charset=utf-8']],
  ...['domain.js','ui.js','demo-data.js','main.js','entry.js','connected.js'].map((x) => [`/src/${x}`, [`src/${x}`,'text/javascript; charset=utf-8']]),
  ...['styles.css','connected.css'].map((x) => [`/src/${x}`, [`src/${x}`,'text/css; charset=utf-8']]),
]);
const LIMIT = 16_384;
function send(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
function headers(res){
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
}
async function body(req){
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw new Problem(415,'Se requiere application/json');
  let size=0,chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>LIMIT)throw new Problem(413,'Solicitud demasiado grande');chunks.push(chunk);}
  try{const parsed=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('object expected');return parsed;}
  catch{throw new Problem(400,'JSON inválido');}
}
function bearer(req){const value=req.headers.authorization ?? '';const found=/^Bearer ([a-f0-9]{64})$/.exec(value);return found?.[1]??null;}
export function createApp(store){
  const attempts=new Map();
  const server=createServer(async(req,res)=>{
    headers(res);
    try{
      const url=new URL(req.url,'http://localhost');
      const pathname=url.pathname;
      if(req.method==='GET' && pathname==='/api/health')return send(res,200,{status:'ok',service:'digi-condominio',mode:'local-mvp'});
      if(pathname==='/api/login' && req.method==='POST'){
        const ip=req.socket.remoteAddress??'local';
        const a=attempts.get(ip)??{n:0,until:Date.now()+600_000};
        if(a.until<Date.now()){a.n=0;a.until=Date.now()+600_000;}
        if(a.n>=8)throw new Problem(429,'Demasiados intentos, intente más tarde');
        const data=await body(req);
        const session=store.authenticate(data.email,data.password);
        if(!session){a.n++;attempts.set(ip,a);throw new Problem(401,'Credenciales no válidas');}
        attempts.delete(ip);
        return send(res,200,session);
      }
      if(pathname.startsWith('/api/')){
        const token=bearer(req);const user=store.session(token);
        if(!user)throw new Problem(401,'Sesión requerida');
        if(pathname==='/api/session' && req.method==='GET')return send(res,200,{user});
        if(pathname==='/api/logout' && req.method==='POST'){store.logout(token);return send(res,200,{ok:true});}
        if(pathname==='/api/communities' && req.method==='GET')return send(res,200,{communities:store.communitiesFor(user.id)});
        const ownerMatch=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/units\/([a-zA-Z0-9-]{36})\/owner$/.exec(pathname);
        if(ownerMatch){
          if(req.method!=='PATCH')throw new Problem(405,'Método no permitido');
          const data=await body(req);
          return send(res,200,store.assignUnitOwner(user.id,ownerMatch[1],ownerMatch[2],data.ownerUserId));
        }
        const membersMatch=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/members$/.exec(pathname);
        if(membersMatch){
          if(req.method!=='GET')throw new Problem(405,'Método no permitido');
          return send(res,200,{members:store.membersFor(user.id,membersMatch[1])});
        }
        const incidentMatch=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/incidents\/([a-zA-Z0-9-]{36})\/(comments|status)$/.exec(pathname);
        if(incidentMatch){
          const [,communityId,incidentId,action]=incidentMatch;
          if(action==='comments' && req.method==='POST'){
            const data=await body(req);
            return send(res,201,store.commentIncident(user.id,communityId,incidentId,data.note));
          }
          if(action==='status' && req.method==='PATCH'){
            const data=await body(req);
            return send(res,200,store.changeIncidentStatus(user.id,communityId,incidentId,data.status,data.note));
          }
          throw new Problem(405,'Método no permitido');
        }
        const reversalMatch=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/(charges|payments)\/([a-zA-Z0-9-]{36})\/reverse$/.exec(pathname);
        if(reversalMatch){
          if(req.method!=='POST')throw new Problem(405,'Método no permitido');
          const data=await body(req);return send(res,201,store.reverseEntry(user.id,reversalMatch[1],reversalMatch[2]==='charges'?'charge':'payment',reversalMatch[3],data.reason));
        }
        const exportMatch=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/reports\/(units|charges|payments|providers|expenses)\.csv$/.exec(pathname);
        if(exportMatch && req.method==='GET'){
          const output=report(store,user.id,exportMatch[1],exportMatch[2]);
          res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="digi-${exportMatch[2]}.csv"`,'Cache-Control':'no-store'});
          return res.end(output);
        }
        const match=/^\/api\/communities\/([a-zA-Z0-9-]{36})\/(overview|units|charges|payments|announcements|documents|providers|expenses|incidents)$/.exec(pathname);
        if(!match)throw new Problem(404,'Ruta no disponible');
        const [, communityId,resource]=match;
        if(req.method==='GET' && resource==='overview')return send(res,200,store.overview(user.id,communityId));
        if(req.method==='GET' && resource==='incidents')return send(res,200,{incidents:store.incidentsFor(user.id,communityId)});
        if(req.method!=='POST' || resource==='overview')throw new Problem(405,'Método no permitido');
        const input=await body(req);
        const act={units:'addUnit',charges:'addCharge',payments:'addPayment',announcements:'addAnnouncement',documents:'addDocument',providers:'addProvider',expenses:'addExpense',incidents:'addIncident'}[resource];
        return send(res,201,store[act](user.id,communityId,input));
      }
      if(req.method==='GET' && assets.has(pathname)){
        const [file,type]=assets.get(pathname);
        const data=readFileSync(resolve(root,file));
        res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});
        return res.end(data);
      }
      throw new Problem(404,'Ruta no disponible');
    }catch(error){
      const status=error instanceof Problem?error.status:500;
      if(status===500)console.error('Solicitud fallida:',error?.message??'Error interno');
      if(!res.headersSent)send(res,status,{error:status===500?'Error interno':error.message});
      else res.end();
    }
  });
  return server;
}
