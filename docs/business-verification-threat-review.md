# Business Verification threat review

Review completed against all changed and untracked files before the local commit.

Material findings corrected:

- Replaced deterministic development encryption and shared encryption/hash material with separate versioned keys.
- Added authenticated decrypt/tamper checks and previous-key rotation support.
- Replaced 40-bit ObjectId-derived badge references with random 128-bit references.
- Removed tenant-visible duplicate risk flags to prevent identifier enumeration.
- Replaced fail-open `Unavailable` scanning with Pending/Clean/Infected/Error and quarantine enforcement.
- Added production feature, storage, encryption, hash, scanner, startup, and readiness fail-closed gates.
- Replaced local-only storage assumptions with explicit development local and production S3-compatible private adapters.
- Added private-bucket/TLS/server-side-encryption checks and bounded signed downloads.
- Changed document responses from inline to attachment.
- Added polyglot/executable prefix rejection in addition to MIME/signature/size validation.
- Corrected replacement/deletion ordering with explicit cleanup states instead of silent orphaning.
- Added deletion locks, legal-hold handling, Dry Run retention hooks, and sanitized audit preservation.
- Tightened audit identity so headers and request bodies cannot select audit ownership.

Controls confirmed:

- Tenant ownership comes from verified JWT/tenant middleware.
- Company IDs and owner emails from request input are removed or ignored.
- Master Admin review routes use server-side canonical-role middleware.
- Application field updates use allowlists; status transitions use explicit transition maps.
- Mongo filters receive normalized scalar values rather than request objects.
- Quarantined/non-clean documents cannot be viewed or signed.
- Active public badges require backend Verified status and a future validity date.
- Local storage cannot activate in production.
- Document bytes, plaintext identifiers, credentials, object keys, and signed URLs are not logged.

Residual items requiring staging infrastructure:

- Prove bucket public-access policy and signed-URL expiry against the selected provider.
- Prove private ClamAV health, infected-file handling, timeout behavior, and network isolation.
- Run exact synthetic object/database cleanup in the separate staging account.
- Obtain owner/legal approval for retention periods and incident-response obligations.
