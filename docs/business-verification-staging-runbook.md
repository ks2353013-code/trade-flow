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

## Private asynchronous acceptance control plane

The acceptance surface is mounted only at:

`/api/internal/business-verification/staging-acceptance`

It returns the normal JSON API 404 response unless every staging guard is exact:

- `TRADEFLOW_ENVIRONMENT=staging`;
- the database parsed from `MONGO_URI` is exactly
  `tradeflow_verification_staging`;
- Business Verification, the staging E2E confirmation, and the separate
  acceptance-control enable flag are all explicitly true;
- email remains Dry Run and every scheduler, WhatsApp, and autonomous flag
  remains disabled;
- no SMTP/email credential is present, the private bucket is exactly
  `tradeflow-verification-staging`, the storage endpoint is an HTTPS Cloudflare
  R2 account endpoint, public-access blocking is attested, and the scanner is
  the exact private `tradeflow-verification-clamav-staging:3310` service;
- a dedicated, strong acceptance bearer token is configured.

The router is mounted before application CORS, cookie parsing, and body parsing.
It rejects every request carrying an `Origin` header, accepts credentials only
as `Authorization: Bearer ...`, requires HTTPS, uses constant-time token
comparison, and applies process-global request, authentication-failure, and
trigger limits. Cookies, request bodies, query strings, user JWTs, company
headers, forwarded user headers, and alternate control-token headers are never
accepted as control-plane identity.

Keep `BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED=false` and
`BUSINESS_VERIFICATION_STAGING_E2E_CONFIRMED=false` except for an explicitly
approved staging acceptance window. Generate
`BUSINESS_VERIFICATION_ACCEPTANCE_CONTROL_TOKEN` as at least 48 URL-safe random
characters and enter it only in the private staging service dashboard. Never
reuse a JWT, encryption key, storage key, production credential, or human
password. Set the evidence TTL between 300 and 3600 seconds; the default is 900.

The authenticated server-to-server flow is:

1. `POST .../runs` returns HTTP 202, a cryptographically random run ID, and a
   polling `Location`. Only one child runner can be active; a second run is
   rejected.
2. `GET .../runs/{runId}` returns status and evidence expiry metadata.
3. `GET .../runs/{runId}/artifact` returns only redacted PASS/FAIL evidence.
   Raw IDs, object keys, credentials, URIs, identity tokens, and sensitive
   business fields are not present.
4. `POST .../runs/{runId}/verify-zero-residue` independently re-queries the
   exact staging Mongo connection and private R2 bucket. It does not trust the
   runner's PASS/FAIL result.
5. `DELETE .../runs/{runId}/evidence` immediately removes in-memory evidence
   and the exact cleanup ledger. Terminal evidence is also removed
   automatically at the short TTL.

The child runner receives its exact cleanup ledger only through private process
IPC. Child stdout and stderr are drained without being written to application
logs. The saved JSON evidence is redacted, written mode `0600`, ingested into
memory, and immediately unlinked.

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
npm run test:verification:acceptance-control
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
ephemeral process-private run ledger. Never use a broad deletion, prefix
deletion, or production credentials.

The live acceptance runner is intentionally not runnable until the isolated
services and private owner-entered staging values exist. It generates its own
synthetic exporter, importer, trading-company, and Master Admin identities; it
does not accept customer identity input. It exercises PDF, PNG, and JPEG
quarantine-to-Clean scanning, harmless antivirus-signature rejection,
submission, duplicate handling, review queue, information request, versioned
resubmission, approval, rejection, expiry, badge disclaimer and invalid-status
denial, tenant isolation, non-master denial, immutable review history, masking,
and exact cleanup.

Cleanup deletes only exact ledger IDs and object keys. The separate residue
endpoint then queries each relevant collection and independently lists R2 to
prove the isolated acceptance bucket has zero objects. Preserve only the
redacted pass/fail artifact.

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
