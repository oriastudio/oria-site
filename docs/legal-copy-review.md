# Legal copy review

Status: Draft for Ivy’s publication approval; do not merge or publish yet.



- User instruction, 2026-11-07: “use whats in the app or draft for me what we need”.
- App source: Oria/Features/Settings/LegalPolicy.swift; app terms' entity, adults-only requirement, responsible-use boundaries, nonwaivable rights and contact reused. App publication dependencies are in docs/legal-review.md.
- Website source: oria-site main 05d26b21e5712e3be7ae86d5addbcbd0ce354ef1, app/api/subscribe/route.ts, components/Waitlist.tsx, lib/rate-limit.ts and app/layout.tsx. The waitlist keeps contacts in a configured Resend segment or emails the signup; no raw-address logging in current source. The in-memory rate-limit window is ten minutes; stale keys are removed on subsequent requests, not a guaranteed timed erase.
- Provider notices checked 2026-11-07: https://resend.com/legal/privacy-policy and https://vercel.com/legal/privacy-notice. They establish providers' published practices, not execution of Oria's account agreements.
- Proposed operational commitments needing Ivy's publication approval: no selling or unrelated marketing; address and associated signup-notification removal by email; retained only while managing the list or for legal/security obligations. No automatic retention deadline, governing law, arbitration, liability waiver, compliance conclusion or paid service promise invented.
- Keep app release/provider-retention verification separate. No change to app behavior, consent versions or production Gateway.
- Claude wording review: one pass completed successfully, Sonnet, $0.0635138. Applied scope clarity, processor/notification detail, removal scope, own-address submission and date/change wording. Kept the verified in-app consent-flow description: pending legal publication is not absence of the implemented flow. Kept the rate-limit description accurate without promising timed deletion of memory entries. No arbitration, liability waiver or legal-sufficiency claim added. Code/security review: not requested yet. Publication: pending reviewed copy and Ivy's approval.
