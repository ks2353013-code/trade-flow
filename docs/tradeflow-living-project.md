# TradeFlow AI Living Project Document

Last updated: 2026-06-28

## Operating Rule

If an ambiguity or conflict appears, stop and ask the single most important question before proceeding.

## Current Product Understanding

TradeFlow AI is a workspace-first B2B SaaS platform for trading companies and exporters. It supports company/workspace onboarding, buyer and supplier discovery, mission planning, CRM lead promotion, outreach draft approval, approved email delivery, subscriptions, audit logs, beta onboarding, and AI-assisted recommendations.

The first beta wedge is trading companies/exporters. The product should not behave as a public marketplace during beta. Cross-company visibility is off by default.

## Non-Negotiable Boundaries

- Company isolation.
- Workspace isolation.
- Role and permission enforcement.
- Subscription enforcement.
- Human approval before outbound email or external sharing.
- No WhatsApp/call/autonomous execution during beta unless explicitly feature-flagged.
- Audit records must be preserved.
- Development may mock external providers, but production integrations must be restored through explicit configuration.

## Iteration 1 Discovery Summary

Reviewed areas:

- Project root and deployment configuration.
- Backend server composition.
- Database readiness and health behavior.
- Auth, token, tenant, role, subscription, plan-limit, usage, and audit middleware.
- Auth, audit, activity, email, outreach email, email automation, WhatsApp automation, autonomous workflow, subscription, CRM, mission, and approval routes.
- Core models for User, Activity, AuditLog, ApprovalAuditLog.
- Frontend/module inventory and API URL patterns.

## Iteration 1 Critical/High Findings

| ID | Severity | Area | Finding | Status |
| --- | --- | --- | --- | --- |
| TF-SEC-001 | Critical | Outreach safety | Direct email routes could send without Outreach Approval Queue. | Fixed with default-deny feature flag |
| TF-SEC-002 | Critical | WhatsApp safety | WhatsApp automation route could send messages during beta. | Fixed with default-deny feature flag |
| TF-SEC-003 | High | Autonomous workflow | Autonomous workflow route could create tasks/outreach without beta safety default. | Fixed with default-deny feature flag |
| TF-SEC-004 | High | Audit integrity | General audit logs could be deleted. | Fixed by returning append-only 405 |
| TF-SEC-005 | High | Tenant isolation | Activity routes were globally scoped and delete-all affected all tenants. | Fixed with tenant filter and master-only clear |
| TF-SEC-006 | High | Authorization | Role helper could fall back to user-controlled `x-user-role`. | Fixed by using verified user role only |
| TF-SUB-001 | High | Subscription | Plan limit middleware had no Free plan definition, allowing undefined limits to pass. | Fixed with explicit Free limits |
| TF-TEST-001 | High | Testing | No meaningful backend unit/integration/E2E test suite found in app code. | Open |
| TF-OPS-001 | Medium | Tooling | `.gitignore` contains malformed brace patterns that make ripgrep complain. | Open |

## Fixes Applied in Iteration 1

- Added Free plan limits to `planLimitMiddleware`.
- Removed `x-user-role` fallback from `roleMiddleware`.
- Made general audit delete route return append-only denial.
- Tenant-scoped activity list/create/delete behavior.
- Added tenant fields to Activity model.
- Disabled direct email sending by default behind `ALLOW_UNAPPROVED_EMAIL_SEND=true`.
- Disabled direct outreach email sending by default behind `ALLOW_UNAPPROVED_EMAIL_SEND=true`.
- Disabled AI email automation sending by default behind `ALLOW_UNAPPROVED_EMAIL_SEND=true`.
- Disabled WhatsApp automation by default behind `ENABLE_WHATSAPP_AUTOMATION=true`.
- Disabled autonomous execution by default behind `ENABLE_AUTONOMOUS_EXECUTION=true`.

## Required Validation

- Syntax checks for changed JS files: passed.
- Runtime API safety checks: pending after backend restart.
- Existing mission-to-approved-email smoke: pending after backend restart.
- Free/Starter/Pro subscription regression: pending after backend restart.
- Tenant bypass tests: pending.

