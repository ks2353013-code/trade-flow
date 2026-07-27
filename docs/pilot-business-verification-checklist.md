# Pilot business verification checklist

- Use synthetic test applications for QA and clean them exactly.
- Confirm verified JWT identity, company derivation, tenant isolation, and Owner/Admin permission.
- Confirm employees without Admin permission cannot see document metadata or manage evidence.
- Verify category-specific requirements and structural identifier validation.
- Confirm file size, MIME, signature, private storage, and malware-scan state.
- Resolve duplicate-identifier flags before approval.
- Complete and audit the manual review checklist.
- Confirm approval has reviewer, review record, version, and validity date.
- Confirm public output is masked and disclaimer is present.
- Confirm suspension/expiry or a material-change version removes the badge.
- Confirm sensitive marketplace actions return safe JSON 403 until verified.
- Confirm email remains Dry Run, schedulers remain disabled, and no external automation runs.
- Confirm no uploaded files, credentials, test traces, logs, or synthetic artifacts are staged.
