# TradeFlow AI Security Report - Iteration 1

Date: 2026-06-28

## Executive Summary

The first security pass found several high-risk launch blockers around outbound action safety, audit immutability, tenant scoping, and role trust. The highest-risk issues were fixed with default-deny feature flags and stronger tenant scoping while preserving production modules.

## Security Findings and Resolutions

### TF-SEC-001: Direct Email Send Bypassed Approval Queue

Severity: Critical

Root cause:

- `/api/email/send`, `/api/outreach-email/send`, and `/api/email-automation/send` could send messages directly through SMTP-style services without requiring an approved outreach draft.

Business impact:

- Potential unauthorized customer outreach, compliance exposure, and investor trust risk.

Fix:

- Direct send routes now return 403 by default.
- Existing code remains available only when `ALLOW_UNAPPROVED_EMAIL_SEND=true`.
- Approved delivery through `/api/email-deliveries/send-approved/:id` remains the safe path.

### TF-SEC-002: WhatsApp Automation Could Send During Beta

Severity: Critical

Root cause:

- `/api/whatsapp-automation/send` directly called the WhatsApp service.

Business impact:

- Violates beta rule that WhatsApp automation is out of scope and must not execute.

Fix:

- Route now returns 403 unless `ENABLE_WHATSAPP_AUTOMATION=true`.

### TF-SEC-003: Autonomous Workflow Created Records by Default

Severity: High

Root cause:

- `/api/ai-autonomous-workflows/run` created tasks and outreach records directly when invoked.

Business impact:

- Confusing user state, unwanted workflow mutations, and AI safety concern.

Fix:

- Route now returns 403 unless `ENABLE_AUTONOMOUS_EXECUTION=true`.

### TF-SEC-004: General Audit Logs Were Deletable

Severity: High

Root cause:

- `DELETE /api/audit/:id` allowed master admin deletion.

Business impact:

- Audit evidence could be removed, weakening enterprise trust and diligence posture.

Fix:

- Delete now returns 405 with append-only message.

### TF-SEC-005: Activity Routes Were Not Tenant Scoped

Severity: High

Root cause:

- Activity list and delete operations queried globally.
- Delete-all cleared all Activity records.

Business impact:

- Cross-tenant data exposure and destructive global operation risk.

Fix:

- Activity reads/deletes now apply tenant filters.
- Activity model includes ownerEmail, companyId, and workspaceId.
- Clear-all requires master admin and remains tenant filtered.

### TF-SEC-006: Role Middleware Trusted a Header Fallback

Severity: High

Root cause:

- `requireRole` fell back to `x-user-role`.

Business impact:

- If used on a protected route, a client could attempt role spoofing.

Fix:

- Removed header fallback. Role now comes from verified auth context only.

### TF-SUB-001: Free Plan Was Missing in Plan Limits

Severity: High

Root cause:

- `PLAN_LIMITS` lacked `Free`, so undefined metric limits could allow protected actions to pass.

Business impact:

- Free users could bypass intended limits on routes guarded only by plan limits.

Fix:

- Added explicit Free plan limits with AI, mission, CRM push, outreach draft, email send, PDF, analytics, and executive access disabled.

## Remaining Security Work

- Add automated bypass tests.
- Continue route-level authorization review.
- Review file upload/document routes.
- Review payment and subscription mutation paths.
- Review frontend direct-send buttons for disabled or approval-only behavior.
- Add audit immutability hooks for general AuditLog if retention policy permits.

## Iteration 2 Security Findings

Date: 2026-07-15

### TF-ISO-003: Backup Export Leaked Global Activity Records

Severity: Critical

Root cause:

- Backup export used `Activity.find({})` while the rest of the backup used tenant filters.

Business impact:

- A Pro user exporting backup data could receive activity records from other tenants.

Fix:

- Changed backup export to use the same authenticated tenant filter for Activity records.

