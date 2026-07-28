# Business Verification staging runbook

This package prepares, but does not create, external infrastructure. Applying the
Render blueprint or provisioning storage may incur cost and requires explicit
owner approval. Never reuse production environment groups, databases, users,
buckets, keys, documents, or customer records.

## Topology

- `tradeflow-verification-frontend-staging`: static staging UI with an explicit
  HTTPS staging API origin generated at build time.
- `tradeflow-verification-backend-staging`: isolated Node backend.
- `tradeflow_verification_staging`: separate Mongo database and restricted user.
- `tradeflow-verification-staging`: private S3-compatible bucket.
- `tradeflow-verification-clamav-staging`: private-network-only ClamAV service.

Data flow:

`upload -> signature/size validation -> opaque quarantine object -> private
ClamAV INSTREAM scan -> clean state -> authorized Master Admin review ->
retention or exact deletion`

The backend never needs browser CORS access to the bucket. Do not configure
bucket CORS unless a later reviewed design genuinely requires it.

## Owner dashboard boundary

1. Create a separate staging Mongo project/cluster or database. Create
   `tradeflow_verification_staging` and a staging-only user with `readWrite` on
   that database only. Restrict network access to the staging backend. Do not
   place a production URI in the staging dashboard.
2. Create `tradeflow-verification-staging`. Apply
   `s3-public-access-block.json`, the TLS-deny bucket policy, and the
   least-privilege service policy. Disable object ACLs where supported.
3. Verify anonymous `HEAD` and `GET` requests receive access denial before
   setting `BUSINESS_VERIFICATION_S3_PUBLIC_ACCESS_BLOCKED=true`.
4. Review and explicitly approve any paid Render services. Apply
   `render.staging.yaml` only after that approval. The scanner must be a private
   service with no public route.
5. Enter every `sync: false` value directly in the appropriate staging
   dashboard. Do not use a production environment group.

The environment template contains names only. SMTP variables must remain absent.
Keep all scheduler, WhatsApp, and autonomous-execution flags false.

## Private key generation

Run each command separately on the owner's workstation. Each command copies a
new 32-byte base64 value directly to the clipboard and prints nothing:

```powershell
node -e "require('child_process').spawnSync('clip.exe',{input:require('crypto').randomBytes(32).toString('base64')})"
```

Paste the first value directly into
`BUSINESS_VERIFICATION_ENCRYPTION_KEY`, clear the clipboard, run again, and
paste the different second value into `BUSINESS_VERIFICATION_HASH_KEY`. Set a
non-secret staging-only version label such as `staging-2026-01`. Store recovery
copies only in the approved owner secret manager.

For encryption rotation, retain the old key under its old version in
`BUSINESS_VERIFICATION_PREVIOUS_ENCRYPTION_KEYS`, add a new current key, change
the version label, verify old ciphertext in staging, and re-encrypt through an
audited maintenance operation. Hash-key rotation requires controlled decrypt
and rehash; never replace it without migrating hashes.

## Validation commands

From `backend`:

```powershell
npm run verification:staging-package
npm run verification:staging-readiness
```

Readiness must show staging, connected isolated Mongo, configured keys, S3
private/durable storage, signed URLs, private scanner, email Dry Run, and
schedulers disabled. The response must never contain URIs or secret values.

Before acceptance, also prove:

- staging credentials cannot access the production database;
- anonymous bucket access is denied;
- local storage and missing scanner configurations fail readiness;
- signed access expires within the configured 30–120 second window.

## Synthetic acceptance and cleanup

Use only generated PDF, PNG, JPEG, malformed, oversized, traversal-name, and
standard harmless antivirus test fixtures. Record the exact synthetic user,
company, workspace, verification, notification, and object identifiers in an
ignored local run ledger. Never use a broad query, prefix deletion, or production
credentials.

The acceptance suite is intentionally not runnable until the isolated services,
staging test identities, and private owner-entered secrets exist. After they
exist, extend the staging Playwright project to use those identities from an
ignored local credential file and execute every case in the acceptance
checklist. Cleanup must delete only the exact ledger IDs and object keys, then
query each collection and both `quarantine/` and `clean/` keys to prove zero
matches. Preserve only non-sensitive pass/fail summaries.

## Rollback

1. Set `BUSINESS_VERIFICATION_ENABLED=false` on the staging backend.
2. Confirm verification APIs return a safe 503 and readiness reports disabled.
3. Preserve the private bucket and database while investigating unless the
   exact synthetic cleanup ledger has been verified.
4. Roll back only the staging service version. Never change production.
5. Rotate staging credentials if exposure is suspected; invalidate signed
   access and review access logs.
6. Remove the staging resources only after exact synthetic cleanup and owner
   confirmation.

This runbook is operational guidance, not a legal or compliance certification.

## Temporary HTTPS staging acceptance control plane

