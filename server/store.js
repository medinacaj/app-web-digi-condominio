import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

export const roles = new Set(['admin', 'committee', 'owner']);
const VALID = /^[a-z0-9-]{1,80}$/;
const emailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export class Problem extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function requireText(value, label, max = 140) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Problem(400, `${label}: texto obligatorio de hasta ${max} caracteres`);
  return value.trim();
}
export function requireMinor(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 100_000_000_000) throw new Problem(400, 'Importe inválido en unidades menores');
  return value;
}
export function requirePeriod(value) {
  if (typeof value !== 'string' || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(value)) throw new Problem(400, 'Período inválido, use AAAA-MM');
  return value;
}
const hashPassword = (password, salt = randomBytes(16).toString('hex')) => {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) throw new Problem(400, 'La contraseña debe tener de 12 a 128 caracteres');
  return `scrypt$${salt}$${scryptSync(password, Buffer.from(salt, 'hex'), 64).toString('hex')}`;
};
const verifyPassword = (password, saved) => {
  const [kind, salt, expected] = String(saved || '').split('$');
  if (kind !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(expected ?? '')) return false;
  const actual = scryptSync(password, Buffer.from(salt, 'hex'), 64);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
};
const fingerprint = (token) => createHash('sha256').update(token).digest('hex');
const dateNow = () => new Date().toISOString();
const rows = (statement, ...params) => statement.all(...params).map((row) => ({ ...row }));

