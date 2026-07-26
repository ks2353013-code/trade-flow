# TradeFlow Controlled Pilot Guide

## Scope

TradeFlow is approved for a controlled pilot with 3-5 selected companies. The pilot remains workspace-first, not marketplace-first. Live email, WhatsApp execution, schedulers, and autonomous execution remain disabled unless separately approved.

## Pilot Onboarding Checklist

1. Create a user account.
2. Verify the account session.
3. Create or confirm the company.
4. Select the business type.
5. Create the first workspace.
6. Confirm the owner dashboard opens.
7. Invite employees only after the workspace is active.
8. Assign employee roles and permissions.
9. Create the first mission.
10. Review buyer and supplier discovery results.
11. Push a verified lead to CRM.
12. Create an outreach draft.
13. Approve the draft.
14. Confirm email delivery remains Dry Run during pilot.

## New-User Startup Guide

Start on signup, complete company and workspace setup, then use Mission Center to create the first trade mission. The expected first success moment is a verified buyer or supplier lead promoted into CRM with a human-approved outreach draft.

## Master Admin Subscription-Approval Guide

New companies should default to the restricted beta plan. Subscription upgrades must be reviewed by Master Admin before activation. Confirm company, workspace, and user identity before changing beta or subscription status.

## Employee Role Guide

Owners and admins may invite employees and assign roles. Employees should only receive the minimum permissions needed for their workflow. Cross-company and cross-workspace access must remain blocked.

## Mission-To-CRM Guide

Use Mission Center to run discovery and verification. Only verified leads should be pushed into CRM. Duplicate CRM pushes should be treated as safe no-op results, not errors.

## Outreach Approval Guide

Outreach drafts are review records, not sent messages. Sending is only available after approval, and pilot email delivery must remain Dry Run. WhatsApp and call actions are disabled.

## Pilot Support And Escalation Guide

Users can submit Report Issue, Request Feature, or Contact Support from the app. Support records include company, workspace, user, category, priority, message, page context, and timestamp. Statuses are Open, In Review, Resolved, and Closed.

## Pilot Monitoring Checklist

- Health endpoint returns JSON 200.
- Ready endpoint returns JSON 200 when Mongo is connected.
- Mongo connectivity remains connected.
- Schedulers remain disabled.
- Email mode remains dry-run.
- Login failures are reviewed daily.
- API 5xx responses are reviewed immediately.
- Unexpected 401/403 spikes are reviewed for auth, plan, or workspace issues.
- Workspace restoration failures are treated as high priority.
- Mission, CRM push, approval, and email dry-run failures are tagged with the affected tenant.
- Support requests are reviewed by Master Admin.

## Known Limitations

- Email delivery is Dry Run during the controlled pilot.
- WhatsApp execution is disabled.
- Call automation is disabled.
- Autonomous execution is disabled.
- Schedulers are disabled.
- Pilot capacity is intentionally limited to 3-5 companies until operational telemetry is stable.
