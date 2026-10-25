/** Encrypted backups for small local SQLite datasets. Not a production backup service. */
import { backup, DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, linkSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const HEADER=Buffer.from('DGCB1');
const MAX_SIZE=100*1024*1024; // Explicit limit: this implementation buffers the file in memory.
function key(passphrase,salt){
  if(typeof passphrase!=='string'||passphrase.length<20||passphrase.length>1024)
    throw new Error('La frase de cifrado debe tener de 20 a 1024 caracteres');
  return scryptSync(passphrase,salt,32,{N:32768,r:8,p:1,maxmem:64*1024*1024});
}
export function encryptSqlite(bytes,passphrase){
  if(!Buffer.isBuffer(bytes)||!bytes.subarray(0,16).equals(Buffer.from('SQLite format 3\0'))||bytes.length>MAX_SIZE)
    throw new Error('Entrada SQLite no válida o tamaño mayor que 100 MB');
  const salt=randomBytes(16),iv=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',key(passphrase,salt),iv);
  const encrypted=Buffer.concat([cipher.update(bytes),cipher.final()]);
  return Buffer.concat([HEADER,salt,iv,cipher.getAuthTag(),encrypted]);
}
export function decryptSqlite(bytes,passphrase){
  if(!Buffer.isBuffer(bytes)||bytes.length<HEADER.length+16+12+16+16||bytes.length>MAX_SIZE+49||!bytes.subarray(0,HEADER.length).equals(HEADER))
    throw new Error('Formato de respaldo no válido');
  const salt=bytes.subarray(5,21),iv=bytes.subarray(21,33),tag=bytes.subarray(33,49),ciphertext=bytes.subarray(49);
  try{
    const cipher=createDecipheriv('aes-256-gcm',key(passphrase,salt),iv);
    cipher.setAuthTag(tag);
    const plaintext=Buffer.concat([cipher.update(ciphertext),cipher.final()]);
    if(!plaintext.subarray(0,16).equals(Buffer.from('SQLite format 3\0')))throw new Error('SQLite no válido');
    return plaintext;
  }catch(error){if(String(error.message).includes('frase de cifrado'))throw error;
    throw new Error('Contraseña incorrecta o respaldo modificado');}
}
function integrity(location){
  const db=new DatabaseSync(location,{readOnly:true});
  try{if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('integrity_check no superado');}
  finally{db.close();}
}
export async function createEncryptedBackup(store,destination,passphrase){
  destination=resolve(destination);
  if(existsSync(destination))throw new Error('El archivo de respaldo de destino ya existe');
  const work=mkdtempSync(join(tmpdir(),'digi-encrypted-'));
  try{
    const snapshot=join(work,'snapshot.sqlite');
    await backup(store.db,snapshot);
    integrity(snapshot);
    const encrypted=encryptSqlite(readFileSync(snapshot),passphrase);
    mkdirSync(dirname(destination),{recursive:true,mode:0o700});
    writeFileSync(destination,encrypted,{flag:'wx',mode:0o600});
    return {bytes:encrypted.length};
  }finally{rmSync(work,{recursive:true,force:true});}
}
export function restoreEncryptedBackup(source,destination,passphrase){
  source=resolve(source);destination=resolve(destination);
  if(source===destination||existsSync(destination))throw new Error('La base de datos de destino ya existe o coincide con el respaldo');
  const data=decryptSqlite(readFileSync(source),passphrase);
  mkdirSync(dirname(destination),{recursive:true,mode:0o700});
  // Work beside the destination so the final hard link cannot overwrite an existing database.
  const work=mkdtempSync(join(dirname(destination),'.digi-restore-'));
  try{
    const restored=join(work,'restore.sqlite');
    writeFileSync(restored,data,{mode:0o600,flag:'wx'});
    integrity(restored);
    linkSync(restored,destination);
    return {bytes:data.length};
  }finally{rmSync(work,{recursive:true,force:true});}
}