export class Store {
  constructor(location = ':memory:') {
    if (location !== ':memory:') mkdirSync(dirname(location), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(location);
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS communities (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS memberships (
        user_id TEXT NOT NULL REFERENCES users(id), community_id TEXT NOT NULL REFERENCES communities(id),
        role TEXT NOT NULL CHECK(role IN ('admin','committee','owner')),
        PRIMARY KEY (user_id, community_id)
      );
      CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id), code TEXT NOT NULL,
        kind TEXT NOT NULL, resident TEXT NOT NULL DEFAULT '', owner_user_id TEXT REFERENCES users(id),
        created_at TEXT NOT NULL, UNIQUE(community_id, code), UNIQUE(id,community_id)
      );
      CREATE TABLE IF NOT EXISTS charges (
        id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id),
        unit_id TEXT NOT NULL, period TEXT NOT NULL, concept TEXT NOT NULL,
        amount_minor INTEGER NOT NULL CHECK(amount_minor>0), created_at TEXT NOT NULL,
        FOREIGN KEY(unit_id,community_id) REFERENCES units(id,community_id),
        UNIQUE(community_id,unit_id,period,concept)
      );
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id),
        unit_id TEXT NOT NULL, reference TEXT NOT NULL, concept TEXT NOT NULL,
        amount_minor INTEGER NOT NULL CHECK(amount_minor>0), created_at TEXT NOT NULL,
        FOREIGN KEY(unit_id,community_id) REFERENCES units(id,community_id),
        UNIQUE(community_id,reference)
      );
      CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id),
        title TEXT NOT NULL, body TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id),
        title TEXT NOT NULL, category TEXT NOT NULL, scope TEXT NOT NULL CHECK(scope IN ('community','committee','admin')),
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS reversals (
        id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id),
        entity_type TEXT NOT NULL CHECK(entity_type IN ('charge','payment')),
        entity_id TEXT NOT NULL, actor_user_id TEXT NOT NULL REFERENCES users(id),
        reason TEXT NOT NULL, created_at TEXT NOT NULL,
        UNIQUE(community_id,entity_type,entity_id)
      );
      CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id),
        name TEXT NOT NULL, category TEXT NOT NULL, created_at TEXT NOT NULL,
        UNIQUE(id,community_id), UNIQUE(community_id,name)
      );
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id),
        provider_id TEXT NOT NULL, period TEXT NOT NULL, concept TEXT NOT NULL,
        amount_minor INTEGER NOT NULL CHECK(amount_minor>0), created_at TEXT NOT NULL,
        FOREIGN KEY(provider_id,community_id) REFERENCES providers(id,community_id)
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id),
        user_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL,
        entity_id TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_units_community ON units(community_id);
      CREATE INDEX IF NOT EXISTS ix_charges_community ON charges(community_id,unit_id);
      CREATE INDEX IF NOT EXISTS ix_payments_community ON payments(community_id,unit_id);
      CREATE INDEX IF NOT EXISTS ix_announcements_community ON announcements(community_id);
      CREATE INDEX IF NOT EXISTS ix_expenses_community ON expenses(community_id);
      CREATE INDEX IF NOT EXISTS ix_reversals_community ON reversals(community_id,entity_type,entity_id);
      CREATE INDEX IF NOT EXISTS ix_providers_community ON providers(community_id);
    `);
  }
  close() { this.db.close(); }
  countUsers() { return this.db.prepare('SELECT COUNT(*) n FROM users').get().n; }
  createUser(email, password, displayName = 'Administración') {
    email = requireText(email, 'Correo', 254).toLowerCase();
    if (!emailFormat.test(email)) throw new Problem(400, 'Correo inválido');
    displayName = requireText(displayName, 'Nombre', 100);
    const id = randomUUID();
    try { this.db.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run(id, email, displayName, hashPassword(password), dateNow()); }
    catch (error) { if (String(error).includes('UNIQUE')) throw new Problem(409, 'Correo ya registrado'); throw error; }
    return id;
  }
  createCommunity(name, address = '') {
    name = requireText(name, 'Comunidad', 130);
    if (typeof address !== 'string' || address.length > 200) throw new Problem(400, 'Dirección inválida');
    const id = randomUUID();
    this.db.prepare('INSERT INTO communities VALUES (?,?,?,?)').run(id, name, address.trim(), dateNow());
    return id;
  }
  setMembership(userId, communityId, role) {
    if (!roles.has(role)) throw new Problem(400, 'Rol inválido');
    this.db.prepare('INSERT INTO memberships VALUES (?,?,?)').run(userId, communityId, role);
  }
  authenticate(email, password) {
    if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 128) return null;
    const u = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
    // Perform the same costly hash operation for unknown accounts to reduce enumeration.
    const dummy = 'scrypt$00000000000000000000000000000000$' + '0'.repeat(128);
    const valid = verifyPassword(password, u?.password_hash ?? dummy);
    if (!u || !valid) return null;
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    this.db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(fingerprint(token), u.id, expires);
    return { token, user: { id: u.id, email: u.email, displayName: u.display_name }, expires };
  }
  session(token) {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
    const record = this.db.prepare(`SELECT u.id, u.email, u.display_name displayName, s.expires_at expires
      FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at > ?`)
      .get(fingerprint(token), dateNow());
    return record ? { ...record } : null;
  }
  logout(token) { if (typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)) this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(fingerprint(token)); }
  communitiesFor(userId) {
    return rows(this.db.prepare(`SELECT c.id,c.name,c.address,m.role,
       (SELECT COUNT(*) FROM units u WHERE u.community_id=c.id AND (m.role<>'owner' OR u.owner_user_id=?)) units
       FROM memberships m JOIN communities c ON m.community_id=c.id WHERE m.user_id=? ORDER BY c.name`), userId, userId);
  }
  member(userId, communityId) {
    if (!/^[a-f0-9-]{36}$/.test(communityId ?? '')) throw new Problem(404, 'Comunidad no disponible');
    const m = this.db.prepare('SELECT role FROM memberships WHERE user_id=? AND community_id=?').get(userId, communityId);
    if (!m) throw new Problem(404, 'Comunidad no disponible');
    return m.role;
  }
  requireAdmin(userId, communityId) { if (this.member(userId, communityId) !== 'admin') throw new Problem(403, 'Acceso no autorizado'); }
  audit(userId, communityId, action, entityId) { this.db.prepare('INSERT INTO audit_events VALUES (?,?,?,?,?,?)').run(randomUUID(), communityId, userId, action, entityId, dateNow()); }
  overview(userId, communityId) {
    const role = this.member(userId, communityId);
    const visibility = role === 'owner' ? ' AND u.owner_user_id=?' : '';
    const params = role === 'owner' ? [communityId, userId] : [communityId];
    const balanceColumn = role === 'committee' ? 'NULL' : `COALESCE((SELECT SUM(c.amount_minor) FROM charges c WHERE c.unit_id=u.id AND NOT EXISTS (SELECT 1 FROM reversals r WHERE r.community_id=c.community_id AND r.entity_type='charge' AND r.entity_id=c.id)),0) - COALESCE((SELECT SUM(p.amount_minor) FROM payments p WHERE p.unit_id=u.id AND NOT EXISTS (SELECT 1 FROM reversals r WHERE r.community_id=p.community_id AND r.entity_type='payment' AND r.entity_id=p.id)),0)`;
    const units = rows(this.db.prepare(`SELECT u.id,u.code,u.kind,u.resident,${role === 'admin' ? 'u.owner_user_id' : 'NULL'} ownerUserId,
      ${balanceColumn} balanceMinor FROM units u WHERE u.community_id=?${visibility} ORDER BY u.code`), ...params);
    const charges = role === 'committee' ? [] : rows(this.db.prepare(`SELECT c.id,c.unit_id unitId,u.code unit,c.period,c.concept,c.amount_minor amountMinor,c.created_at createdAt,
      EXISTS(SELECT 1 FROM reversals r WHERE r.community_id=c.community_id AND r.entity_type='charge' AND r.entity_id=c.id) reversed,
      ${role === 'admin' ? `(SELECT reason FROM reversals r WHERE r.community_id=c.community_id AND r.entity_type='charge' AND r.entity_id=c.id)` : 'NULL'} reverseReason
      FROM charges c JOIN units u ON u.id=c.unit_id WHERE c.community_id=?${visibility} ORDER BY c.created_at DESC`), ...params);
    const payments = role === 'committee' ? [] : rows(this.db.prepare(`SELECT p.id,p.unit_id unitId,u.code unit,p.reference,p.concept,p.amount_minor amountMinor,p.created_at createdAt,
      EXISTS(SELECT 1 FROM reversals r WHERE r.community_id=p.community_id AND r.entity_type='payment' AND r.entity_id=p.id) reversed,
      ${role === 'admin' ? `(SELECT reason FROM reversals r WHERE r.community_id=p.community_id AND r.entity_type='payment' AND r.entity_id=p.id)` : 'NULL'} reverseReason
      FROM payments p JOIN units u ON u.id=p.unit_id WHERE p.community_id=?${visibility} ORDER BY p.created_at DESC`), ...params);
    const announcements = rows(this.db.prepare('SELECT id,title,body,created_at createdAt FROM announcements WHERE community_id=? ORDER BY created_at DESC'), communityId);
    const scope = role === 'admin' ? ['community','committee','admin'] : role === 'committee' ? ['community','committee'] : ['community'];
    const documents = rows(this.db.prepare(`SELECT id,title,category,scope,created_at createdAt FROM documents WHERE community_id=? AND scope IN (${scope.map(() => '?').join(',')}) ORDER BY created_at DESC`), communityId, ...scope);
    const providers = role === 'admin' ? rows(this.db.prepare('SELECT id,name,category,created_at createdAt FROM providers WHERE community_id=? ORDER BY name'), communityId) : [];
    const expenses = role === 'admin' ? rows(this.db.prepare(`SELECT e.id,e.period,e.concept,e.amount_minor amountMinor,e.created_at createdAt,p.name provider
      FROM expenses e JOIN providers p ON p.id=e.provider_id WHERE e.community_id=? ORDER BY e.created_at DESC`), communityId) : [];
    const audit = role === 'admin' ? rows(this.db.prepare(`SELECT id,action,entity_id entityId,created_at createdAt FROM audit_events WHERE community_id=? ORDER BY created_at DESC LIMIT 40`), communityId) : [];
    return { role, communityId, units, charges, payments, announcements, documents, providers, expenses, audit };
  }
  unitIsIn(communityId, unitId) {
    return Boolean(this.db.prepare('SELECT id FROM units WHERE community_id=? AND id=?').get(communityId, unitId));
  }
  addUnit(userId, communityId, data) {
    this.requireAdmin(userId, communityId);
    const code=requireText(data.code,'Unidad',40), kind=requireText(data.kind,'Tipo',40), resident=String(data.resident??'').trim();
    if(resident.length>100) throw new Problem(400,'Ocupante demasiado largo');
    const ownerId=data.ownerUserId??null;
    if(ownerId && !this.db.prepare(`SELECT 1 FROM memberships WHERE user_id=? AND community_id=? AND role='owner'`).get(ownerId,communityId)) throw new Problem(400,'Propietario inválido para esta comunidad');
    const id=randomUUID();
    try{this.db.prepare('INSERT INTO units VALUES (?,?,?,?,?,?,?)').run(id,communityId,code,kind,resident,ownerId,dateNow());}
    catch(e){if(String(e).includes('UNIQUE')) throw new Problem(409,'La unidad ya existe');throw e;}
    this.audit(userId,communityId,'unit.created',id);
    return {id};
  }
  addCharge(userId,communityId,data){
    this.requireAdmin(userId,communityId);
    const unitId=requireText(data.unitId,'Unidad',60),period=requirePeriod(data.period),concept=requireText(data.concept,'Concepto',100),amountMinor=requireMinor(data.amountMinor);
    if(!this.unitIsIn(communityId,unitId)) throw new Problem(404,'Unidad no disponible');
    const id=randomUUID();
    try{this.db.prepare('INSERT INTO charges VALUES (?,?,?,?,?,?,?)').run(id,communityId,unitId,period,concept,amountMinor,dateNow());}
    catch(e){if(String(e).includes('UNIQUE')) throw new Problem(409,'Cuota duplicada para período, unidad y concepto');throw e;}
    this.audit(userId,communityId,'charge.created',id);
    return {id};
  }
  addPayment(userId,communityId,data){
    this.requireAdmin(userId,communityId);
    const unitId=requireText(data.unitId,'Unidad',60), reference=requireText(data.reference,'Referencia',90),concept=requireText(data.concept,'Concepto',100),amountMinor=requireMinor(data.amountMinor);
    if(!this.unitIsIn(communityId,unitId)) throw new Problem(404,'Unidad no disponible');
    const id=randomUUID();
    try{this.db.prepare('INSERT INTO payments VALUES (?,?,?,?,?,?,?)').run(id,communityId,unitId,reference,concept,amountMinor,dateNow());}
    catch(e){if(String(e).includes('UNIQUE')) throw new Problem(409,'Referencia de pago duplicada en la comunidad');throw e;}
    this.audit(userId,communityId,'payment.created',id);
    return {id};
  }
  addAnnouncement(userId,communityId,data){
    this.requireAdmin(userId,communityId);
    const title=requireText(data.title,'Título',90),body=requireText(data.body,'Mensaje',2000),id=randomUUID();
    this.db.prepare('INSERT INTO announcements VALUES (?,?,?,?,?,?)').run(id,communityId,title,body,userId,dateNow());
    this.audit(userId,communityId,'announcement.created',id);
    return {id};
  }
  reverseEntry(userId,communityId,type,entityId,reason){
    this.requireAdmin(userId,communityId);
    if(!['charge','payment'].includes(type))throw new Problem(400,'Tipo de reverso no admitido');
    reason=requireText(reason,'Motivo de reverso',500);
    if(reason.length<10)throw new Problem(400,'El motivo requiere 10 caracteres o más');
    const table=type==='charge'?'charges':'payments';
    const exists=this.db.prepare(`SELECT id FROM ${table} WHERE id=? AND community_id=?`).get(entityId,communityId);
    if(!exists)throw new Problem(404,'Movimiento no disponible');
    const id=randomUUID();
    try{this.db.prepare('INSERT INTO reversals VALUES (?,?,?,?,?,?,?)').run(id,communityId,type,entityId,userId,reason,dateNow());}
    catch(e){if(String(e).includes('UNIQUE'))throw new Problem(409,'Movimiento ya reversado');throw e;}
    this.audit(userId,communityId,`${type}.reversed`,entityId);
    return {id};
  }
  addProvider(userId,communityId,data){
    this.requireAdmin(userId,communityId);
    const name=requireText(data.name,'Proveedor',130),category=requireText(data.category,'Rubro',70),id=randomUUID();
    try{this.db.prepare('INSERT INTO providers VALUES (?,?,?,?,?)').run(id,communityId,name,category,dateNow());}
    catch(e){if(String(e).includes('UNIQUE'))throw new Problem(409,'Proveedor ya registrado');throw e;}
    this.audit(userId,communityId,'provider.created',id);
    return {id};
  }
  addExpense(userId,communityId,data){
    this.requireAdmin(userId,communityId);
    const providerId=requireText(data.providerId,'Proveedor',60),period=requirePeriod(data.period),
      concept=requireText(data.concept,'Concepto',100),amountMinor=requireMinor(data.amountMinor);
    if(!this.db.prepare('SELECT 1 FROM providers WHERE community_id=? AND id=?').get(communityId,providerId))throw new Problem(404,'Proveedor no disponible');
    const id=randomUUID();
    this.db.prepare('INSERT INTO expenses VALUES (?,?,?,?,?,?,?)').run(id,communityId,providerId,period,concept,amountMinor,dateNow());
    this.audit(userId,communityId,'expense.created',id);
    return {id};
  }
  addDocument(userId,communityId,data){
    this.requireAdmin(userId,communityId);
    const title=requireText(data.title,'Documento',150),category=requireText(data.category,'Categoría',60),scope=data.scope;
    if(!['community','committee','admin'].includes(scope))throw new Problem(400,'Visibilidad inválida');
    const id=randomUUID();
    this.db.prepare('INSERT INTO documents VALUES (?,?,?,?,?,?)').run(id,communityId,title,category,scope,dateNow());
    this.audit(userId,communityId,'document.metadata_created',id);
    return {id};
  }
}
