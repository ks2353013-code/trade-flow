# TradeFlow AI Bug Report - Iteration 1

Date: 2026-06-28

## Fixed Bugs

| ID | Severity | Bug | Root Cause | Fix |
| --- | --- | --- | --- | --- |
| TF-BUG-001 | Critical | Direct email could bypass approvals | Multiple legacy send routes existed alongside approved email delivery | Default-deny direct send unless feature flag enabled |
| TF-BUG-002 | Critical | WhatsApp send route active in beta | Route directly invoked WhatsApp service | Default-deny unless `ENABLE_WHATSAPP_AUTOMATION=true` |
| TF-BUG-003 | High | Autonomous route mutated data by default | Route created tasks and outreach records | Default-deny unless `ENABLE_AUTONOMOUS_EXECUTION=true` |
| TF-BUG-004 | High | Activity list/delete not tenant scoped | Route used global Activity queries | Added tenant filters and Activity tenant fields |
| TF-BUG-005 | High | Audit logs deletable | Delete route used `findByIdAndDelete` | Replaced with 405 append-only response |
| TF-BUG-006 | High | Role header spoofing risk | `requireRole` accepted `x-user-role` fallback | Removed header fallback |
| TF-BUG-007 | High | Free plan undefined in plan limits | `PLAN_LIMITS.Free` missing | Added explicit Free limits |

## Open Bugs / Gaps

| ID | Severity | Bug / Gap | Notes |
| --- | --- | --- | --- |
| TF-BUG-008 | High | Automated regression coverage missing | No backend app test suite found |
| TF-BUG-009 | Medium | `.gitignore` malformed brace pattern | `rg` reports parse errors |
| TF-BUG-010 | Medium | Many frontend modules independently define API base URL | Risk of drift and production/local mismatch |
| TF-BUG-011 | Medium | Several legacy AI/demo modules remain visible in dashboard | Needs UX/product gating review |

## Validation Status

- Syntax validation passed for changed backend files.
- Runtime validation pending backend restart and smoke run.

## Iteration 2 Bugs / Regressions

Date: 2026-07-15

| ID | Severity | Bug / Gap | Root Cause | Fix / Status |
| --- | --- | --- | --- | --- |
| TF-BUG-012 | Medium | Activity delete returned success for unmatched tenant records | Iteration 1 changed delete to tenant-scoped `findOneAndDelete` but did not inspect null result | Fixed: return 404 when no activity matches |
| TF-BUG-013 | High | Growth subscription users normalized to Free | Growth plan missing in subscription middleware | Fixed |
| TF-BUG-014 | High | Legacy `/api/ai` routes missed Starter gate | Server mounted `/api/ai` without `requirePlan("Starter")` | Fixed |
| TF-BUG-015 | High | Executive analytics workflow data was global | Route used unfiltered counts/finds | Fixed |
| TF-BUG-016 | Critical | Backup export leaked all Activity rows | Backup route used `Activity.find({})` | Fixed |
| TF-BUG-017 | Critical | Backup restore could trust uploaded owner email | Restore fallback used `backup.ownerEmail` | Fixed |
| TF-BUG-018 | Medium | Usage analytics could write placeholder tenant | Usage middleware defaulted to `unknown@tradeflow.local` | Fixed |
| TF-BUG-019 | High | Legacy frontend panels could initiate blocked direct-send/autonomous calls | Old UI modules still fetched disabled endpoints | Fixed |
| TF-BUG-020 | Medium | Legacy frontend panels sent spoofable `x-user-email` headers | Old UI modules read identity from localStorage | Fixed in reviewed panels |

## Iteration 2 Validation Status

- Syntax validation passed for changed backend files.
- `git diff --check` passed.
- Local `/api/health` PASS, Mongo connected.
- Local `/api/ready` PASS, Mongo connected.
- Unauthenticated protected routes return JSON 401.
- Missing API route returns JSON 404.
- Reviewed frontend safety files pass syntax validation.
- Direct-send/autonomous frontend endpoint scan is clean except static non-executable status text.
- Authenticated plan/tenant bypass tests still need automated coverage.

## Iteration 2 Blocker Closure

Date: 2026-07-16

| ID | Severity | Bug / Gap | Root Cause | Fix / Status |
| --- | --- | --- | --- | --- |
| TF-BUG-021 | Critical | Logout did not invalidate issued access or refresh tokens | Logout only cleared the refresh cookie; JWTs had no server-checked revocation generation | Fixed with backward-compatible `tokenVersion` generation checks and atomic logout increment |
| TF-BUG-022 | High | Regression runner continued after failed Mongo connection | `connectDB()` returns `false`, but the runner ignored the result | Fixed: abort immediately before tests; run-scoped records remain protected by `finally` cleanup |
| TF-BUG-023 | Low | Accidental staged `backend/node` file | Zero-byte temporary artifact | Confirmed zero bytes in worktree and index, then unstaged and deleted only that file |

