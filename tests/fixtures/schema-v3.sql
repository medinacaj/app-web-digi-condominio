
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
    
PRAGMA user_version=3;
