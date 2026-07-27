# Verification document privacy and retention

Verification documents are private, tenant-scoped records. Only the company Owner/authorized Admin can manage the application; only verified Master Admin reviewers can retrieve document bytes. Public badge APIs never include identifiers, personal information, or files.

Identifiers are normalized, masked for responses, encrypted at rest, and represented by keyed hashes for duplicate detection. Production requires a dedicated 32-byte base64 encryption key and configured private storage. Storage keys are random and paths are never returned.

Uploads are size-, MIME-, and signature-checked and executable content is rejected. A malware-scan integration hook is retained; a document without an available scan is labelled accordingly and requires manual caution.

Default retention hooks identify inactive Draft records after 30 days, Rejected records after 180 days, and Expired records after 365 days. These values are configurable, bounded, and are not activated by a scheduler in this change. A retention sweep defaults to Dry Run. Owner/legal approval is required before activating these defaults.

Company deletion requests are recorded and block further application changes. A verified Master Admin must review the request, any legal/audit hold, and the required exact confirmation before deletion. Deletion first locks the record, then removes every private object, then removes the application. Cleanup failures become explicit error states for operator retry; they do not silently remove database references.

Sanitized audit records are preserved after document/application deletion. They retain actor, timestamps, status/version, and reason category but not identifiers, filenames, object keys, signed URLs, or contents. Backup and bucket lifecycle rules must implement the approved retention decision consistently.
