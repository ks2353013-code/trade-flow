# Business Verification Production Readiness Gate

## Status

**NOT AUTHORIZED FOR REAL DOCUMENTS until every mandatory gate below is evidenced as PASS.**

The synthetic staging acceptance gate passed on commit `cb2470ab8ca0354e4e47956fec088a2876ac61c0`. This document defines the separate production boundary. It does not authorize deployment or activation.

## Non-negotiable safety state

Until final production approval:

- Business Verification real-document intake remains disabled.
- Email remains dry-run.
- Schedulers, WhatsApp, calls, and autonomous execution remain disabled.
- Staging credentials, databases, keys, buckets, scanner services, and control tokens must never be reused in production.
- No secret may be committed, printed, copied into chat, or included in screenshots.
- No production customer record or document may be used for acceptance testing.

## Gate 1 — isolated production resources

Required evidence:

- dedicated production Mongo database and least-privilege application user
- production database name explicitly allowlisted by startup/readiness validation
- production-equivalent/staging database mix-ups rejected
- private S3-compatible production bucket with public access blocked
- separate private ClamAV service reachable only from the backend
- independent production backend service identity
- backups, point-in-time recovery, and restoration procedure verified

Decision: **BLOCKED until privately provisioned and verified.**

## Gate 2 — production-only cryptographic material

Required private configuration:

- dedicated Business Verification encryption key
- separate identifier-hash/HMAC key
- explicit active key version
- documented rotation and rollback procedure
- encrypted backup and recovery controls
- no staging key or shared application secret reuse

Evidence must report only readiness booleans and key-version labels, never key values.

Decision: **BLOCKED until privately configured.**

## Gate 3 — storage and malware controls

Required evidence:

- uploads enter quarantine first
- PDF, PNG, and JPEG signature validation
- size and path-containment enforcement
- scanner clean result required before promotion
- pending, infected, timeout, unavailable, and error states fail closed
- anonymous bucket access denied
- signed URL expiry and authorization verified
- replacement and deletion remove exact private objects
- retention and legal-hold behavior verified
- object inventory proves zero synthetic residue after acceptance

Decision: **BLOCKED until production-equivalent acceptance passes.**

## Gate 4 — authorization and privacy

Required evidence:

- tenant identity derives only from verified JWT/database context
- Owner/Admin submission permissions enforced
- Master Admin review authorization enforced server-side
- authenticated non-master review attempt returns safe JSON 403
- cross-tenant reads and writes return safe denial
- public badge exposes only approved fields and the required disclaimer
- identifiers, hashes, object keys, internal notes, document metadata, and owner contact data remain redacted
- immutable review history and audit trail verified
- access logging excludes secrets and document contents

Decision: **BLOCKED until focused production-security tests pass.**

## Gate 5 — legal, retention, and incident response

Owner approval required for:

- lawful basis and customer consent language
- document retention duration
- deletion and legal-hold policy
- data-processing and subprocessor disclosures
- breach response contacts and escalation timing
- customer export/deletion request procedure
- verified badge wording and limitation-of-liability disclaimer

Decision: **BLOCKED pending legal/privacy approval.**

## Gate 6 — dependency and operational review

Required evidence:

- production dependency audit reviewed
- remaining Nodemailer advisory explicitly accepted or remediated
- live email remains disabled during verification pilot
- monitoring covers backend health, readiness, scanner failures, storage failures, authorization denials, and cleanup failures
- alerting and rollback are tested
- deployment health check uses configuration-only `/api/health`
- deep `/api/ready` remains bounded and fail-closed

Decision: **BLOCKED until review is signed off.**

## Gate 7 — controlled production-equivalent acceptance

Use synthetic documents only.

Required cycle:

1. disabled-first deployment
2. sanitized health/readiness evidence
3. temporary strong control token entered privately
4. exact Exporter, Importer, and Trading Company workflows
5. duplicate, request-information, resubmission, approval, rejection, suspension, expiry, badge, audit, and authorization checks
6. exact cleanup of run-scoped Mongo records and private objects
7. independent zero-residue verification
8. immediate disablement and token removal
9. final disabled-state verification

Any failed or unverifiable assertion is a NO-GO. Never infer success from empty output, healthy endpoints, or partial step completion.

## Initial rollout after all gates pass

- maximum 1–2 approved pilot companies for verification
- explicit written consent and named support contact
- low document volume
- manual Master Admin review only
- no automatic verification decisions
- daily access/audit review
- weekly cleanup and storage inventory review
- immediate suspension on scanner, storage, isolation, or redaction failure

Expansion beyond 1–2 companies requires a separate review.

## Final approval record

The production gate can be marked PASS only when the evidence package records:

- exact reviewed commit
- exact deployed commit
- health/readiness PASS
- isolated database PASS
- private storage and scanner PASS
- authorization/privacy PASS
- legal/retention approval PASS
- dependency/operations review PASS
- synthetic acceptance PASS
- independent cleanup PASS
- disabled post-test state PASS
- named owner approval and date

Until then:

**SAFE TO PREPARE: YES**  
**SAFE TO DEPLOY/ENABLE: NO**  
**SAFE TO ACCEPT REAL DOCUMENTS: NO**

## Read-only infrastructure audit — 2026-07-30

This audit inspected only visible configuration and sanitized health/readiness evidence. No deployment,
environment change, secret reveal, customer record, object, or document was accessed.

### Existing evidence

- Render has one existing production web service, `trade-flow`, on the Free plan and linked to `main`.
- The existing production service returns JSON HTTP 200 from `/api/health` and `/api/ready`.
- Its sanitized responses report `environment=production`, schedulers disabled, and email dry-run.
- The existing production service has no configured Render health-check path.
- Its Render auto-deploy setting is On Commit; it was not changed during this audit.
- Cloudflare R2 is authenticated and currently lists only `tradeflow-verification-staging`.
- R2 account usage shown during the audit was $0.00 for the current billing period.
- MongoDB Atlas was signed out, so database names, users, network policy, backup policy, and isolation
  could not be independently verified.

### Missing production-isolated resources

- dedicated `tradeflow-verification-backend-production` service
- private `tradeflow-verification-clamav-production` service
- private `tradeflow-verification-production` R2 bucket and production-only credentials
- independently verified `tradeflow_verification_production` Mongo database
- independently verified least-privilege production-only Mongo application user
- verified Atlas backup, point-in-time recovery, restore procedure, and network restrictions
- production-only encryption and duplicate-hash keys
- disabled-first production readiness evidence from the reviewed production branch

### Prepared deployment package

`deploy/production/render.production.yaml` is review-only and defines exactly two new services:

- Starter backend: $7/month
- Standard private ClamAV: $25/month

Expected fixed Render increase: **$32/month**. R2 and Atlas charges, if any, remain usage/account-plan
dependent and require owner review before provisioning. The Blueprint keeps auto-deploy off, uses
`/api/health`, keeps Business Verification disabled, keeps email dry-run, disables every external
automation category, excludes the staging acceptance token, and rejects staging database, bucket,
scanner, and Mongo-principal reuse.

### Owner-only gates

1. Approve the exact $32/month fixed Render increase before any Blueprint synchronization.
2. Sign in to Atlas and privately create or verify the dedicated database and least-privilege user.
3. Create the production R2 bucket and scoped credentials privately; never reuse staging credentials.
4. Enter production-only secrets directly in provider UIs.
5. Run the static production package validation and review the proposed Blueprint diff.
6. Stop before the external deployment confirmation for a separate disabled-first deployment decision.
