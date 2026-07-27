# Business Verification incident response

This operational procedure requires owner and legal review before public launch. It is not a legal-compliance certification.

1. Disable new verification traffic with `BUSINESS_VERIFICATION_ENABLED=false`.
2. Preserve relevant sanitized audit logs and isolate affected quarantine/clean objects without making them public.
3. Revoke compromised storage/scanner credentials and rotate encryption keys using the documented versioned process.
4. Do not delete material under an active legal or investigation hold.
5. Determine affected verification references, tenants, object audit events, access times, and key versions without copying raw identifiers into the incident record.
6. Suspend affected badges server-side when their evidence can no longer be trusted.
7. Validate tenant isolation, signed-URL lifetime, bucket policy, scanner health, and cleanup before re-enabling.
8. Coordinate required notifications and retention decisions with the owner and qualified legal/privacy advisers.

Audit records may be preserved after document deletion, but their metadata must not contain identifiers, object keys, document names, contents, signed URLs, credentials, or scanner secrets.
