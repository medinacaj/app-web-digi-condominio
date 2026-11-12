import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { strictUtcDay, addUtcDays, utcToday } from './due-calendar.js';

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
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    const dbVersion=this.db.prepare('PRAGMA user_version').get().user_version;
    if(dbVersion>10){this.db.close();throw new Problem(409,'La base fue creada por una versión más reciente de Digi-Condominio');}
    const hasCommunities=this.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='communities'").get();
    if(hasCommunities && !this.db.prepare('PRAGMA table_info(communities)').all().some(c=>c.name==='account_id')) {
      this.db.close(); throw new Problem(409,'Migración de cuentas requerida: use migrate:accounts con mapeo explícito y respaldo');
    }
    this.db.exec('PRAGMA journal_mode=WAL; BEGIN IMMEDIATE');
    try{this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,name TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('independent','management_company')),created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS account_memberships (
        account_id TEXT NOT NULL REFERENCES accounts(id),user_id TEXT NOT NULL REFERENCES users(id),
        role TEXT NOT NULL CHECK(role IN ('account_admin','member')),PRIMARY KEY(account_id,user_id)
      );
      CREATE TABLE IF NOT EXISTS account_audit_events (
        id TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES accounts(id),user_id TEXT NOT NULL REFERENCES users(id),
        action TEXT NOT NULL,entity_id TEXT NOT NULL,created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS communities (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL,
        account_id TEXT NOT NULL REFERENCES accounts(id)
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
      CREATE TABLE IF NOT EXISTS charge_deadlines (
        charge_id TEXT PRIMARY KEY REFERENCES charges(id),
        community_id TEXT NOT NULL REFERENCES communities(id),
        due_on TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_charge_deadlines_due ON charge_deadlines(community_id,due_on,charge_id);
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
      CREATE TABLE IF NOT EXISTS invitations (
        id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, account_id TEXT NOT NULL REFERENCES accounts(id),
        issuer_id TEXT NOT NULL REFERENCES users(id), email TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('account_admin','member')), community_id TEXT REFERENCES communities(id),
        community_role TEXT CHECK(community_role IN ('admin','committee','owner')), expires_at TEXT NOT NULL, consumed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at TEXT NOT NULL,consumed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS password_reset_requests (email_hash TEXT PRIMARY KEY,requested_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS identity_audit_events (
        id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS account_subscriptions (
        account_id TEXT PRIMARY KEY REFERENCES accounts(id),plan TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('trial','active','suspended')),expires_at TEXT,updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS subscription_events (
        id TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES accounts(id),action TEXT NOT NULL,detail TEXT NOT NULL,created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS unit_notifications (
        id TEXT PRIMARY KEY,
        community_id TEXT NOT NULL,
        unit_id TEXT NOT NULL,
        recipient_user_id TEXT NOT NULL REFERENCES users(id),
        kind TEXT NOT NULL CHECK(kind IN ('charge_created','payment_recorded','charge_reversed','payment_reversed','unit_message')),
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        source_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        read_at TEXT,
        FOREIGN KEY(unit_id,community_id) REFERENCES units(id,community_id),
        UNIQUE(community_id,recipient_user_id,kind,source_id)
      );
      CREATE INDEX IF NOT EXISTS ix_notifications_recipient ON unit_notifications(community_id,recipient_user_id,created_at);
      CREATE TABLE IF NOT EXISTS communication_consent (
        community_id TEXT NOT NULL REFERENCES communities(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        purpose TEXT NOT NULL CHECK(purpose IN ('billing_updates','community_news')),
        channel TEXT NOT NULL CHECK(channel='email'),
        enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
        updated_at TEXT NOT NULL,
        PRIMARY KEY(community_id,user_id,purpose,channel)
      );
      CREATE TABLE IF NOT EXISTS communication_consent_events (
        id TEXT PRIMARY KEY,
        community_id TEXT NOT NULL REFERENCES communities(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        purpose TEXT NOT NULL,
        channel TEXT NOT NULL,
        enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
        occurred_at TEXT NOT NULL,
        authentication TEXT NOT NULL CHECK(authentication='authenticated_self_service')
      );
      CREATE INDEX IF NOT EXISTS ix_consent_events_user ON communication_consent_events(community_id,user_id,occurred_at);
      CREATE TABLE IF NOT EXISTS payment_reports (
        id TEXT PRIMARY KEY,
        community_id TEXT NOT NULL,
        unit_id TEXT NOT NULL,
        submitter_user_id TEXT NOT NULL REFERENCES users(id),
        reference TEXT NOT NULL,
        concept TEXT NOT NULL,
        amount_minor INTEGER NOT NULL CHECK(amount_minor>0),
        status TEXT NOT NULL CHECK(status IN ('informado','en_revision','confirmado','rechazado','reversado')),
        ledger_payment_id TEXT REFERENCES payments(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(unit_id,community_id) REFERENCES units(id,community_id),
        UNIQUE(community_id,reference)
      );
      CREATE INDEX IF NOT EXISTS ix_payment_reports_scope ON payment_reports(community_id,unit_id,created_at);
      CREATE TABLE IF NOT EXISTS payment_report_events (
        id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL REFERENCES payment_reports(id),
        community_id TEXT NOT NULL REFERENCES communities(id),
        actor_user_id TEXT NOT NULL REFERENCES users(id),
        action TEXT NOT NULL,
        note TEXT NOT NULL,
        at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_payment_report_events ON payment_report_events(community_id,report_id,at);
      CREATE TABLE IF NOT EXISTS unit_people (
        id TEXT PRIMARY KEY,
        community_id TEXT NOT NULL,
        unit_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        relationship TEXT NOT NULL CHECK(relationship IN ('resident','tenant','authorized','emergency')),
        email TEXT,
        phone TEXT,
        payment_contact INTEGER NOT NULL DEFAULT 0 CHECK(payment_contact IN (0,1)),
        contact_preference TEXT NOT NULL DEFAULT 'none' CHECK(contact_preference IN ('none','email','sms','whatsapp')),
        created_by TEXT NOT NULL REFERENCES users(id),
        updated_by TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        inactive_at TEXT,
        FOREIGN KEY(unit_id,community_id) REFERENCES units(id,community_id)
      );
      CREATE INDEX IF NOT EXISTS ix_unit_people_scope ON unit_people(community_id,unit_id,inactive_at);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_unit_people_active_email ON unit_people(community_id,unit_id,lower(email)) WHERE email IS NOT NULL AND inactive_at IS NULL;
      CREATE INDEX IF NOT EXISTS ix_units_community ON units(community_id);
      CREATE INDEX IF NOT EXISTS ix_charges_community ON charges(community_id,unit_id);
      CREATE INDEX IF NOT EXISTS ix_payments_community ON payments(community_id,unit_id);
      CREATE INDEX IF NOT EXISTS ix_announcements_community ON announcements(community_id);
      CREATE INDEX IF NOT EXISTS ix_expenses_community ON expenses(community_id);
      CREATE INDEX IF NOT EXISTS ix_reversals_community ON reversals(community_id,entity_type,entity_id);
      CREATE INDEX IF NOT EXISTS ix_providers_community ON providers(community_id);
    `);
      this.db.exec('PRAGMA user_version=10');
      this.db.exec('COMMIT');
    }catch(error){this.db.exec('ROLLBACK');this.db.close();throw error;}
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
  createCommunity(name, address = '', accountId) {
    name = requireText(name, 'Comunidad', 130);
    if (typeof address !== 'string' || address.length > 200) throw new Problem(400, 'Dirección inválida');
    const id = randomUUID();
    if(!this.db.prepare('SELECT 1 FROM accounts WHERE id=?').get(accountId??null)) throw new Problem(400,'Cuenta obligatoria o no disponible');
    this.db.prepare('INSERT INTO communities VALUES (?,?,?,?,?)').run(id, name, address.trim(), dateNow(),accountId);
    return id;
  }
  setMembership(userId, communityId, role) {
    if (!roles.has(role)) throw new Problem(400, 'Rol inválido');
    const community=this.db.prepare('SELECT account_id FROM communities WHERE id=?').get(communityId);
    if(!community) throw new Problem(404,'Comunidad no disponible');
    this.atomic(()=>{
      this.db.prepare("INSERT OR IGNORE INTO account_memberships VALUES (?,?,'member')").run(community.account_id,userId);
      this.db.prepare('INSERT INTO memberships VALUES (?,?,?)').run(userId, communityId, role);
      this.invalidateInvitations(community.account_id,userId);
    });
  }
  changePassword(userId,password) {
    const hash=hashPassword(password);
    return this.atomic(()=>{
      if(!this.db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash,userId).changes)throw new Problem(404,'Usuario no disponible');
      this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
    });
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
  accountsFor(userId) {
    return rows(this.db.prepare(`SELECT a.id,a.name,a.kind,m.role FROM accounts a JOIN account_memberships m ON m.account_id=a.id WHERE m.user_id=? ORDER BY a.name`),userId);
  }
  accountMember(userId,accountId) {
    const row=this.db.prepare('SELECT role FROM account_memberships WHERE account_id=? AND user_id=?').get(accountId,userId);
    if(!row) throw new Problem(404,'Cuenta no disponible');
    return row.role;
  }
  requireAccountAdmin(userId,accountId) {
    if(this.accountMember(userId,accountId)!=='account_admin') throw new Problem(403,'Acceso no autorizado');
  }
  atomic(write) {
    this.db.exec('SAVEPOINT account_write');
    try { const result=write(); this.db.exec('RELEASE account_write'); return result; }
    catch(error){this.db.exec('ROLLBACK TO account_write; RELEASE account_write');throw error;}
  }
  accountAudit(actorId,accountId,action,entityId) {
    this.db.prepare('INSERT INTO account_audit_events VALUES (?,?,?,?,?,?)').run(randomUUID(),accountId,actorId,action,entityId,dateNow());
  }
  createAccount(adminUserId,{name,kind}) {
    name=requireText(name,'Cuenta',130);
    if(!['independent','management_company'].includes(kind))throw new Problem(400,'Tipo de cuenta inválido');
    if(!this.db.prepare('SELECT 1 FROM users WHERE id=?').get(adminUserId))throw new Problem(400,'Administrador no disponible');
    const id=randomUUID();
    this.atomic(()=>{
      this.db.prepare('INSERT INTO accounts VALUES (?,?,?,?)').run(id,name,kind,dateNow());
      this.db.prepare("INSERT INTO account_memberships VALUES (?,?,'account_admin')").run(id,adminUserId);
      this.accountAudit(adminUserId,id,'account.created',id);
    });
    return {id};
  }
  addCommunity(actorId,accountId,{name,address=''}) {
    this.requireAccountAdmin(actorId,accountId);
    return this.atomic(()=>{const id=this.createCommunity(name,address,accountId);this.accountAudit(actorId,accountId,'community.created',id);return {id};});
  }
  accountOverview(actorId,accountId) {
    this.requireAccountAdmin(actorId,accountId);
    return {
      account:{...this.db.prepare('SELECT id,name,kind FROM accounts WHERE id=?').get(accountId),role:'account_admin'},
      communities:rows(this.db.prepare('SELECT id,name,address FROM communities WHERE account_id=? ORDER BY name'),accountId),
      members:rows(this.db.prepare('SELECT u.id,u.email,u.display_name displayName,m.role FROM account_memberships m JOIN users u ON u.id=m.user_id WHERE m.account_id=? ORDER BY u.display_name'),accountId),
      assignments:rows(this.db.prepare('SELECT m.user_id userId,m.community_id communityId,m.role FROM memberships m JOIN communities c ON c.id=m.community_id JOIN account_memberships a ON a.account_id=c.account_id AND a.user_id=m.user_id WHERE c.account_id=?'),accountId),
      audit:rows(this.db.prepare('SELECT id,user_id userId,action,entity_id entityId,created_at createdAt FROM account_audit_events WHERE account_id=? ORDER BY created_at DESC,rowid DESC LIMIT 100'),accountId)
    };
  }
  invalidateInvitations(accountId,userId) {
    this.db.prepare('DELETE FROM invitations WHERE account_id=? AND email=(SELECT email FROM users WHERE id=?) AND consumed_at IS NULL').run(accountId,userId);
  }
  changeAccountMember(actorId,accountId,targetUserId,roleOrNull) {
    this.requireAccountAdmin(actorId,accountId);
    if(roleOrNull!==null&&!['account_admin','member'].includes(roleOrNull))throw new Problem(400,'Rol de cuenta inválido');
    if(!this.db.prepare('SELECT 1 FROM users WHERE id=?').get(targetUserId))throw new Problem(404,'Usuario no disponible');
    this.atomic(()=>{
      const old=this.db.prepare('SELECT role FROM account_memberships WHERE account_id=? AND user_id=?').get(accountId,targetUserId);
      if(old?.role==='account_admin' && roleOrNull!=='account_admin' && this.db.prepare("SELECT COUNT(*) n FROM account_memberships WHERE account_id=? AND role='account_admin'").get(accountId).n===1)throw new Problem(409,'No se puede revocar el último administrador de cuenta');
      if(roleOrNull===null)this.db.prepare('DELETE FROM account_memberships WHERE account_id=? AND user_id=?').run(accountId,targetUserId);
      else this.db.prepare('INSERT INTO account_memberships VALUES (?,?,?) ON CONFLICT(account_id,user_id) DO UPDATE SET role=excluded.role').run(accountId,targetUserId,roleOrNull);
      this.invalidateInvitations(accountId,targetUserId);
      this.accountAudit(actorId,accountId,roleOrNull===null?'account.member_revoked':'account.member_changed',targetUserId);
    });
    return {ok:true};
  }
  changeCommunityMember(actorId,accountId,communityId,targetUserId,roleOrNull) {
    this.requireAccountAdmin(actorId,accountId);
    if(!this.db.prepare('SELECT 1 FROM communities WHERE id=? AND account_id=?').get(communityId,accountId))throw new Problem(404,'Comunidad no disponible');
    if(roleOrNull!==null&&!roles.has(roleOrNull))throw new Problem(400,'Rol inválido');
    this.accountMember(targetUserId,accountId);
    this.atomic(()=>{
      if(roleOrNull===null)this.db.prepare('DELETE FROM memberships WHERE user_id=? AND community_id=?').run(targetUserId,communityId);
      else this.db.prepare('INSERT INTO memberships VALUES (?,?,?) ON CONFLICT(user_id,community_id) DO UPDATE SET role=excluded.role').run(targetUserId,communityId,roleOrNull);
      this.invalidateInvitations(accountId,targetUserId);
      this.accountAudit(actorId,accountId,roleOrNull===null?'community.member_revoked':'community.member_changed',`${communityId}:${targetUserId}`);
    });
    return {ok:true};
  }
  communitiesFor(userId,accountId) {
    if(accountId!==undefined)this.accountMember(userId,accountId);
    return rows(this.db.prepare(`SELECT c.id,c.name,c.address,c.account_id accountId,m.role,
       (SELECT COUNT(*) FROM units u WHERE u.community_id=c.id AND (m.role<>'owner' OR u.owner_user_id=?)) units
       FROM memberships m JOIN communities c ON m.community_id=c.id
       JOIN account_memberships a ON a.account_id=c.account_id AND a.user_id=m.user_id
       WHERE m.user_id=?${accountId===undefined?'':' AND c.account_id=?'} ORDER BY c.name`),userId,userId,...(accountId===undefined?[]:[accountId]));
  }
  member(userId, communityId) {
    if (!/^[a-f0-9-]{36}$/.test(communityId ?? '')) throw new Problem(404, 'Comunidad no disponible');
    const m = this.db.prepare(`SELECT m.role FROM memberships m JOIN communities c ON c.id=m.community_id
      JOIN account_memberships a ON a.account_id=c.account_id AND a.user_id=m.user_id WHERE m.user_id=? AND m.community_id=?`).get(userId, communityId);
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
       (SELECT d.due_on FROM charge_deadlines d WHERE d.charge_id=c.id AND d.community_id=c.community_id) dueOn,
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
    return { role, communityId, units, charges, payments, announcements, notifications:this.notificationsFor(userId,communityId), documents, providers, expenses, incidents, ownerChanges, audit };
  }
  membersFor(userId,communityId){
    this.requireAdmin(userId,communityId);
    return rows(this.db.prepare(`SELECT u.id,u.display_name displayName,u.email,m.role
      FROM memberships m JOIN users u ON u.id=m.user_id
      JOIN communities c ON c.id=m.community_id JOIN account_memberships a ON a.account_id=c.account_id AND a.user_id=m.user_id
      WHERE m.community_id=? ORDER BY m.role,u.display_name`),communityId);
  }
  assignUnitOwner(userId,communityId,unitId,ownerUserId){
    this.requireAdmin(userId,communityId);
    if(typeof unitId!=='string'||!VALID.test(unitId))throw new Problem(404,'Unidad no disponible');
    const unit=this.db.prepare('SELECT owner_user_id FROM units WHERE id=? AND community_id=?').get(unitId,communityId);
    if(!unit)throw new Problem(404,'Unidad no disponible');
    const newOwner=ownerUserId==null||ownerUserId===''?null:requireText(ownerUserId,'Propietario',80);
    if(newOwner&&!this.db.prepare(`SELECT 1 FROM memberships m JOIN communities c ON c.id=m.community_id JOIN account_memberships a ON a.account_id=c.account_id AND a.user_id=m.user_id WHERE m.user_id=? AND m.community_id=? AND m.role='owner'`).get(newOwner,communityId))
      throw new Problem(400,'Propietario no válido en esta comunidad');
    if(unit.owner_user_id===newOwner)throw new Problem(409,'La unidad ya tiene esa asignación');
    const eventId=randomUUID();
    this.writeAudited(userId,communityId,'unit.owner_changed',unitId,()=>{
      this.db.prepare('UPDATE units SET owner_user_id=? WHERE id=? AND community_id=?').run(newOwner,unitId,communityId);
      this.db.prepare('INSERT INTO unit_owner_events VALUES (?,?,?,?,?,?,?)').run(eventId,communityId,unitId,unit.owner_user_id,newOwner,userId,dateNow());
    });
    return {id:eventId};
  }
  // Unit occupants are private directory entries, NOT authenticated members.
  // The currently linked legal/financial owner remains in units.owner_user_id.
  validateUnitPerson(data,current=null){
    if(!data||typeof data!=='object'||Array.isArray(data))throw new Problem(400,'Datos de persona inválidos');
    const allowed=new Set(['fullName','relationship','email','phone','paymentResponsible','contactPreference']);
    if(!Object.keys(data).length||Object.keys(data).some(key=>!allowed.has(key)))throw new Problem(400,'Campos de persona no permitidos');
    const value={...current,...data};
    const fullName=requireText(value.fullName,'Nombre de contacto',100);
    if(!['resident','tenant','authorized','emergency'].includes(value.relationship))throw new Problem(400,'Relación con la unidad inválida');
    const optional=(raw,label,max)=>{
      if(raw===undefined||raw===null||raw==='')return null;
      if(typeof raw!=='string'||raw.trim().length>max)throw new Problem(400,label+' inválido');
      return raw.trim()||null;
    };
    const email=optional(value.email,'Correo',254)?.toLowerCase()??null;
    if(email&&!emailFormat.test(email))throw new Problem(400,'Correo inválido');
    const phone=optional(value.phone,'Teléfono',20);
    if(phone&&!/^\+[1-9][0-9]{7,14}$/.test(phone))throw new Problem(400,'Teléfono: use formato internacional + y 8 a 15 dígitos');
    const paymentResponsible=value.paymentResponsible??false;
    if(typeof paymentResponsible!=='boolean')throw new Problem(400,'Responsabilidad de pago inválida');
    const contactPreference=value.contactPreference??'none';
    if(!['none','email','sms','whatsapp'].includes(contactPreference))throw new Problem(400,'Preferencia de contacto inválida');
    if(contactPreference==='email'&&!email)throw new Problem(400,'Correo requerido para preferencia email');
    if(['sms','whatsapp'].includes(contactPreference)&&!phone)throw new Problem(400,'Teléfono requerido para canal preferido');
    return {fullName,relationship:value.relationship,email,phone,paymentResponsible,contactPreference};
  }
  unitDirectory(userId,communityId,unitId){
    this.requireAdmin(userId,communityId);
    if(!this.unitIsIn(communityId,unitId))throw new Problem(404,'Unidad no disponible');
    const owner=this.db.prepare(`SELECT u.id,u.display_name displayName,u.email FROM units x
      JOIN users u ON u.id=x.owner_user_id WHERE x.community_id=? AND x.id=?`).get(communityId,unitId)??null;
    const contacts=rows(this.db.prepare(`SELECT id,full_name fullName,relationship,email,phone,
      payment_contact paymentResponsible,contact_preference contactPreference,
      created_at createdAt,updated_at updatedAt,inactive_at inactiveAt
      FROM unit_people WHERE community_id=? AND unit_id=?
      ORDER BY inactive_at IS NOT NULL,created_at DESC,rowid DESC`),communityId,unitId)
      .map(c=>({...c,paymentResponsible:!!c.paymentResponsible}));
    return {unitId,owner,contacts};
  }
  addUnitPerson(userId,communityId,unitId,data){
    this.requireAdmin(userId,communityId);
    if(!this.unitIsIn(communityId,unitId))throw new Problem(404,'Unidad no disponible');
    const v=this.validateUnitPerson(data),id=randomUUID(),now=dateNow();
    try{this.writeAudited(userId,communityId,'unit.person_added',id,()=>{
      this.db.prepare(`INSERT INTO unit_people
      (id,community_id,unit_id,full_name,relationship,email,phone,payment_contact,contact_preference,created_by,updated_by,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,communityId,unitId,v.fullName,v.relationship,v.email,v.phone,
      Number(v.paymentResponsible),v.contactPreference,userId,userId,now,now);
    });}catch(e){if(String(e).includes('UNIQUE'))throw new Problem(409,'Ya existe un contacto activo con ese correo en la unidad');throw e;}
    return {id,active:true};
  }
  changeUnitPerson(userId,communityId,unitId,personId,data){
    this.requireAdmin(userId,communityId);
    if(!this.unitIsIn(communityId,unitId)||typeof personId!=='string'||!VALID.test(personId))throw new Problem(404,'Contacto no disponible');
    const old=this.db.prepare(`SELECT id,full_name fullName,relationship,email,phone,
      payment_contact paymentResponsible,contact_preference contactPreference,inactive_at inactiveAt
      FROM unit_people WHERE id=? AND community_id=? AND unit_id=?`).get(personId,communityId,unitId);
    if(!old)throw new Problem(404,'Contacto no disponible');
    if(old.inactiveAt)throw new Problem(409,'Contacto inactivo; cree un nuevo registro si vuelve a residir');
    const v=this.validateUnitPerson(data,{...old,paymentResponsible:!!old.paymentResponsible});
    try{this.writeAudited(userId,communityId,'unit.person_updated',personId,()=>{
      this.db.prepare(`UPDATE unit_people SET full_name=?,relationship=?,email=?,phone=?,
        payment_contact=?,contact_preference=?,updated_by=?,updated_at=?
        WHERE id=? AND community_id=? AND unit_id=? AND inactive_at IS NULL`)
        .run(v.fullName,v.relationship,v.email,v.phone,Number(v.paymentResponsible),v.contactPreference,
        userId,dateNow(),personId,communityId,unitId);
    });}catch(e){if(String(e).includes('UNIQUE'))throw new Problem(409,'Ya existe un contacto activo con ese correo en la unidad');throw e;}
    return {id:personId,active:true};
  }
  deactivateUnitPerson(userId,communityId,unitId,personId){
    this.requireAdmin(userId,communityId);
    if(!this.unitIsIn(communityId,unitId)||typeof personId!=='string'||!VALID.test(personId))throw new Problem(404,'Contacto no disponible');
    const current=this.db.prepare('SELECT inactive_at FROM unit_people WHERE id=? AND community_id=? AND unit_id=?').get(personId,communityId,unitId);
    if(!current)throw new Problem(404,'Contacto no disponible');
    if(current.inactive_at)throw new Problem(409,'Contacto ya inactivo');
    this.writeAudited(userId,communityId,'unit.person_deactivated',personId,()=>{
      this.db.prepare('UPDATE unit_people SET inactive_at=?,updated_by=?,updated_at=? WHERE id=? AND community_id=? AND unit_id=?')
        .run(dateNow(),userId,dateNow(),personId,communityId,unitId);
    });
    return {id:personId,active:false};
  }
  // In-app messages addressed only to the currently assigned owner.
  // No external delivery, bank confirmation, or use of the occupant free-text field.
  queueUnitNotification(communityId,unitId,kind,title,body,sourceId){
    const unit=this.db.prepare('SELECT owner_user_id FROM units WHERE id=? AND community_id=?').get(unitId,communityId);
    if(!unit)throw new Problem(404,'Unidad no disponible');
    if(!unit.owner_user_id)return false; // No account to notify. Never guess recipients.
    const result=this.db.prepare(`INSERT OR IGNORE INTO unit_notifications
      (id,community_id,unit_id,recipient_user_id,kind,title,body,source_id,created_at)
      VALUES(?,?,?,?,?,?,?,?,?)`).run(randomUUID(),communityId,unitId,unit.owner_user_id,kind,title,body,sourceId,dateNow());
    return result.changes===1;
  }
  // Explicit one-click in-app reminder batch. Not a cron job, external message,
  // bank confirmation, or allocation of a payment to a specific invoice.
  dueReminderCandidates(userId,communityId,asOf=utcToday()){
    this.requireAdmin(userId,communityId);
    if(!strictUtcDay(asOf))throw new Problem(400,'Fecha UTC de consulta inválida');
    const until=addUtcDays(asOf,5);
    const sql=`SELECT u.id unitId,u.code unit,u.owner_user_id ownerUserId,
      (SELECT MIN(d.due_on) FROM charge_deadlines d
       JOIN charges c ON c.id=d.charge_id AND c.community_id=d.community_id
       WHERE c.unit_id=u.id AND c.community_id=u.community_id AND d.due_on<=?
       AND NOT EXISTS(SELECT 1 FROM reversals r WHERE r.community_id=c.community_id AND r.entity_type='charge' AND r.entity_id=c.id)
      ) dueOn,
      COALESCE((SELECT SUM(c.amount_minor) FROM charges c
        WHERE c.unit_id=u.id AND c.community_id=u.community_id
        AND NOT EXISTS(SELECT 1 FROM reversals r WHERE r.community_id=c.community_id AND r.entity_type='charge' AND r.entity_id=c.id)),0)
      - COALESCE((SELECT SUM(p.amount_minor) FROM payments p
        WHERE p.unit_id=u.id AND p.community_id=u.community_id
        AND NOT EXISTS(SELECT 1 FROM reversals r WHERE r.community_id=p.community_id AND r.entity_type='payment' AND r.entity_id=p.id)),0) balanceMinor
      FROM units u
      JOIN communities cmm ON cmm.id=u.community_id
      JOIN memberships m ON m.community_id=u.community_id AND m.user_id=u.owner_user_id AND m.role='owner'
      JOIN account_memberships am ON am.account_id=cmm.account_id AND am.user_id=u.owner_user_id
      WHERE u.community_id=? ORDER BY u.code LIMIT 1001`;
    const all=rows(this.db.prepare(sql),until,communityId);
    if(all.length>1000)throw new Problem(409,'Demasiadas unidades: requiere procesamiento por lotes');
    const exists=this.db.prepare(`SELECT 1 FROM unit_notifications WHERE community_id=? AND recipient_user_id=?
      AND kind='unit_message' AND source_id=?`);
    const eligible=all.filter(x=>x.dueOn&&x.balanceMinor>0).map(x=>{
      const stage=x.dueOn<asOf?'overdue':'upcoming';
      // One reminder per owner, deadline and phase, once monthly when overdue.
      const sourceId='reminder:'+stage+':'+x.unitId+':'+x.dueOn+(stage==='overdue'?':'+asOf.slice(0,7):'');
      const alreadyQueued=Boolean(exists.get(communityId,x.ownerUserId,sourceId));
      return {unitId:x.unitId,unit:x.unit,dueOn:x.dueOn,stage,balanceMinor:x.balanceMinor,alreadyQueued,sourceId};
    });
    return {asOf,windowDays:5,eligible};
  }
  previewDueReminders(userId,communityId,asOf=utcToday()){
    const result=this.dueReminderCandidates(userId,communityId,asOf);
    return {asOf:result.asOf,windowDays:result.windowDays,
      eligible:result.eligible.map(({sourceId,...item})=>item),
      pending:result.eligible.filter(x=>!x.alreadyQueued).length};
  }
  prepareDueReminders(userId,communityId,asOf=utcToday()){
    const result=this.dueReminderCandidates(userId,communityId,asOf);
    const pending=result.eligible.filter(x=>!x.alreadyQueued);
    if(!pending.length)return {asOf:result.asOf,created:0,externalMessagesSent:0};
    let created=0;
    this.writeAudited(userId,communityId,'reminder.inapp_batch',randomUUID(),()=>{
      for(const x of pending){
        const body=x.stage==='overdue'
          ? 'Tu unidad presenta un saldo pendiente en los registros internos y una fecha de vencimiento ya transcurrió. Consulta tu estado de cuenta; los pagos pueden estar pendientes de revisión manual.'
          : 'Tu unidad presenta un saldo pendiente en los registros internos y una fecha de vencimiento se aproxima. Consulta tu estado de cuenta; no es una confirmación bancaria.';
        const title=x.stage==='overdue'?'Revisión de saldo y vencimiento':'Recordatorio próximo vencimiento';
        if(this.queueUnitNotification(communityId,x.unitId,'unit_message',title,body,x.sourceId))created++;
      }
    });
    return {asOf:result.asOf,created,externalMessagesSent:0};
  }
  // Only an authenticated owner can express their own consent. Administrator
  // entry of directory contact preferences is NOT consent and never used here.
  communicationConsent(userId,communityId){
    if(this.member(userId,communityId)!=='owner')throw new Problem(403,'Solo propietarios autorizados');
    const entries=rows(this.db.prepare(`SELECT purpose,channel,enabled,updated_at updatedAt
      FROM communication_consent WHERE community_id=? AND user_id=?
      ORDER BY purpose,channel`),communityId,userId).map(x=>({...x,enabled:!!x.enabled}));
    return {entries,verifiedChannel:false,externalDeliveryEnabled:false};
  }
  setCommunicationConsent(userId,communityId,data){
    if(this.member(userId,communityId)!=='owner')throw new Problem(403,'Solo el titular puede gestionar sus preferencias');
    if(!data||typeof data!=='object'||Array.isArray(data)||
      Object.keys(data).sort().join(',')!=='channel,enabled,purpose')
      throw new Problem(400,'Campos de consentimiento inválidos');
    const {purpose,channel,enabled}=data;
    if(!['billing_updates','community_news'].includes(purpose)||channel!=='email'||typeof enabled!=='boolean')
      throw new Problem(400,'Finalidad, canal o autorización inválidos');
    const now=dateNow(),eventId=randomUUID();
    this.writeAudited(userId,communityId,'communication.consent_changed',eventId,()=>{
      this.db.prepare(`INSERT INTO communication_consent (community_id,user_id,purpose,channel,enabled,updated_at)
        VALUES(?,?,?,?,?,?) ON CONFLICT(community_id,user_id,purpose,channel)
        DO UPDATE SET enabled=excluded.enabled,updated_at=excluded.updated_at`)
        .run(communityId,userId,purpose,channel,Number(enabled),now);
      this.db.prepare(`INSERT INTO communication_consent_events
        (id,community_id,user_id,purpose,channel,enabled,occurred_at,authentication)
        VALUES (?,?,?,?,?,?,?,'authenticated_self_service')`)
        .run(eventId,communityId,userId,purpose,channel,Number(enabled),now);
    });
    return {purpose,channel,enabled,updatedAt:now,verifiedChannel:false,externalDeliveryEnabled:false};
  }
  notificationsFor(userId,communityId){
    const role=this.member(userId,communityId);
    if(role!=='owner')return []; // Admin uses audit, never a neighbor's private inbox.
    return rows(this.db.prepare(`SELECT n.id,n.kind,n.title,n.body,n.created_at createdAt,
      n.read_at readAt,u.code unit
      FROM unit_notifications n JOIN units u ON u.id=n.unit_id AND u.community_id=n.community_id
      WHERE n.community_id=? AND n.recipient_user_id=? AND u.owner_user_id=?
      ORDER BY n.created_at DESC,n.rowid DESC LIMIT 100`),communityId,userId,userId);
  }
  readUnitNotification(userId,communityId,notificationId){
    if(this.member(userId,communityId)!=='owner')throw new Problem(403,'Solo el destinatario puede marcar la notificación');
    if(typeof notificationId!=='string'||!VALID.test(notificationId))throw new Problem(404,'Notificación no disponible');
    const notice=this.db.prepare(`SELECT n.id,n.read_at FROM unit_notifications n
      JOIN units u ON u.id=n.unit_id AND u.community_id=n.community_id
      WHERE n.id=? AND n.community_id=? AND n.recipient_user_id=? AND u.owner_user_id=?`
    ).get(notificationId,communityId,userId,userId);
    if(!notice)throw new Problem(404,'Notificación no disponible');
    if(!notice.read_at)this.writeAudited(userId,communityId,'notification.read',notificationId,()=>{
      this.db.prepare('UPDATE unit_notifications SET read_at=? WHERE id=? AND read_at IS NULL').run(dateNow(),notificationId);
    });
    return {id:notificationId,read:true};
  }
  sendUnitMessage(userId,communityId,unitId,data){
    this.requireAdmin(userId,communityId);
    if(!this.unitIsIn(communityId,unitId))throw new Problem(404,'Unidad no disponible');
    if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).sort().join(',')!=='body,title')
      throw new Problem(400,'Indique título y mensaje solamente');
    const title=requireText(data.title,'Título',90),body=requireText(data.body,'Mensaje',1000);
    const owner=this.db.prepare('SELECT owner_user_id FROM units WHERE id=? AND community_id=?').get(unitId,communityId);
    if(!owner.owner_user_id)throw new Problem(409,'Asigne un propietario antes de enviar un aviso privado');
    const id=randomUUID();
    this.writeAudited(userId,communityId,'notification.unit_message',id,()=>{
      this.queueUnitNotification(communityId,unitId,'unit_message',title,body,id);
    });
    return {id,recordedInApp:true}; // Stored for inbox; no external delivery or proof of reading.
  }
  unitIsIn(communityId, unitId) {
    return Boolean(this.db.prepare('SELECT id FROM units WHERE community_id=? AND id=?').get(communityId, unitId));
  }
  addUnit(userId, communityId, data) {
    this.requireAdmin(userId, communityId);
    const code=requireText(data.code,'Unidad',40), kind=requireText(data.kind,'Tipo',40), resident=String(data.resident??'').trim();
    if(resident.length>100) throw new Problem(400,'Ocupante demasiado largo');
    const ownerId=data.ownerUserId??null;
    if(ownerId && !this.db.prepare(`SELECT 1 FROM memberships m JOIN communities c ON c.id=m.community_id JOIN account_memberships a ON a.account_id=c.account_id AND a.user_id=m.user_id WHERE m.user_id=? AND m.community_id=? AND m.role='owner'`).get(ownerId,communityId)) throw new Problem(400,'Propietario inválido para esta comunidad');
    const id=randomUUID();
    try{this.writeAudited(userId,communityId,'unit.created',id,()=>this.db.prepare('INSERT INTO units VALUES (?,?,?,?,?,?,?)').run(id,communityId,code,kind,resident,ownerId,dateNow()));}
    catch(e){if(String(e).includes('UNIQUE')) throw new Problem(409,'La unidad ya existe');throw e;}

    return {id};
  }
  addCharge(userId,communityId,data){
    this.requireAdmin(userId,communityId);
    const unitId=requireText(data.unitId,'Unidad',60),period=requirePeriod(data.period),concept=requireText(data.concept,'Concepto',100),amountMinor=requireMinor(data.amountMinor);
    if(!this.unitIsIn(communityId,unitId)) throw new Problem(404,'Unidad no disponible');
    // Due dates are opt-in and explicit; historical charges without a date are NOT overdue.
    const dueOn=data.dueOn==null?null:strictUtcDay(data.dueOn);
    if(data.dueOn!=null&&!dueOn)throw new Problem(400,'Fecha de vencimiento inválida: use AAAA-MM-DD');
    const id=randomUUID();
    try{this.writeAudited(userId,communityId,'charge.created',id,()=>{
      this.db.prepare('INSERT INTO charges VALUES (?,?,?,?,?,?,?)').run(id,communityId,unitId,period,concept,amountMinor,dateNow());
      if(dueOn)this.db.prepare('INSERT INTO charge_deadlines VALUES (?,?,?,?)').run(id,communityId,dueOn,dateNow());
      this.queueUnitNotification(communityId,unitId,'charge_created','Nueva cuota registrada','Hay una cuota registrada para tu departamento. Consulta tu estado de cuenta privado.',id);
    });}
    catch(e){if(String(e).includes('UNIQUE')) throw new Problem(409,'Cuota duplicada para período, unidad y concepto');throw e;}

    return {id};
  }
  addPayment(userId,communityId,data){
    this.requireAdmin(userId,communityId);
    const unitId=requireText(data.unitId,'Unidad',60), reference=requireText(data.reference,'Referencia',90),concept=requireText(data.concept,'Concepto',100),amountMinor=requireMinor(data.amountMinor);
    if(!this.unitIsIn(communityId,unitId)) throw new Problem(404,'Unidad no disponible');
    const id=randomUUID();
    try{this.writeAudited(userId,communityId,'payment.created',id,()=>{this.db.prepare('INSERT INTO payments VALUES (?,?,?,?,?,?,?)').run(id,communityId,unitId,reference,concept,amountMinor,dateNow());this.queueUnitNotification(communityId,unitId,'payment_recorded','Registro administrativo de pago','La administración registró un pago para tu unidad. No equivale a confirmación de una entidad bancaria.',id);});}
    catch(e){if(String(e).includes('UNIQUE')) throw new Problem(409,'Referencia de pago duplicada en la comunidad');throw e;}

    return {id};
  }
  paymentReportsFor(userId,communityId){
    const role=this.member(userId,communityId);
    if(!['admin','owner'].includes(role))throw new Problem(403,'Acceso a reportes de pago restringido');
    const ownerOnly=role==='owner';
    return rows(this.db.prepare(`SELECT r.id,r.unit_id unitId,u.code unit,r.reference,r.concept,
      r.amount_minor amountMinor,r.status,r.created_at createdAt,r.updated_at updatedAt,
      r.ledger_payment_id ledgerPaymentId
      FROM payment_reports r JOIN units u ON u.id=r.unit_id AND u.community_id=r.community_id
      WHERE r.community_id=? ${ownerOnly?'AND r.submitter_user_id=? AND u.owner_user_id=?':''}
      ORDER BY r.created_at DESC,r.rowid DESC LIMIT 100`),communityId,...(ownerOnly?[userId,userId]:[]));
  }
  submitPaymentReport(userId,communityId,data){
    if(this.member(userId,communityId)!=='owner')throw new Problem(403,'Solo el propietario vinculado puede informar pagos');
    if(!data||typeof data!=='object'||Array.isArray(data)||
      Object.keys(data).sort().join(',')!=='amountMinor,concept,reference,unitId')
      throw new Problem(400,'Campos de pago informado inválidos');
    const unitId=requireText(data.unitId,'Unidad',60),reference=requireText(data.reference,'Referencia',90),
      concept=requireText(data.concept,'Concepto',100),amountMinor=requireMinor(data.amountMinor);
    if(!this.db.prepare('SELECT 1 FROM units WHERE id=? AND community_id=? AND owner_user_id=?').get(unitId,communityId,userId))
      throw new Problem(404,'Unidad no disponible');
    const id=randomUUID(),at=dateNow();
    try{this.writeAudited(userId,communityId,'payment_report.informed',id,()=>{
      this.db.prepare(`INSERT INTO payment_reports VALUES (?,?,?,?,?,?,?,'informado',NULL,?,?)`)
        .run(id,communityId,unitId,userId,reference,concept,amountMinor,at,at);
      this.db.prepare(`INSERT INTO payment_report_events VALUES (?,?,?,?,?, ?,?)`)
        .run(randomUUID(),id,communityId,userId,'informado','Declaración voluntaria del titular',at);
    });}catch(e){if(String(e).includes('UNIQUE'))throw new Problem(409,'Esta referencia ya fue informada en la comunidad');throw e;}
    return {id,status:'informado',ledgerPosted:false,bankReconciled:false};
  }
  decidePaymentReport(userId,communityId,reportId,data){
    this.requireAdmin(userId,communityId);
    if(typeof reportId!=='string'||!VALID.test(reportId))throw new Problem(404,'Reporte de pago no disponible');
    if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).sort().join(',')!=='action,note')
      throw new Problem(400,'Acción de revisión inválida');
    const {action}=data,note=requireText(data.note,'Justificación',240);
    if(note.length<10||!['review','confirm','reject','reverse'].includes(action))
      throw new Problem(400,'Acción o justificación inválida');
    const current=this.db.prepare(`SELECT id,unit_id unitId,reference,concept,amount_minor amountMinor,status,
      ledger_payment_id ledgerPaymentId FROM payment_reports WHERE id=? AND community_id=?`).get(reportId,communityId);
    if(!current)throw new Problem(404,'Reporte de pago no disponible');
    const next={review:'en_revision',confirm:'confirmado',reject:'rechazado',reverse:'reversado'}[action];
    const allowed={informado:['review'],en_revision:['confirm','reject'],confirmado:['reverse'],rechazado:[],reversado:[]};
    if(!allowed[current.status].includes(action))throw new Problem(409,'Transición de pago no permitida');
    const at=dateNow();
    let ledgerPaymentId=current.ledgerPaymentId??null;
    this.writeAudited(userId,communityId,'payment_report.'+action,reportId,()=>{
      if(action==='confirm'){
        // Explicit administrative posting after review; NOT automatic bank matching.
        const ledger=this.addPayment(userId,communityId,{unitId:current.unitId,reference:current.reference,
          concept:current.concept,amountMinor:current.amountMinor});
        ledgerPaymentId=ledger.id;
      }
      if(action==='reverse'){
        if(!ledgerPaymentId)throw new Problem(409,'No existe abono registrado para reversar');
        this.reverseEntry(userId,communityId,'payment',ledgerPaymentId,note);
      }
      this.db.prepare('UPDATE payment_reports SET status=?,ledger_payment_id=?,updated_at=? WHERE id=? AND community_id=?')
        .run(next,ledgerPaymentId,at,reportId,communityId);
      this.db.prepare('INSERT INTO payment_report_events VALUES (?,?,?,?,?,?,?)')
        .run(randomUUID(),reportId,communityId,userId,action,note,at);
      if(action==='reject')this.queueUnitNotification(communityId,current.unitId,'unit_message',
        'Reporte de pago rechazado','La administración rechazó un reporte de pago. Revisa el estado de cuenta o consulta directamente a administración.',reportId+':rejected');
      if(action==='review')this.queueUnitNotification(communityId,current.unitId,'unit_message',
        'Reporte de pago en revisión','La administración comenzó a revisar un pago informado. No constituye confirmación bancaria.',reportId+':review');
    });
    return {id:reportId,status:next,ledgerPosted:next==='confirmado',bankReconciled:false};
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
    const exists=this.db.prepare(`SELECT id,unit_id unitId FROM ${table} WHERE id=? AND community_id=?`).get(entityId,communityId);
    if(!exists)throw new Problem(404,'Movimiento no disponible');
    const id=randomUUID();
    try{this.writeAudited(userId,communityId,`${type}.reversed`,entityId,()=>{
      this.db.prepare('INSERT INTO reversals VALUES (?,?,?,?,?,?,?)').run(id,communityId,type,entityId,userId,reason,dateNow());
      this.queueUnitNotification(communityId,exists.unitId,type==='charge'?'charge_reversed':'payment_reversed',
        type==='charge'?'Cuota anulada':'Registro de pago anulado',
        'La administración anuló un movimiento de esta unidad. Revisa el estado de cuenta privado; no implica una transferencia bancaria.',
        id);
    });}
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