### TF-ISO-004: Backup Restore Trusted Uploaded Owner Identity

Severity: Critical

Root cause:

- Backup restore could use `backup.ownerEmail` if `req.tenant.ownerEmail` was absent.

Business impact:

- A crafted backup payload could cause restored records to be associated with a different owner identity.

Fix:

- Restore now requires authenticated tenant owner email and forcibly assigns it to restored records.

### TF-ISO-002: Residual Header-Based Identity Fallbacks

Severity: High

Root cause:

- Several protected routes still accepted `x-user-email`, request body owner email, or query owner email as fallback identity.

Business impact:

- Even behind auth, fallback identity paths increase tenant confusion and future bypass risk.

Fix:

- Reviewed and hardened AI lead enrichment, AI memory, audit, Hunter, notification, onboarding, outreach email, and white-label routes to use verified `req.tenant` / `req.user` identity.

### TF-AI-001: Legacy AI Route Missing Starter Gate

Severity: High

Root cause:

- `/api/ai` was mounted behind auth/subscription active checks but did not require Starter like AI Command Center and agent routes.

Business impact:

- Free users with active subscriptions could reach legacy AI endpoints.

Fix:

- Mounted `/api/ai` with `requirePlan("Starter")`.

### TF-ISO-001: Executive Analytics Global Aggregates

Severity: High

Root cause:

- Executive analytics counted and listed automation workflows without tenant filtering.

Business impact:

- Executive analytics could reflect cross-tenant aggregate data.

Fix:

- Added owner/company/workspace tenant filter, with ObjectId-safe aggregate matching.

### TF-SUB-002: Growth Plan Normalized to Free

Severity: High

Root cause:

- `Growth` existed in plan-limit middleware but not in subscription middleware plan order / normalizer.

Business impact:

- Growth users could be incorrectly denied gated capabilities.

Fix:

- Added Growth to plan order, entitlements, and plan normalization.

### TF-UX-SEC-001: Legacy Frontend Direct Action Panels

Severity: High

Root cause:

- Older browser panels still attempted direct email automation, WhatsApp automation, outreach email sending, or autonomous workflow execution.

Business impact:

- Backend controls blocked these calls, but users could still trigger confusing failed requests and the UI still implied unsafe actions were available.

Fix:

- Converted the reviewed frontend panels to draft-only or blocked beta-safe behavior.
- Removed active browser calls to disabled direct-send/autonomous endpoints.

### TF-UX-SEC-002: Frontend `x-user-email` Header Usage

Severity: Medium

Root cause:

- Some AI activity panels sent `x-user-email` from localStorage.

Business impact:

- Backend should ignore spoofable user email headers, but sending them keeps an unsafe legacy pattern alive.

Fix:

- Replaced those headers with token-based Authorization headers in the reviewed modules.

## Iteration 2 Session Revocation Closure

Date: 2026-07-16

### TF-AUTH-001: Logout Left JWTs Valid

Severity: Critical

Root cause:

- Logout only cleared a client cookie, so copied access and refresh JWTs remained valid until expiry.

Fix:

- Added default-zero `User.tokenVersion` and included it in access and refresh tokens.
- Authentication, refresh, and session checks reject a version mismatch with JSON 401.
- Missing legacy claims are treated as version zero for backward compatibility.
- Logout requires valid authentication, atomically increments the stored version, and clears refresh-cookie state.

Regression evidence:

- A pre-logout access token returned JSON 401 after logout.
- A pre-logout refresh token returned JSON 401 after logout.
- The complete Iteration 2 regression suite passed twice.
- Health/readiness reported Mongo connected, schedulers disabled, and email dry-run.
- All changed JavaScript syntax checks and staged/unstaged diff checks passed.
- Authenticated browser smoke was attempted but could not be completed because browser control was unavailable; no pass is claimed.

## Iteration 2 Final Release Validation Attempt

Date: 2026-07-25

