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
