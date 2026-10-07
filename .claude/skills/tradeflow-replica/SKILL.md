---
name: tradeflow-replica
description: >
  Applies the Replica methodology to TradeFlow as a clean-room competitive
  intelligence and product-improvement workflow. Use when analyzing a
  competitor, finding product gaps, comparing TradeFlow with another SaaS or
  marketplace, prioritizing features from public user feedback, or running a
  parity/advantage review.
---

# TradeFlow Replica Intelligence

Use the Replica methodology, adapted for TradeFlow.

## Non-negotiable rules

- Study public functionality and public customer feedback.
- Never copy source code, private APIs, credentials, proprietary assets, logos,
  protected copy or customer data.
- Never bypass authentication or paywalls.
- Never scrape at scale or violate a site's terms.
- Treat user reviews as evidence, not testimonials.
- Never invent review counts, quotes, ratings or product capabilities.

## Workflow

1. RECON
   Map the competitor's core jobs, screens, flows, pricing gates, trust signals,
   integrations and visible data model.

2. ENTREPRENEUR
   Collect public complaints and feature requests from multiple sources.
   Rank what users hate, what is missing and what job remains unsolved.

3. TRADEFLOW GAP
   For each finding, classify:
   - match: TradeFlow already handles it
   - gap: TradeFlow should add it
   - differentiator: TradeFlow can do it materially better
   - irrelevant: not strategic for TradeFlow
   - protected/network effect: do not attempt to copy the asset/network

4. ARCHITECTURE FIT
   Map each approved opportunity to the existing TradeFlow modules before
   creating anything new. Prefer extending the current agent/orchestrator,
   CRM, verification, outreach, mission, analytics and permission systems.

5. BUILD PRIORITY
   P0 security/trust/core-flow blockers
   P1 revenue or retention opportunities
   P2 strategic differentiation
   P3 polish

6. TEST
   Add an acceptance test for every approved P0/P1 change.
   Include tenant isolation, authorization, duplicate protection,
   idempotency, error states and Playwright coverage where applicable.

7. PARITY / ADVANTAGE
   Score whether TradeFlow performs the job adequately, then separately score
   whether it provides a reason to switch.

## Output

Maintain:
- replica/recon.md
- replica/features.csv
- replica/feedback.md
- replica/fixes.md
- replica/parity.md

When the task is implementation, create a branch and make minimal-diff changes.
Do not remove existing TradeFlow functionality merely to match a competitor.