- Health and readiness checks passed with Mongo connected, schedulers disabled, and email mode dry-run.
- Regression suite passed, including stale access-token rejection and stale refresh-token rejection after logout.
- Direct-send safety remains covered by staged backend guards and frontend blocked/draft-only UI changes.
- Connected Chrome/browser validation was blocked by browser-controller tooling (`Cannot redefine property: process`), so no rendered-browser security claim was made.
- Diff whitespace checks and staged JavaScript syntax checks passed.
- Scoped staged secret scan found no live secrets; the only match was the synthetic regression fixture password.

Security release status: automated security gates PASS; browser-observed release smoke remains open.

## Iteration 2 Playwright Security Gate

Date: 2026-07-25

Rendered-browser security validation is now complete through local Playwright Chromium. The previous Chrome-controller failure is superseded and remains a tooling defect, not a TradeFlow application defect.

Security validation result:

- Authenticated session survived refresh with canonical Mongo workspace context restored.
- CRM push, outreach draft creation, approval, audit, and email dry-run were executed with authenticated workspace context.
- Duplicate CRM push was rejected as a duplicate path, not as a second lead creation.
- Pre-approval email send returned 403.
- Direct email bypass returned 403.
- Direct WhatsApp bypass returned 403.
- Autonomous execution bypass returned 403.
- Logout invalidated the issued access token and refresh session; stale access and refresh attempts returned JSON 401.
- No unexpected API 401, 403, 404, 500, HTML API response, missing JWT, or missing workspace context was observed during the passing gate.
- Synthetic test data cleanup completed with zero remaining `iteration2.e2e.*` tenant records.

Security release status: PASS for automated regression gates and the terminal-driven rendered-browser release gate. Generated Playwright artifacts are ignored and must not be staged.

## Production Security Verification - Commit 7494db4

Date: 2026-07-25

Verified production security controls without modifying real customer data:

- Backend health and readiness returned JSON 200 with Mongo connected.
- Backend reported production environment, commit `7494db476b201b3af2946b1d458f0ff92a039102`, schedulers disabled, and email dry-run.
- Unknown API path returned JSON 404.
- Protected unauthenticated workspace API returned JSON 401.
- CORS allowed `https://tradeflowai.in` for backend health.
- Deployed frontend assets matched local release commit files.

Authenticated production isolation/security workflow was not executed because a safe cleanup path for production synthetic signup data was not verified. Local fixture insertion was intentionally rejected as a production-smoke method after the Render backend returned 401 for locally inserted synthetic users, proving the local Mongo connection was not the production backend's active database.

Security decision: NO-GO for controlled pilot based on this production run alone. The deployment is healthy, but production authenticated tenant-isolation and mission-to-email validation still requires either an approved test account with cleanup ability or a protected production-smoke cleanup mechanism.

## Production QA Tenant Security Verification

Date: 2026-07-25

Security posture:

- Permanent QA tenant was created intentionally through normal production authentication/API behavior.
- QA credentials are stored only in ignored local file `.tradeflow-production-qa.local` and were not printed.
- Email mode remained `dry-run`; schedulers remained disabled.
- Reserved/non-deliverable recipient data was used.
- Direct email, WhatsApp, and autonomous execution bypass attempts returned 403.
- Pre-approval email delivery returned 403.
- Approved delivery returned `Dry Run`.

Failure:

- Production smoke failed the console/network gate because two dashboard scripts returned 404 due filename casing mismatch. This is a frontend deployment defect, not an auth/tenant/security bypass.

Cleanup/security impact:

- The CRM lead from the failed run was deleted by exact tenant-scoped API ID.
- Other smoke records remain tagged in the isolated QA tenant because no tenant-scoped delete/archive APIs exist for missions, approvals, approval audit logs, or email deliveries.
- No real customer data was modified.

Decision: NO-GO until the script-casing fix is deployed and the authenticated production QA smoke passes with no serious console/network errors.
