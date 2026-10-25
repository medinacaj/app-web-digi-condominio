import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { Store, Problem, requireText } from './store.js';

export function parseCsv(input){
  if(typeof input!=='string')throw new Problem(400,'CSV inválido');
  const source=input.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
  const result=[];let row=[],cell='',quoted=false,ended=false;
  for(let i=0;i<source.length;i++){
    const c=source[i];
    if(quoted){if(c==='"'){if(source[i+1]==='"'){cell+='"';i++;}else{quoted=false;ended=true;}}else cell+=c;continue;}
    if(c==='"'){if(cell||ended)throw new Problem(400,'Comillas mal ubicadas en CSV');quoted=true;continue;}
    if(ended && ![',','\n'].includes(c))throw new Problem(400,'Caracteres posteriores a cierre de comillas CSV');
    if(c===','){row.push(cell);cell='';ended=false;continue;}
    if(c==='\n'){row.push(cell);result.push(row);row=[];cell='';ended=false;continue;}
    cell+=c;
  }
  if(quoted)throw new Problem(400,'Campo CSV sin cierre de comillas');
  if(cell||row.length||ended){row.push(cell);result.push(row);}
  return result.filter(x=>x.length>1||x[0]!=='');
}
export function readUnitRows(text){
  const parsed=parseCsv(text);
  if(!parsed.length)throw new Problem(400,'CSV vacío');
  if(parsed[0].join(',')!=='code,kind,resident')throw new Problem(400,'Cabecera obligatoria: code,kind,resident');
  if(parsed.length<2||parsed.length>501)throw new Problem(400,'Se requieren 1 a 500 unidades');
  const seen=new Set();
  return parsed.slice(1).map((r,i)=>{
    if(r.length!==3)throw new Problem(400,`Fila ${i+2}: se requieren tres columnas`);
    const code=requireText(r[0],`Código fila ${i+2}`,40), kind=requireText(r[1],`Tipo fila ${i+2}`,40),resident=r[2].trim();
    if(resident.length>100)throw new Problem(400,`Ocupante fila ${i+2}: longitud inválida`);
    if(seen.has(code.toLocaleLowerCase('es')))throw new Problem(409,`Código duplicado en CSV: ${code}`);
    seen.add(code.toLocaleLowerCase('es'));
    return {code,kind,resident};
  });
}

// Only a local, operator-initiated CLI can execute imports. There is no public upload endpoint.
if(process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\','/'))){
  const env=process.env;
  const file=env.DIGI_IMPORT_FILE, communityId=env.DIGI_TARGET_COMMUNITY_ID,actorEmail=env.DIGI_ADMIN_EMAIL;
  if(!file||!communityId||!actorEmail){console.error('Definir DIGI_IMPORT_FILE, DIGI_TARGET_COMMUNITY_ID y DIGI_ADMIN_EMAIL.');process.exit(1);}
  const path=resolve(file);
  if(statSync(path).size>1_000_000)throw new Problem(413,'CSV excede 1 MB');
  const input=readUnitRows(readFileSync(path,'utf8'));
  const store=new Store(resolve(env.DIGI_DB_PATH??'.data/condominio.sqlite'));
  try{
    const admin=store.db.prepare('SELECT id FROM users WHERE email=?').get(actorEmail.trim().toLowerCase());
    if(!admin)throw new Problem(403,'Administración no autorizada');
    store.requireAdmin(admin.id,communityId);
    const existing=new Set(store.db.prepare('SELECT code FROM units WHERE community_id=?').all(communityId).map(x=>x.code.toLocaleLowerCase('es')));
    for(const item of input)if(existing.has(item.code.toLocaleLowerCase('es')))throw new Problem(409,`Unidad ya registrada: ${item.code}`);
    console.log(`Archivo validado: ${input.length} unidad(es).`);
    if(env.DIGI_IMPORT_APPLY!=='yes')console.log('MODO PREVIO: no se realizaron cambios. Use DIGI_IMPORT_APPLY=yes para confirmar.');
    else {
      store.db.exec('BEGIN IMMEDIATE');
      try{for(const item of input)store.addUnit(admin.id,communityId,item);store.db.exec('COMMIT');}
      catch(error){store.db.exec('ROLLBACK');throw error;}
      console.log('Importación confirmada y auditada.');
    }
  }catch(error){console.error(error.message);process.exitCode=1;}
  finally{store.close();}
}
