# Online Pilot Implementation Plan

> Agentic workers: isolated identity worker plus inline integration and independent review; existing isolated checkout, no worktree. Tests first.

**Goal:** prepare hosted pilot, secure identity onboarding/recovery and account subscription metadata, without claiming unconfigured external services work.
**Architecture:** local-compatible HTTP app plus opt-in hosted security, additive schema 5 identity and subscription tables, Docker+TLS, provider templates.
**Tech Stack:** Node24, SQLite, JS, Playwright, Docker, Caddy.
**Spec:** docs/superpowers/specs/2026-11-10-online-pilot-design.md

## Global constraints
HTTPS public origin and HttpOnly cookies for hosted sessions; no plaintext token storage/JSON/logs. Account isolation and atomic audit. No actual emails, charges, hosting purchases or main merge. Preserve prior work. Schemas v3 explicit→v4 additive→v5.

## Review Focus
Existing-user invite takeover; invite privilege after issuer revocation; reset token replay and existing-session revocation; CSRF and spoofed proxy headers; wrong-tenant subscription and transient/ephemeral storage.

### Task 1 Identity (worker)
Own server/store.js schema and changePassword helper; server/identity.js; tests/identity.test.js and tests/schema-version.test.js schema assertion. Subscription tables included by contract below, root implements service.
- [ ] RED lifecycle/negative tests before implementation; GREEN service.
Stable API: new IdentityService(store,{publicOrigin,sendMail,now=()=>Date.now()}); async createInvitation(actorId,accountId,{email,role='member',communityId=null,communityRole=null}) -> {id,expiresAt}; async requestPasswordReset(email) -> {ok:true}; acceptInvitation({token,name,password},currentUserId=null)->{ok:true}; resetPassword({token,password})->{ok:true}. sendMail({to,subject,text}) async. Max invite24h/reset1h, raw random 32-byte hex tokens only inside sent URL fragment #invite=TOKEN/#reset=TOKEN, hashed DB. Require session identity for existing user. Atomic create/consume+account audit; password reset revokes all sessions and records identity audit. Revalidate issuer role; throttle reset requests persisted per email even unknown (no enumeration response). Store.changePassword(userId,password) trusted helper validates hash and revokes sessions atomically.
Schema5 subscriptions contract: account_subscriptions(account_id PK FK accounts,plan TEXT NOT NULL,status TEXT CHECK trial/active/suspended,expires_at TEXT NULL,updated_at TEXT NOT NULL); subscription_events(id PK,account_id FK accounts,action TEXT NOT NULL,detail TEXT NOT NULL,created_at TEXT NOT NULL). Root constructor service will use these.
Report /workspace/online-build/identity-report.md. No other files, no subagents, no commits.

### Task 2 Hosted security/API (root)
Own server/app.js, server/hosted-start.js, server/hosted-config.js, server/mailer.js, tests/hosted-http.test.js; compatibility local default. createApp(store,{hosted=false,publicOrigin,trustProxy=false,identity=null,subscriptions=null}={}). Validate HTTPS+host globally in hosted; cookie-only sessions, csrf returned on login/session; require Origin and per-session CSRF for authenticated mutations, Origin for anonymous auth mutations. Add POST /api/password-reset/request, POST /api/password-reset/complete, POST /api/invitations/accept; authenticated POST /api/accounts/:id/invitations and GET /api/accounts/:id/subscription. No secrets/raw link in responses. Tests actual negative HTTP and HTTPS.

### Task 3 Subscription and web (root)
Own server/subscriptions.js + CLI tests; root UI additions in src/connected.js/css, tests/online-browser.py. Capture incoming URL fragment then remove from history; forms request/reset/invite, existing identity login continuation. Both cookie and legacy bearer local supported; session restore. Account-admin invite form + subscription read-only summary. Test browser via hosted HTTPS and synthetic mail capture.

### Task 4 Deploy/verification
Dockerfile, .dockerignore, deploy/compose.yml+Caddyfile, render.yaml (paid service not automatically created), docs/ONLINE_PILOT.md, variables example and CI. Use explicit files, non-root, persistent /data, health check, hosted entrypoint. Build/run Docker and TLS smoke with synthetic data. Full Node + browser tests and independent review. Save source reviewably in private draft PR if credentials permit; do not merge/deploy paid services.
