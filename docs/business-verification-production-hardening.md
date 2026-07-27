# Business Verification production hardening

## Feature activation

Production keeps the module disabled unless `BUSINESS_VERIFICATION_ENABLED=true`. When enabled, startup and readiness fail closed unless versioned encryption, separate duplicate-hash keys, private durable storage, and a private scanner are configured. Existing TradeFlow health can remain available while the disabled module reports its own readiness.

## Private key generation

Generate both values privately on the owner’s workstation. Do not paste their output into chat, source files, tickets, or logs.

```powershell
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))"
```

Run the command separately for `BUSINESS_VERIFICATION_ENCRYPTION_KEY` and `BUSINESS_VERIFICATION_HASH_KEY`, and enter each output directly in the Render staging environment settings. Set `BUSINESS_VERIFICATION_KEY_VERSION` to a non-secret label such as `2026-01`.

Vercel serves the frontend and does not need identifier encryption or storage credentials. Backend secrets belong only in the Render service that processes verification APIs.

## Key rotation

1. Back up and retain the current encryption key in the approved secret manager.
2. Add the prior key to `BUSINESS_VERIFICATION_PREVIOUS_ENCRYPTION_KEYS` as a JSON version-to-key map.
3. Configure a new current encryption key and change `BUSINESS_VERIFICATION_KEY_VERSION`.
4. Keep the hash key stable during encryption-only rotation so duplicate matching remains consistent.
5. Run staging decrypt/re-encrypt tests, then re-encrypt records through an audited maintenance job.
6. Remove an old encryption key only after no ciphertext references its version.
7. Hash-key rotation requires a controlled rehash from decrypted identifiers. Never rotate it by simply changing the environment value.

Ciphertext includes format, key version, unique 96-bit nonce, GCM authentication tag, and ciphertext. Encryption and duplicate-detection keys are separate.

## Required private S3-compatible configuration

- `BUSINESS_VERIFICATION_STORAGE_DRIVER=s3`
- `BUSINESS_VERIFICATION_S3_ENDPOINT` using HTTPS
- `BUSINESS_VERIFICATION_S3_REGION`
- `BUSINESS_VERIFICATION_S3_BUCKET`
- `BUSINESS_VERIFICATION_S3_ACCESS_KEY_ID`
- `BUSINESS_VERIFICATION_S3_SECRET_ACCESS_KEY`
- `BUSINESS_VERIFICATION_S3_FORCE_PATH_STYLE`
- `BUSINESS_VERIFICATION_S3_PUBLIC_ACCESS_BLOCKED=true` only after verifying all four bucket public-access blocks
- Optional `BUSINESS_VERIFICATION_S3_KMS_KEY_ID`; otherwise S3 AES-256 encryption is requested

The bucket must deny public ACLs and policies, require TLS, and limit the service identity to the verification bucket/prefix. Uploads enter an opaque tenant quarantine prefix and are copied into the clean prefix only after scanning.

## Private malware scanner

The production adapter uses ClamAV INSTREAM over a private network:

- `BUSINESS_VERIFICATION_SCANNER_DRIVER=clamav`
- `BUSINESS_VERIFICATION_CLAMAV_HOST`
- `BUSINESS_VERIFICATION_CLAMAV_PORT`
- `BUSINESS_VERIFICATION_SCANNER_TIMEOUT_MS` between 1 and 30 seconds

Do not expose the scanner publicly. Pending, infected, timeout, malformed, and scanner-error results remain unavailable. No third-party upload/scanning service is selected by this implementation.

## Staging

Staging requires a separate database, bucket, keys, and scanner. Set `TRADEFLOW_ENVIRONMENT=staging` and `BUSINESS_VERIFICATION_STAGING_MONGO_CONFIRMED=true` only after confirming the database is not production. Keep email credentials absent and `ENABLE_SCHEDULERS=false`.

Run `npm run verification:staging-readiness` from `backend`. It reports only readiness states, drivers, and key-version labels; it does not print secrets or URIs.