## Remaining High-Priority Work

1. Add automated security regression tests for tenant/workspace isolation.
2. Add integration tests for approval-required email delivery.
3. Add tests proving disabled WhatsApp/autonomous routes return 403 unless feature flags are enabled.
4. Audit all direct email and external action UI buttons.
5. Repair malformed `.gitignore`.
6. Continue route-by-route tenant and permission review.

## Iteration 2 Audit Continuation

Date: 2026-07-15

Scope resumed from Iteration 1 without restarting discovery:

- Re-read existing audit docs and verified prior edits.
- Reviewed Iteration 1 fixes for regressions.
- Continued backend route, database, AI workflow, workspace isolation, subscription, and API safety audit.
- Re-ran syntax validation on changed backend files.
- Started local backend and confirmed `/api/health` and `/api/ready` return JSON with Mongo connected.

### Iteration 2 Findings and Fixes

| ID | Severity | Area | Finding | Status |
| --- | --- | --- | --- | --- |
| TF-REG-001 | Medium | Activity tenant isolation | Tenant-scoped activity delete returned success even when no matching tenant record existed. | Fixed: unmatched delete now returns 404 |
| TF-SUB-002 | High | Subscription | `Growth` plan existed in plan limits but normalized to `Free` in subscription gate middleware. | Fixed: Growth added to plan order, entitlements, and normalization |
| TF-AI-001 | High | AI subscription gate | Legacy `/api/ai/*` routes were protected but not Starter-gated like newer AI modules. | Fixed: `/api/ai` mount now requires Starter |
| TF-ISO-001 | High | Executive analytics | Executive analytics counted automation workflows globally instead of tenant-scoping counts and leaderboards. | Fixed: owner/company/workspace scoped queries |
| TF-ISO-002 | High | Header-trust identity | Several routes still had `x-user-email` or body/query owner fallbacks. | Fixed in reviewed routes to use verified `req.tenant` / `req.user` |
| TF-ISO-003 | Critical | Backup export | Backup export included `Activity.find({})`, leaking all tenant activities. | Fixed: activity export uses tenant filter |
| TF-ISO-004 | Critical | Backup restore | Backup restore could adopt `backup.ownerEmail` from uploaded payload. | Fixed: restore forces authenticated tenant owner email |
| TF-USAGE-001 | Medium | Usage analytics | Usage tracking could write records under `unknown@tradeflow.local`. | Fixed: fail closed if authenticated owner email is missing |
| TF-UX-SEC-001 | High | Frontend safety | Legacy browser panels still attempted direct email, WhatsApp, and autonomous workflow calls. | Fixed: converted to draft/blocked beta-safe behavior |
| TF-UX-SEC-002 | Medium | Frontend identity | Legacy AI activity panels sent `x-user-email` headers from localStorage. | Fixed: use token auth headers instead |

### Iteration 2 Validation

- `node --check` passed for the route and middleware files changed during Iteration 2.
- `git diff --check` passed.
- Local backend started successfully.
- `GET /api/health` returned JSON 200 with `mongo: connected`.
- `GET /api/ready` returned JSON 200 with `mongo: connected`.
- Unauthenticated protected API checks returned JSON 401.
- Missing API route returned JSON 404, not frontend HTML.
- Frontend safety files passed `node --check`.
- Frontend scan found no active callers to disabled direct-send/autonomous endpoints.

### Iteration 2 Remaining Work

1. Add automated regression tests for tenant isolation, especially backup export/restore and activity delete.
2. Add authenticated runtime tests for Free, Starter, Growth, Pro, and Enterprise plan gates.
3. Continue frontend audit for direct-send UI buttons and scattered API base helpers.
4. Continue database audit for string-typed `companyId` / `workspaceId` fields in mission/email-delivery models.
5. Continue payment/subscription mutation review.
6. Continue UX review for legacy demo AI modules and disabled beta actions.

## Iteration 2 Blocker Closure

Date: 2026-07-16

