# Replica-Inspired TradeFlow Implementation

This branch applies the Replica clean-room method to TradeFlow itself.

## Implemented

### P0 — Lead Trust Layer
- CRM leads now retain freshness score/status/age.
- CRM leads now retain explainable trade-intent score/status.
- Verification evidence and warnings are stored with the CRM record.
- Mission-created CRM records receive the intelligence snapshot at creation time.
- CRM push records receive the same intelligence snapshot.
- Tenant-safe lead intelligence API:
  - `GET /api/lead-intelligence`
  - `GET /api/lead-intelligence/:leadId`
  - `POST /api/lead-intelligence/:leadId/refresh`

## Scoring model

Trade Intent combines:
- product fit
- target geography
- verification confidence
- data confidence
- freshness
- usable contact detail
- contact seniority when supplied
- activity/intent signals when supplied

The score is explainable and never claims evidence that is not present.

## Safety

- No competitor source code, private API, proprietary asset, or customer data is copied.
- No autonomous outbound communication is introduced.
- Existing tenant isolation and human approval gates remain in force.
- Existing CRM, verification, mission and outreach functionality is preserved.

## Next Replica passes

1. AI research timeline attached to CRM records.
2. Mission-to-revenue event timeline.
3. Smart outreach guardrail audit.
4. Trade negotiation structured terms.
5. Global trade risk decision panel.
6. Larger benchmark/review research across global trade and sales intelligence leaders.
7. Playwright regression and accessibility pass for the new CRM intelligence surfaces.