Verified: health and readiness JSON 200; Mongo connected; schedulers disabled; email dry-run; regression suite passed twice; stale access and refresh tokens returned JSON 401 after logout; both diff checks and all changed-JS syntax checks passed. Connected-browser smoke was attempted but not completed because the required in-app browser control surface was unavailable.

## Iteration 2 Final Release Validation Attempt

Date: 2026-07-25

Fixed blockers verified by automation:

- Regression runner connects and completes successfully.
- Logout stale-token regression passes: old access and refresh sessions receive JSON 401 after logout.
- Accidental `backend/node` artifact is absent from the final staged scope.
- Temporary smoke tenant cleanup was previously recorded as complete.

Remaining bug/gap:

- Connected Chrome/browser smoke could not run because the browser controller failed during setup with `Cannot redefine property: process`. This is a validation-tooling blocker, not an observed TradeFlow application bug.

Validation:

- Health/ready PASS.
- Iteration 2 regression suite PASS.
- Diff checks PASS.
- Staged JavaScript syntax checks PASS.
- Scoped staged secret scan PASS for live secrets.

## Iteration 2 Playwright Bug Validation

Date: 2026-07-25

The connected Chrome validation blocker was replaced with terminal-launched Playwright Chromium because the controller failed before reaching TradeFlow. This removes the browser-controller issue from the application bug list.

Validation outcome:

- Playwright release smoke PASS.
- No genuine TradeFlow application blocker was found during the final passing run.
- Test-hardening issues corrected: URL waiting now uses DOM readiness, mission entry waits for Mission Center readiness, verification assertion matches the visible `Verification: <score>` UI, and expected 403 denial console noise is filtered only after URL-level API validation.
- One synthetic mission from an earlier failed test-hardening run was found and deleted by exact `_id`, owner email, company id, and workspace id.
- Final cleanup verification: zero `iteration2.e2e.*` users, companies, workspaces, subscriptions, activities, suppliers, missions, CRM leads, outreach approvals, or email deliveries remain.

Remaining non-blocking gap:

- Existing `.gitignore` still contains malformed brace patterns that cause `rg` warnings. This predates the Playwright gate and did not block Git diff checks or the smoke test.

## Production Verification Bugs / Gaps - Commit 7494db4

Date: 2026-07-25

| ID | Severity | Bug / Gap | Evidence | Status |
| --- | --- | --- | --- | --- |
| TF-PROD-GATE-001 | High | Production authenticated smoke lacks cleanup-safe synthetic account path | Local Mongo fixture users were not visible to Render backend; public signup would create production records without a verified exact cleanup route | Open release gate |

No production app defect was confirmed during non-destructive checks. Health, readiness, JSON 404, unauthenticated JSON 401, CORS, and deployed frontend asset comparison all passed.

GO impact: controlled pilot GO cannot be declared until the authenticated production mission-to-email workflow is run using either an approved cleanup-capable test account or a protected synthetic-smoke cleanup mechanism.

## Production QA Tenant Bugs / Gaps

Date: 2026-07-25

| ID | Severity | Bug / Gap | Evidence | Status |
| --- | --- | --- | --- | --- |
| TF-PROD-404-001 | High | Production dashboard loads two missing JS files | Playwright observed 404/network abort for `/js/ai-outreach-writer-engine.js` and `/js/ai-followup-agent-engine.js`; repo files use uppercase `ai-Outreach...` and `ai-Followup...` | Fixed locally in `frontend/index.html`; pending commit/deploy |
| TF-QA-CLEANUP-001 | Medium | No exact cleanup route for QA mission/approval/audit/email-delivery records | Existing APIs allow tenant-scoped CRM deletion, but not TradeMission, OutreachApproval, ApprovalAuditLog, or EmailDelivery deletion/archive | Open; records retained with QA prefix in permanent QA tenant |

Production smoke reached and passed core business workflow before failing the console/network gate. No real customer data was touched.

## Production QA Final Bug Status

Date: 2026-07-25

| ID | Severity | Bug / Gap | Final Status |
| --- | --- | --- | --- |
| TF-PROD-404-001 | High | Production dashboard loaded lowercase script filenames that 404 on Vercel | Fixed in commit `92b0c5b5be3c7bb79c824fa39fab10a6098e6ca5`; deployed frontend now requests corrected casing and both scripts return HTTP 200 |
| TF-QA-CLEANUP-001 | Medium | No exact cleanup route for QA mission/approval/audit/email-delivery records | Accepted for pilot as isolated QA evidence retention; CRM transactional record cleanup passed by exact tenant-scoped API ID |

Final production QA smoke passed. No serious browser console/network errors remain after the casing deployment. Expected subscription-gated background 403s for analytics/AI memory were observed and classified as non-blocking.
