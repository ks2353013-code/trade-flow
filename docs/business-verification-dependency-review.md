# Business Verification dependency review

The official npm registry audit was run on 2026-07-27.

Safe direct upgrades applied:

- AWS S3 SDK packages upgraded to `3.1095.0`, removing the older SDK/`fast-xml-parser` critical path.
- `axios` upgraded to `1.18.0`.
- `mongoose` upgraded to `8.24.1` without taking the breaking major release.
- `multer` upgraded to `2.2.0` to address the published upload cleanup, recursion, and resource-exhaustion advisories.

After a non-forced `npm audit fix`, the official registry reports one remaining high advisory: `nodemailer <=9.0.0` (`GHSA-p6gq-j5cr-w38f`). The automatic remedy installs the breaking `nodemailer@9.0.3`, so it was not forced into this change. TradeFlow email remains Dry Run, and the current sender does not accept message-level `raw`, file, or URL attachment options from the verification module. This reduces current reachability but does not close the advisory. A separate Nodemailer 9 compatibility upgrade and email regression must pass before live email can ever be enabled.