Logout is now a server-enforced session revocation boundary. Users have a default-zero `tokenVersion`; both JWT types carry it, protected authentication and refresh/session routes compare it with MongoDB, and logout increments it atomically while clearing the refresh cookie. This remains compatible with pre-change tokens while a user is at version zero, but any logout invalidates all older access and refresh tokens.

The regression harness now uses the same backend environment file, fails before testing when Mongo is unavailable, does not print configuration or secrets, and cleans run-scoped records in `finally`. Runtime validation passed with Mongo connected, schedulers disabled, and email in dry-run mode. The exact temporary tenant cleanup removed 16 exact-identity records. The zero-byte `backend/node` artifact was removed without touching other work.

Connected-browser authenticated smoke was attempted but not completed because the required in-app browser control surface was not available in this session. No browser pass is claimed.

## Iteration 2 Final Release Validation Attempt

Date: 2026-07-25

- Repository root confirmed as `C:\Users\Dell\Desktop\Tradeflow-clean`.
- Staged scope confirmed at 37 intended Iteration 1-2 files.
- `GET /api/health`: PASS. Mongo connected, schedulers disabled, email mode dry-run.
- `GET /api/ready`: PASS. Mongo connected, schedulers disabled, email mode dry-run.
- Connected Chrome/browser controller: BLOCKED by tooling setup error `Cannot redefine property: process`; no rendered browser step was claimed as passed.
- `node backend/scripts/iteration2-regression-tests.js`: PASS, including logout stale-token regression.
- `git diff --check`: PASS.
- `git diff --cached --check`: PASS.
- `node --check` on every staged JavaScript file: PASS.
- Scoped staged secret scan: PASS for live secrets. Only synthetic fixture password `RegressionPass123!` was detected in the regression test.
- `git status --short`: staged files only; no generated browser artifacts staged.

Commit readiness: NOT SAFE until the connected-browser smoke is genuinely completed. Automated release gates passed, but the rendered authenticated browser workflow remains the final manual gate.

## Iteration 2 Playwright Release Gate

Date: 2026-07-25

The unavailable Chrome-controller release gate was replaced with a repeatable local Playwright Chromium gate run from the repository terminal. The Chrome-controller failure remains classified as tooling-only (`Cannot redefine property: process`) and is superseded by this rendered-browser validation.

Validation performed:

- `GET /api/health`: PASS. Mongo connected, schedulers disabled, email mode dry-run.
- `GET /api/ready`: PASS. Mongo connected, schedulers disabled, email mode dry-run.
- Playwright rendered smoke: PASS.
- Flow covered: synthetic signup fixture, login, `/app` redirect, refresh/session persistence, company restore, canonical Mongo workspace restore, mission creation/execution, agent reports, CRM push, duplicate CRM prevention, outreach draft creation, pre-approval send denial, approval queue action, Create Draft and Approve audit records, approved email dry-run delivery, direct email/WhatsApp/autonomous bypass denials, logout redirect, stale access-token JSON 401, stale refresh-token JSON 401, and protected `/app` denial after logout.
- Browser console/network: PASS. No unexpected uncaught browser errors, failed requests, non-JSON API responses, missing auth, or missing workspace context. Chromium's generic expected-403 resource messages were tied to intentional bypass-denial checks and were not treated as app failures.
- Failure-only artifacts were generated during earlier test hardening and remain ignored under `test-results/` and `playwright-report/`.
- Synthetic tenant cleanup: PASS. Final verification found zero `iteration2.e2e.*` users, companies, workspaces, subscriptions, activities, suppliers, missions, CRM leads, outreach approvals, or email deliveries.
- `node backend/scripts/iteration2-regression-tests.js`: PASS.
- `git diff --check`: PASS.
- `git diff --cached --check`: PASS.
- `node --check` on staged/changed JavaScript plus new Playwright files: PASS.
- Live-secret scan: PASS.

Commit readiness: SAFE after staging the new Playwright gate files, package updates, `.gitignore`, and these audit-document updates. Do not stage generated Playwright artifacts.
