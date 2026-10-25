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
      CREATE TABLE IF NOT EXISTS unit_owner_events (
        id TEXT PRIMARY KEY,community_id TEXT NOT NULL,unit_id TEXT NOT NULL,
        old_owner_user_id TEXT REFERENCES users(id),new_owner_user_id TEXT REFERENCES users(id),
        actor_user_id TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL,
        FOREIGN KEY(unit_id,community_id) REFERENCES units(id,community_id)
      );
      CREATE INDEX IF NOT EXISTS ix_unit_owner_events ON unit_owner_events(community_id,unit_id,created_at);
      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id),
        unit_id TEXT, created_by TEXT NOT NULL REFERENCES users(id),
        category TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL,
        priority TEXT NOT NULL CHECK(priority IN ('low','normal','high','urgent')),
        status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        UNIQUE(id,community_id),
        FOREIGN KEY(unit_id,community_id) REFERENCES units(id,community_id)
      );
      CREATE TABLE IF NOT EXISTS incident_updates (
        id TEXT PRIMARY KEY, community_id TEXT NOT NULL, incident_id TEXT NOT NULL,
        actor_user_id TEXT NOT NULL REFERENCES users(id),
        kind TEXT NOT NULL CHECK(kind IN ('created','comment','status')),
        note TEXT NOT NULL, status TEXT, created_at TEXT NOT NULL,
        FOREIGN KEY(incident_id,community_id) REFERENCES incidents(id,community_id)
      );
      CREATE INDEX IF NOT EXISTS ix_incidents_community ON incidents(community_id,created_at);
      CREATE INDEX IF NOT EXISTS ix_incident_updates ON incident_updates(incident_id,created_at);
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
  writeAudited(userId, communityId, action, entityId, write) {
    // Each movement and its audit record either persist together or not at all.
    this.db.exec('SAVEPOINT audited_write');
    try {
      write();
      this.audit(userId, communityId, action, entityId);
      this.db.exec('RELEASE SAVEPOINT audited_write');
    } catch (error) {
      this.db.exec('ROLLBACK TO SAVEPOINT audited_write');
      this.db.exec('RELEASE SAVEPOINT audited_write');
      throw error;
    }
  }
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
    const incidents = this.incidentsFor(userId,communityId);
    const ownerChanges = role==='admin' ? rows(this.db.prepare(`SELECT e.id,e.unit_id unitId,u.code unit,
      prior.display_name previousOwner,actual.display_name newOwner,e.created_at createdAt
      FROM unit_owner_events e JOIN units u ON u.id=e.unit_id AND u.community_id=e.community_id
      LEFT JOIN users prior ON prior.id=e.old_owner_user_id LEFT JOIN users actual ON actual.id=e.new_owner_user_id
      WHERE e.community_id=? ORDER BY e.created_at DESC,e.rowid DESC LIMIT 50`),communityId) : [];
    return { role, communityId, units, charges, payments, announcements, documents, providers, expenses, incidents, ownerChanges, audit };
  }
  membersFor(userId,communityId){
    this.requireAdmin(userId,communityId);
    return rows(this.db.prepare(`SELECT u.id,u.display_name displayName,u.email,m.role
      FROM memberships m JOIN users u ON u.id=m.user_id
      WHERE m.community_id=? ORDER BY m.role,u.display_name`),communityId);
  }
  assignUnitOwner(userId,communityId,unitId,ownerUserId){
    this.requireAdmin(userId,communityId);
    if(typeof unitId!=='string'||!VALID.test(unitId))throw new Problem(404,'Unidad no disponible');
    const unit=this.db.prepare('SELECT owner_user_id FROM units WHERE id=? AND community_id=?').get(unitId,communityId);
    if(!unit)throw new Problem(404,'Unidad no disponible');
    const newOwner=ownerUserId==null||ownerUserId===''?null:requireText(ownerUserId,'Propietario',80);
    if(newOwner&&!this.db.prepare(`SELECT 1 FROM memberships WHERE user_id=? AND community_id=? AND role='owner'`).get(newOwner,communityId))
      throw new Problem(400,'Propietario no válido en esta comunidad');
    if(unit.owner_user_id===newOwner)throw new Problem(409,'La unidad ya tiene esa asignación');
    const eventId=randomUUID();
    this.writeAudited(userId,communityId,'unit.owner_changed',unitId,()=>{
      this.db.prepare('UPDATE units SET owner_user_id=? WHERE id=? AND community_id=?').run(newOwner,unitId,communityId);
      this.db.prepare('INSERT INTO unit_owner_events VALUES (?,?,?,?,?,?,?)').run(eventId,communityId,unitId,unit.owner_user_id,newOwner,userId,dateNow());
    });
    return {id:eventId};
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
    try{this.writeAudited(userId,communityId,'unit.created',id,()=>this.db.prepare('INSERT INTO units VALUES (?,?,?,?,?,?,?)').run(id,communityId,code,kind,resident,ownerId,dateNow()));}
    catch(e){if(String(e).includes('UNIQUE')) throw new Problem(409,'La unidad ya existe');throw e;}

    return {id};
  }
  addCharge(userId,communityId,data){
    this.requireAdmin(userId,communityId);
    const unitId=requireText(data.unitId,'Unidad',60),period=requirePeriod(data.period),concept=requireText(data.concept,'Concepto',100),amountMinor=requireMinor(data.amountMinor);
    if(!this.unitIsIn(communityId,unitId)) throw new Problem(404,'Unidad no disponible');
    const id=randomUUID();
    try{this.writeAudited(userId,communityId,'charge.created',id,()=>this.db.prepare('INSERT INTO charges VALUES (?,?,?,?,?,?,?)').run(id,communityId,unitId,period,concept,amountMinor,dateNow()));}
    catch(e){if(String(e).includes('UNIQUE')) throw new Problem(409,'Cuota duplicada para período, unidad y concepto');throw e;}

    return {id};
  }
  addPayment(userId,communityId,data){
    this.requireAdmin(userId,communityId);
    const unitId=requireText(data.unitId,'Unidad',60), reference=requireText(data.reference,'Referencia',90),concept=requireText(data.concept,'Concepto',100),amountMinor=requireMinor(data.amountMinor);
    if(!this.unitIsIn(communityId,unitId)) throw new Problem(404,'Unidad no disponible');
    const id=randomUUID();
    try{this.writeAudited(userId,communityId,'payment.created',id,()=>this.db.prepare('INSERT INTO payments VALUES (?,?,?,?,?,?,?)').run(id,communityId,unitId,reference,concept,amountMinor,dateNow()));}
    catch(e){if(String(e).includes('UNIQUE')) throw new Problem(409,'Referencia de pago duplicada en la comunidad');throw e;}

    return {id};
  }
  addAnnouncement(userId,communityId,data){
    this.requireAdmin(userId,communityId);
    const title=requireText(data.title,'Título',90),body=requireText(data.body,'Mensaje',2000),id=randomUUID();
    this.writeAudited(userId,communityId,'announcement.created',id,()=>this.db.prepare('INSERT INTO announcements VALUES (?,?,?,?,?,?)').run(id,communityId,title,body,userId,dateNow()));

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
    try{this.writeAudited(userId,communityId,`${type}.reversed`,entityId,()=>this.db.prepare('INSERT INTO reversals VALUES (?,?,?,?,?,?,?)').run(id,communityId,type,entityId,userId,reason,dateNow()));}
    catch(e){if(String(e).includes('UNIQUE'))throw new Problem(409,'Movimiento ya reversado');throw e;}

    return {id};
  }
  addProvider(userId,communityId,data){
    this.requireAdmin(userId,communityId);
    const name=requireText(data.name,'Proveedor',130),category=requireText(data.category,'Rubro',70),id=randomUUID();
    try{this.writeAudited(userId,communityId,'provider.created',id,()=>this.db.prepare('INSERT INTO providers VALUES (?,?,?,?,?)').run(id,communityId,name,category,dateNow()));}
    catch(e){if(String(e).includes('UNIQUE'))throw new Problem(409,'Proveedor ya registrado');throw e;}

    return {id};
  }
  addExpense(userId,communityId,data){
    this.requireAdmin(userId,communityId);
    const providerId=requireText(data.providerId,'Proveedor',60),period=requirePeriod(data.period),
      concept=requireText(data.concept,'Concepto',100),amountMinor=requireMinor(data.amountMinor);
    if(!this.db.prepare('SELECT 1 FROM providers WHERE community_id=? AND id=?').get(communityId,providerId))throw new Problem(404,'Proveedor no disponible');
    const id=randomUUID();
    this.writeAudited(userId,communityId,'expense.created',id,()=>this.db.prepare('INSERT INTO expenses VALUES (?,?,?,?,?,?,?)').run(id,communityId,providerId,period,concept,amountMinor,dateNow()));

    return {id};
  }
  addDocument(userId,communityId,data){
    this.requireAdmin(userId,communityId);
    const title=requireText(data.title,'Documento',150),category=requireText(data.category,'Categoría',60),scope=data.scope;
    if(!['community','committee','admin'].includes(scope))throw new Problem(400,'Visibilidad inválida');
    const id=randomUUID();
    this.writeAudited(userId,communityId,'document.metadata_created',id,()=>this.db.prepare('INSERT INTO documents VALUES (?,?,?,?,?,?)').run(id,communityId,title,category,scope,dateNow()));

    return {id};
  }

  incidentAccessible(userId,communityId,incidentId) {
    const role=this.member(userId,communityId);
    const row=this.db.prepare(`SELECT i.id,i.created_by,i.unit_id,u.owner_user_id
      FROM incidents i LEFT JOIN units u ON u.id=i.unit_id AND u.community_id=i.community_id
      WHERE i.id=? AND i.community_id=?`).get(incidentId,communityId);
    if(!row || (role==='owner' && row.created_by!==userId && row.owner_user_id!==userId))
      throw new Problem(404,'Incidencia no disponible');
    return {row,role};
  }
  incidentsFor(userId,communityId) {
    const role=this.member(userId,communityId);
    const where=role==='owner' ? ' AND (i.created_by=? OR u.owner_user_id=?)' : '';
    const params=role==='owner' ? [communityId,userId,userId] : [communityId];
    const incidents=rows(this.db.prepare(`SELECT i.id,i.unit_id unitId,u.code unit,
      i.category,i.title,i.detail,i.priority,i.status,i.created_at createdAt,i.updated_at updatedAt,
      i.created_by createdBy
      FROM incidents i LEFT JOIN units u ON u.id=i.unit_id AND u.community_id=i.community_id
      WHERE i.community_id=?${where} ORDER BY i.updated_at DESC LIMIT 100`),...params);
    for(const item of incidents){
      item.updates=rows(this.db.prepare(`SELECT x.id,x.kind,x.note,x.status,x.created_at createdAt,
        a.display_name author FROM incident_updates x JOIN users a ON a.id=x.actor_user_id
        WHERE x.incident_id=? AND x.community_id=? ORDER BY x.created_at ASC,x.rowid ASC LIMIT 100`),item.id,communityId);
    }
    return incidents;
  }
  addIncident(userId,communityId,data){
    const role=this.member(userId,communityId);
    const title=requireText(data.title,'Título',120),detail=requireText(data.detail,'Descripción',2000);
    const category=requireText(data.category,'Categoría',50);
    if(!['maintenance','security','cleaning','noise','other'].includes(category))throw new Problem(400,'Categoría inválida');
    const priority=data.priority??'normal';
    if(!['low','normal','high','urgent'].includes(priority))throw new Problem(400,'Prioridad inválida');
    const unitId=data.unitId ? requireText(data.unitId,'Unidad',60) : null;
    if(unitId){
      const row=this.db.prepare('SELECT owner_user_id FROM units WHERE id=? AND community_id=?').get(unitId,communityId);
      if(!row)throw new Problem(404,'Unidad no disponible');
      if(role==='owner' && row.owner_user_id!==userId)throw new Problem(404,'Unidad no disponible');
      if(role==='committee')throw new Problem(403,'El comité solo puede reportar áreas comunes');
    }
    const id=randomUUID(), now=dateNow();
    this.writeAudited(userId,communityId,'incident.created',id,()=>{
      this.db.prepare('INSERT INTO incidents VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        .run(id,communityId,unitId,userId,category,title,detail,priority,'open',now,now);
      this.db.prepare('INSERT INTO incident_updates VALUES (?,?,?,?,?,?,?,?)')
        .run(randomUUID(),communityId,id,userId,'created','Incidencia registrada','open',now);
    });
    return {id};
  }
  commentIncident(userId,communityId,incidentId,note){
    this.incidentAccessible(userId,communityId,incidentId);
    note=requireText(note,'Comentario',1200);
    const id=randomUUID(),now=dateNow();
    this.writeAudited(userId,communityId,'incident.commented',incidentId,()=>{
      this.db.prepare('INSERT INTO incident_updates VALUES (?,?,?,?,?,?,?,?)')
        .run(id,communityId,incidentId,userId,'comment',note,null,now);
      this.db.prepare('UPDATE incidents SET updated_at=? WHERE id=? AND community_id=?')
        .run(now,incidentId,communityId);
    });
    return {id};
  }
  changeIncidentStatus(userId,communityId,incidentId,status,note){
    this.requireAdmin(userId,communityId);
    const {row}=this.incidentAccessible(userId,communityId,incidentId);
    if(!['open','in_progress','resolved','closed'].includes(status))throw new Problem(400,'Estado inválido');
    note=requireText(note,'Explicación',500);
    if(note.length<8)throw new Problem(400,'Se requiere una explicación de al menos 8 caracteres');
    const previous=this.db.prepare('SELECT status FROM incidents WHERE id=? AND community_id=?')
      .get(row.id,communityId).status;
    if(previous===status)throw new Problem(409,'La incidencia ya tiene este estado');
    const id=randomUUID(),now=dateNow();
    this.writeAudited(userId,communityId,'incident.status_changed',incidentId,()=>{
      this.db.prepare('UPDATE incidents SET status=?,updated_at=? WHERE id=? AND community_id=?')
        .run(status,now,incidentId,communityId);
      this.db.prepare('INSERT INTO incident_updates VALUES (?,?,?,?,?,?,?,?)')
        .run(id,communityId,incidentId,userId,'status',note,status,now);
    });
    return {id};
  }

}