This implementation adds an asynchronous, backend-internal control plane solely to
replace an unreliable interactive shell. It is **not** a production API and this
implementation change does not establish a live-staging PASS. Never upload a real
company document, use a customer tenant, or enable the API against production.

### Activation, fail-closed startup, and shutdown

The router is constructed only when `NODE_ENV=staging`,
`BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED=true`, and a control token of at
least 32 UTF-8 bytes exists. Before listening, the backend additionally proves that
the connected database is exactly `tradeflow_verification_staging` and performs
live private-storage and private fail-closed scanner readiness checks. Enabling the
flag with `NODE_ENV=production` fails startup. A missing/short token, wrong database,
or failed readiness check also fails startup. When not in the exact configuration,
the entire namespace returns the same JSON 404 as an absent API.

The only new private Render variable names are:

- `BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED`
- `STAGING_ACCEPTANCE_CONTROL_TOKEN`

The bearer value must be generated and stored through the approved private secret
manager and Render dashboard; never print it, place it in a command history, source
file, ticket, chat, or evidence artifact. The API rejects cookies, JWT/session
identity, alternate identity headers, browser-origin requests, malformed bearer
syntax, and wrong bearer values. Comparison is constant-time, requests are tightly
rate limited and size limited, and responses use `no-store`. Errors are generic.

### Lifecycle and retained evidence

`POST /api/internal/staging-acceptance/runs` returns 202 and a random opaque run ID,
then invokes the existing runner in-process without shell command construction. A
second active run receives 409. `GET .../runs/:runId` polls its state and
`GET .../runs/:runId/artifact` returns 409 until terminal. Evidence is recursively
allowlisted/redacted and retained in the isolated `staging_acceptance_evidence`
collection for at most 24 hours using a Mongo TTL index. Expired and explicitly
deleted runs return 404. `DELETE .../runs/:runId` deletes that evidence row only; it
cannot delete verification, tenant, audit, notification, or object-storage data.

After execution, `POST .../runs/:runId/verify-cleanup` performs new bounded Mongo
queries for every synthetic ID retained only in bounded process memory and new
private-object HEAD queries for every exact object in that server-private cleanup
scope. It never copies the runner's
counts. Missing scope, query errors, timeout/unavailability, a remaining record or
object, or inability to distinguish not-found changes the final decision to FAIL and
persists the redacted independent result. The private scope is never written to the
evidence collection or returned by an endpoint; it expires after 24 hours and is
removed immediately by evidence deletion. A process restart makes independent proof
fail closed rather than persisting sensitive identifiers or object keys.

### Manual staging procedure (do not perform from this implementation task)

1. Review and deploy this commit manually to the **staging backend only**, with
   auto-deploy disabled. Confirm the tested commit in build metadata. Do not select
   or deploy `main` and do not change any service tier.
2. Leave schedulers, WhatsApp, autonomous execution, and external actions disabled;
   leave email in Dry Run. Confirm the isolated database, private bucket, and private
   ClamAV service independently.
3. In the private dashboard, set the two variables named above (flag exactly `true`;
   strong newly generated staging-only bearer token). Never paste the value into a
   terminal command. Manually deploy the reviewed staging commit.
4. Confirm `/api/ready` is HTTP 200 and reports only `stagingAcceptance.enabled` and
   `stagingAcceptance.ready` booleans. Any 503 is a stop condition.
5. Using a secret-aware HTTPS client that obtains the bearer from its secret store,
   send `POST /api/internal/staging-acceptance/runs` with an empty body and the sole
   identity header `Authorization: Bearer <private value>`. Record only the returned
   opaque run ID.
6. Poll `GET /api/internal/staging-acceptance/runs/<runId>` until a terminal state.
   Retrieve `GET .../<runId>/artifact`; verify the commit, all three synthetic company
   matrices, every mandatory step, runner cleanup counts, failure reasons, and final
   decision. A skipped/unproven step or empty evidence is FAIL.
7. Send `POST .../<runId>/verify-cleanup`. Require fresh exact zero counts for every
   collection and private object. Retrieve the artifact again and confirm its
   independent-cleanup section is PASS. Never infer zero from a healthy endpoint.
8. Preserve the approved redacted artifact outside the service only under the audit
   retention policy. Send `DELETE .../<runId>`, then confirm both status and artifact
   URLs return JSON 404.
9. Set `BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED=false`, manually redeploy the
   same staging commit, and verify all five acceptance route shapes return JSON 404
   even with the former bearer. Remove/rotate the staging token in the private
   dashboard. Keep all automation disabled.
10. To roll back, select the preceding known-good **staging** deploy manually, keep
    the flag false, verify JSON 404 and ordinary readiness, and investigate without
    deleting application data. Never roll back, merge, or deploy production/main as
    part of this procedure.

Live execution, private S3/ClamAV checks, staging Mongo cleanup proof, and Playwright
against the deployed staging origin are intentionally deferred until owner-approved
manual staging deployment and private variables exist.
