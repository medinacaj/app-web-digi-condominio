# SaaS client accounts implementation plan

> Agentic workers: use subagent-driven-development for isolated implementation and requesting-code-review for review. Existing isolated checkout; no worktree, push, deployment or external pilot.

**Goal:** implement client accounts for independent condominiums and management companies, operational membership isolation, account administration and context switching.
**Architecture:** version-4 SQLite foundation with explicit account-community ownership; separate account audit and memberships; existing Node API plus account endpoints and existing UI with account management.
**Tech stack:** Node >=22.16, node:sqlite, plain JS, Playwright. No new npm dependencies.
**Spec:** docs/superpowers/specs/2026-11-09-saas-client-accounts-design.md (user: "Ok sigue").

## Global constraints
- Same application for `independent` and `management_company`.
- Account membership plus community assignment required for operational access. `account_admin` never implies community admin.
- Last account administrator protected; membership mutations audited atomically. No implicit privilege escalation.
- Legacy database requires explicit community-account and initial admin mapping with backup, integrity check, rollback and schema version update.
- Preserve earlier Windows launcher work and existing financial/ownership operations. No production readiness claim.

## Review focus
- Revocation effective on existing session; no cross-account access via ID tampering.
- A failed audit rolls back grants/revocations and account creation.
- Incomplete migration mapping leaves old schema/data intact; unknown versions refused.
- UI responses arriving out of order or after logout cannot repopulate prior context.
- Account-only administrator without operational community can administer account without reading financial data.

### Task 1: Store and migration
Own server/store.js, new server/account-migration.js, new server/migrate-accounts.js; update existing test fixtures and add account/migration tests.
Interfaces (stable for other tasks):
- createAccount(adminUserId,{name,kind}) -> {id}; trusted provisioning; admin user must exist.
- createCommunity(name,address='',accountId) -> communityId; explicit account required. Low-level local provisioning only.
- setMembership(userId,communityId,role): trusted provisioning; ensures ordinary account membership when absent, never account admin. No public route uses this directly.
- accountsFor(userId) -> [{id,name,kind,role}].
- communitiesFor(userId,accountId?) -> operational communities, each with accountId. Optional account filter validated.
- accountOverview(actorId,accountId) -> {account:{id,name,kind,role},communities:[{id,name,address}],members:[{id,email,displayName,role}],assignments:[{userId,communityId,role}],audit:[...]}; account-admin only.
- addCommunity(actorId,accountId,{name,address}) -> {id}; metadata creation, no automatic operational grant.
- changeAccountMember(actorId,accountId,targetUserId,roleOrNull) -> {ok:true}; roles account_admin/member, null revoke; preserve last admin.
- changeCommunityMember(actorId,accountId,communityId,targetUserId,roleOrNull) -> {ok:true}; explicit account-admin grants for existing active account members only; roles admin/committee/owner, null revoke.
- member/requireAdmin validate both layers. Revoked account means operational denial despite retained community row.
- account migration: export migrateAccounts(location,mapping,backupPath), mapping {accounts:[{id,name,kind,adminUserIds:[...]}],communities:[{communityId,accountId}]}. Refuse incomplete/duplicate/unowned mappings and future versions. Backup required before schema mutation. CLI uses DIGI_DB_PATH, DIGI_ACCOUNT_MAPPING, DIGI_MIGRATION_BACKUP.
- [x] RED account, revocation, audit rollback and migration tests.
- [x] GREEN schema, authorization, atomic account CRUD and migration; update previous tests with explicit account fixtures and schema version 4.
- [x] Relevant tests plus suite, report exact outcomes.

### Task 2: API and provisioning
Own server/app.js, server/bootstrap.js, server/local-launcher.js, server/add-user.js if needed, tests/accounts-http.test.js, package.json.
- [x] RED authenticated account endpoints and denied cross-account access.
- [x] GET /api/accounts -> {accounts}; GET /api/accounts/:id -> accountOverview.
- [x] GET /api/accounts/:id/communities -> {communities}; POST same -> addCommunity result.
- [x] PATCH /api/accounts/:id/members/:userId with {role:string|null} -> changeAccountMember.
- [x] PATCH /api/accounts/:id/communities/:communityId/members/:userId with {role:string|null} -> changeCommunityMember.
- [x] Bootstrap/local wizard explicitly provision independent account and community plus operational admin. Add npm migrate:accounts script; syntax check new modules.

### Task 3: Web context and administration
Own src/connected.js, src/connected.css, tests/accounts-browser.py, browser fixture setup updates as needed.
- [x] Browser RED for two account kinds, multiple condos, account-only admin, account member grants/revocations and stale responses.
- [x] Account and community selectors, management page for account_admin, create condo and modify existing members/assignments, visible account audit.
- [x] Context changes immediately clear data/forms/members, capture request context/generation, ignore stale responses after switch/logout, block writes during pending operations.
- [x] Browser GREEN plus existing E2E and launcher flow.

### Task 4: Integration and documentation
Own docs/SAAS_BASE.md, README.md, ESTADO_ACTUAL.md and CI browser step, scripts/package-windows.py file inclusion.
- [x] Document local foundation versus hosted SaaS, assisted account provisioning and migration JSON example/backups.
- [x] Add browser SaaS check to CI, update portable manifest for new runtime modules but do not claim a new downloadable release.
- [x] Run full npm check, new/existing browser tests, independent review and fix critical findings; leave reviewable changes, no remote publication.

## Observed validation
`npm run check`: 63 tests, 62 passed, 0 failed, 1 Windows-only skipped. Existing direct browser E2E and local launcher wizard passed. SaaS browser covers two models, multiple communities, account-only admin, explicit creation/assignment, delayed overview success/error, delayed CSV, logout, and account role changes. No remote CI or deployment run is claimed. Independent review found two stale-response bugs; each was reproduced RED and fixed GREEN.
