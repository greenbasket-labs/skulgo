# SkulGo Roadmap

**Current production branch:** `main`  
**Latest deployed commit:** `854c0ed`  
**Production:** Render Live at `https://skulgo.com`  
**Purpose:** lightweight, connected school operating record tool for Nigerian schools.

## Product direction

SkulGo should feel like a **digital school record book with wiring**.

The product stays small, but it is **not feature-frozen**. New work is allowed when real school use exposes a clear gap, friction, missing duty, or important failure.

The rule is:

> **Solve real school problems, then add the smallest useful piece that solves them.**

Reject speculative features, duplicate systems, and large subsystems built only because they might be useful someday.

Every new piece should:
- solve a real school duty or user problem;
- connect to existing school records where possible;
- preserve role-based access and school isolation;
- work with the shared offline-first architecture where the duty needs offline operation;
- leave a clean extension point for later growth;
- be small enough to test independently.

## Core record model

**People → Classes → Subjects → Attendance → Scores → Results → Fees**

Enter a school record once. Authorized users see the same underlying record through their role-specific workspace.

Do not create separate copies of attendance, scores, results, fees or payments for different roles.

## Current MVP — IMPLEMENTED

- Personal SkulGo account.
- Separate school workspace and school membership.
- Multiple school connections per personal account.
- Role-based workspaces: Admin, Teacher, Student, Parent, Cashier.
- School creation with basic Nigerian school structure.
- Student admission request and Admin approval.
- Automatic Student Admission ID.
- Teacher job request and Admin approval.
- Automatic Teacher ID.
- Cashier job request and approval.
- Parent → child request using Admission ID and Admin approval.
- Sections workspace.
- Starter class structure with optional class arms.
- Nigerian starter subject catalog.
- Teacher → class + subject assignment.
- Class-master responsibility.
- Attendance for assigned teacher/class.
- Shared fee/payment records.
- CA + Exam assessment entry.
- Teacher score entry restricted to assigned class/subject.
- Result generation from saved assessments.
- Admin result publishing.
- Student/Parent visibility restricted to published results.
- Role-scoped API protections for the tested workflows.
- Shared offline queue and local record cache.
- Offline Attendance → reconnect → server verification.
- Offline Scores → reconnect → server verification.
- Offline Payment → reconnect → server verification.
- Offline teacher/student/attendance/score workspace restoration.
- PWA/service-worker app-shell work in progress for reliable offline navigation.

## Current engineering hardening

The current `feat/offline-first-core` branch is focused on strengthening the existing architecture rather than rebuilding SkulGo.

Current hardening includes:
- active-user + active-school scoping for offline cached records and queued actions;
- safe replay of offline writes with server-side permission revalidation;
- last-write-wins coalescing for supported offline records;
- safer sync stopping behavior when connectivity fails;
- cached teacher workspace restoration;
- role-scoped attendance, assessment and result access;
- published-result enforcement for students/parents;
- production `SESSION_SECRET` requirement;
- real custom-section support;
- centralized Nigerian starter class catalog;
- continued use of the lightweight PWA/service-worker approach.

**Current status:** Offline-first core was merged through PR #2, then promoted to `main` through PR #3. The resulting `main` merge commit is `4814d22`. Subsequent small Admin/account changes have been committed directly to `main`; each must be verified before the next role is started.

### Sidebar / navigation UX

Preserve the clean workspace pattern already used in SkulGo:

**compact left sidebar → role-scoped navigation → clean dashboard**

Use the existing `lib/workspace-nav.ts` as the single role-navigation source. Future UI work should improve grouping, active states, responsive behavior and visual clarity without duplicating navigation definitions or moving every action onto the dashboard.

A useful reference is the compact operational sidebar pattern seen in products such as Resend. This is a **design principle, not a request to copy Resend's branding or exact UI**.

The sidebar should:
- keep role navigation visible and predictable;
- use short, familiar labels;
- group links only when grouping improves scanning;
- show only actions available to the current role;
- keep Account/profile actions separate from daily school work;
- remain lightweight on mobile;
- avoid speculative links and unnecessary badges.

**Guiding rule:** navigation carries complexity; the dashboard carries the work.

## Roadmap principle

The roadmap is a **decision framework, not a feature-factory checklist**.

When real school use reveals a problem, classify the need first:

### A. Fix an existing flow
Examples:
- a teacher cannot complete attendance easily;
- a parent cannot find the child's actual record;
- Admin has to enter the same information twice;
- offline work is lost or does not reconcile correctly;
- an authorized role sees the wrong record.

Fix this before adding a new module.

### B. Extend an existing record
Examples:
- a missing field on an existing school record;
- a new role needs authorized visibility into an existing record;
- an existing workflow needs a small action such as approval, correction, export or print.

Prefer wiring existing data over creating a parallel subsystem.

### C. Add a small new capability
Add it when school testing demonstrates a real need.

The new capability should have:
- one clear school duty;
- a narrow workspace;
- clear role ownership;
- a simple data model;
- shared offline behavior when required;
- a testable API and UI boundary.

### D. Add a new module
A larger module should exist only when repeated real school use shows that the smaller approaches are insufficient.

A module must still fit the connected school-record model and should be introduced incrementally.

## Before first real school pilot

### 1. Finish reliable offline-first navigation and recovery

The shared offline queue already proves important offline writes. The remaining platform work is to make a loaded workspace reliably usable through temporary internet loss.

Target behavior:

**Load workspace → internet drops → continue work → save locally → reconnect → reconcile → server revalidates**

Finish:
- reliable app-shell/navigation caching for normal school routes;
- cached identity/workspace restoration;
- cached read records for frequently used pilot duties;
- deterministic offline write queues for supported writes;
- clear pending/sync state;
- safe retry/reconciliation;
- duplicate protection for repeated sync;
- no module-specific offline engines.

Start with the actual pilot routes. Do not attempt to make every possible route offline before the core school work is reliable.

### 2. Close real pilot usability gaps in the core flow

Verify that a school can operate the full basic loop without unnecessary friction:

**Admin → structure → approve people → assign duties → teacher records → results → fees → student/parent visibility**

Examples of gaps to check:
- missing role workspace needed to perform an already-defined duty;
- navigation links that lead to missing screens;
- confusing approval states;
- missing empty/loading/error states;
- record correction paths;
- practical print/download needs for school records;
- school setup steps that force duplicate entry.

Only implement a gap after confirming it exists in the actual code or pilot workflow.

### 3. Production data and deployment

For real school data:
- use the chosen production PostgreSQL setup;
- apply production-safe Prisma migrations;
- verify environment variables and secrets;
- verify database connectivity;
- verify HTTPS and domain;
- verify startup/health checks;
- run critical smoke tests against deployed infrastructure.

### 4. Production security and tenant isolation pass

Review every API and mutation for:
- authentication;
- active school membership;
- role permissions;
- object-level access;
- tenant isolation;
- safe offline replay;
- idempotency / duplicate protection where sync can repeat;
- audit logging for important school changes.

Use the existing Attendance / Assessment / Result permission model as the baseline.

### 5. Backup and recovery

Before real school data:
- automatic database backups;
- documented restore procedure;
- at least one successful restore test.

### 6. Small subscription layer

The commercial model can remain simple:
- school subscription record;
- monthly / per-term / yearly option;
- trial / active / expired state;
- owner/admin visibility;
- simple access rule for expired schools.

Do not turn subscription work into a large billing platform until real commercial operations require it.

## First pilot

The first pilot should use a real school workflow, not a large feature list.

### Admin
Finish school structure → approve people → assign duties → verify the complete Admin navigation/workflow before moving to the next role.

### Teacher
Open assigned class/subject → record attendance → record CA/exam scores → continue during temporary internet loss.

### Student
See own class, attendance, subjects, published results and fees/balance.

### Parent
See approved children and their attendance, published results and fees/payments.

### Cashier
Record school payments and view outstanding balances.

The pilot role sequence is deliberately:

**Admin → Teacher → Student → Parent → Cashier**

Each role is completed and tested before the next role begins.

### Pilot evidence to collect

Track:
- where staff still use paper because SkulGo is slower;
- where users repeat the same data;
- where a record is missing or difficult to find;
- where offline use fails;
- where approval/assignment is confusing;
- what schools explicitly request;
- which requested feature solves an actual recurring duty.

This evidence becomes the input to the next roadmap cycle.

## Post-pilot development

After pilot use, work in this order:

### First: repair
Fix failures, missing links, permission gaps, offline problems and confusing workflows.

### Second: wire
Connect existing records to another authorized role without duplicating the underlying data.

### Third: extend
Add small capabilities proven necessary by actual school use.

### Fourth: modularize
Only when repeated use justifies a distinct module.

Possible examples, **only when validated by real use**:
- lightweight announcements/school messages;
- result print/download/share;
- optional result-view payment;
- subscription/payment automation;
- additional offline coverage;
- small reports or exports needed by schools.

These are candidates, not promises.

## Explicit non-goals for the current product direction

Do not build these merely to make SkulGo look bigger:

- payroll;
- salary management;
- inventory;
- hostel management;
- transport management;
- library management;
- biometric systems;
- full accounting;
- CRM;
- marketplace;
- school website builder;
- AI tutor;
- AI grading;
- complex chat/social features;
- large notification infrastructure;
- advanced analytics;
- timetable engine;
- exam-hall management;
- multi-provider payment framework;
- large subscription billing engine.

A real pilot can change this list later if evidence shows a genuine school problem that cannot be solved reasonably through the existing model.

## Developer / AI execution rules

A new developer or coding AI should continue from the repository state, not redesign SkulGo from scratch.

Before each change:
1. inspect the relevant existing code;
2. identify the existing record, API and workspace involved;
3. verify the role and school-tenant boundary;
4. check whether the problem can be solved by wiring existing data;
5. choose the smallest useful implementation;
6. preserve room for extension;
7. add focused tests;
8. commit only the intended files;
9. report the exact result.

Do not:
- overwrite local work;
- reset or stash user changes without instruction;
- duplicate an existing data model;
- create a second offline engine;
- hardcode a temporary solution when a small extensible model will work;
- build speculative features solely for future possibilities.

When a requirement is unclear, inspect the code and existing workflow first. Do not silently invent a new product direction.

## Result / Report Card checkpoint — September 25, 2026

This is a narrow completion checkpoint. Do not expand SkulGo into a large school ERP.

### Result publishing

**Status: WORKING**

- Teacher saves CA + Exam scores.
- Result records are generated.
- Admin publishes results.
- Student/Parent visibility is restricted to published results.

### Result Unlock

**Status: NOT FINISHED**

The intended default behavior remains:

**Admin publishes → Student/Parent sees result-ready notice → result remains locked → SkulGo-controlled unlock flow verifies payment → result/report card becomes viewable/printable/downloadable.**

The result-unlock mechanism belongs to SkulGo. The school-facing settings must **not expose a fixed ₦200 result-unlock price**. Commercial result-unlock pricing will be defined by SkulGo and documented in SkulGo Terms & Conditions. If a future Admin option is provided, it must be optional and must preserve a working default when the Admin does not edit it.

### Report-card design

**Status: 🟡 Design/component exists; complete school workflow is 🔴 NOT FINISHED**

The current report-card generator is connected to school/student/result data, but the complete production workflow still needs verification and completion before it is treated as finished.

Known completion work includes:
- use the school's configured grading bands instead of fixed generator grading logic;
- use the school's report-card settings/fields consistently;
- complete attendance/remarks/summary data wiring where supported by existing records;
- verify print/download behavior;
- verify the published-result and Result Unlock boundary.

### Result Settings

The school-owned Result Settings area should remain small and practical.

Current settings that belong to the school:
- report heading;
- First / Second / Third Term labels;
- grading bands;
- report-card fields;
- attendance session setting;
- digital-result setting.

Default grading bands remain:

**70 A · 60 B · 50 C · 45 D · 40 E · 0 F**

The school may edit the grading bands. If the Admin does not edit them, the default bands remain active.

**Result unlock price is not a school-facing setting.** It belongs to the SkulGo-controlled Result Unlock product flow and SkulGo Terms & Conditions.

### Rule for this checkpoint

Do not change unrelated attendance, fees, approval, authentication or role behavior while finishing Results. Work one small piece at a time, verify it, deploy it, and record the result.

## Current execution checkpoint — September 24, 2026

This checkpoint records the actual next work so development follows the roadmap instead of expanding sideways.

### Completed / in progress

- **Cashier workflow:** cashier identity, cashier dashboard/navigation, student Admission ID payment lookup, cash/manual bank-transfer recording and teller/receipt metadata are implemented in the development history.
- **School result configuration:** school-owned grading bands, report-card settings/fields, term labels and configurable result-unlock price are implemented in the development history.
- **Result Unlock:** the mechanism remains **SkulGo-owned**. The school-facing product should not present a fixed SkulGo result-unlock price as a school setting. Commercial result-unlock pricing belongs in SkulGo terms and conditions; the full payment-gated access flow remains incomplete.
- **Subscription plans:** the initial subscription/payment work is on the separate branch `feat/subscription-plans-payments` and is **not merged into `main`**. It includes Basic ₦2,500, Starter ₦5,000, Pro ₦10,000 and Premium ₦18,000 monthly plans, with Custom handled separately.
- **Paystack:** production integration is prepared in the subscription branch. The Live Secret Key must remain server-side in Render and must never be committed to GitHub.
- **Moniepoint:** manual bank-transfer subscription payment flow is prepared, but the approval model must be reviewed before production use; a school Admin must not be allowed to approve their own subscription payment as the final verification authority.
- **Capacity test:** the load-test runner exists for controlled testing, but no production capacity result has been claimed yet. Capacity must be measured against the actual Render web/database resources before publishing limits or promises.

### Production checkpoint

The Render production service is `skulgo` with custom domain `skulgo.com`.

The latest confirmed **live** deployment is commit `854c0ed`. The dashboard syntax failure that blocked the recent deployment was fixed in `854c0ed`, and Render now reports the service **LIVE** with Next.js starting successfully. The earlier report-card deployment attempts failed during build, so those changes must still be verified on `main` and in production before being treated as complete.

### Immediate execution order

1. **Verify the current live deployment** `854c0ed` with production smoke checks and keep the production branch build healthy.
2. **Verify the report-card/result-settings code on `main`** with a production-safe build and live smoke test before treating it as complete.
3. **Finish the Result Unlock flow**: Admin publishes → Student/Parent sees result-ready state → result remains locked → user pays configured amount → SkulGo verifies payment → result/report card becomes viewable and printable/downloadable.
4. **Finish subscription/payment integration safely** on `feat/subscription-plans-payments`: Paystack Live Secret Key only in Render environment variables; configure and verify Paystack webhook; verify successful transaction server-side; review Moniepoint verification authority; keep Custom outside fixed automatic pricing.
5. **Run the controlled capacity test** against the actual deployed service. Record measured RPS, latency, error rate, web CPU/RAM and Postgres CPU/connections. Do not publish capacity limits from generic estimates.
6. **Complete Admin verification, then continue the role sequence**: **Admin → Teacher → Student → Parent → Cashier → cross-role pilot**.

### Newly confirmed roadmap items

### Personal identity / school history — foundation added

The Personal Profile now begins to act as a **long-term record of the person's SkulGo school journey**, without becoming a full CV system.

Current foundation:

- one personal `User` identity can connect to multiple schools;
- `SchoolMembership` records role and relationship start;
- ended school relationships retain `endedAt` and `endReason`;
- Admin can end active staff school access with a simple leaving reason;
- ended access remains visible as history in the Personal Profile;
- ending access does not delete the person's identity or historical school relationship.

Future direction, only when justified by real use:

- promotion/history records;
- richer professional profile/CV data;
- other career-history details.

These are **not** being built now.



These are intentionally small platform capabilities, not a move toward a large ERP:

- **SkulGo Admin Dashboard:** a lightweight internal SkulGo dashboard showing platform-level facts such as total registered users, total schools, active schools/users, and other simple operational counts that SkulGo itself owns. No large analytics system.
- **Account Referral ID:** every personal SkulGo account should have a unique referral ID. Commission rules will be defined later; do not build a commission engine now.
- **School → SkulGo Support:** add a small Support item to the school's Admin workspace. Admin can submit a title and body to SkulGo. The message should appear in the internal SkulGo Admin Dashboard for follow-up. Keep this as a simple support/contact record, not a chat system.

### Confirmed next implementation sequence

1. **Announcements** — keep/finish the existing lightweight announcement capability only where it is needed in the school workflow.
2. **Subscription** — keep the existing basic school subscription model; billing is not core MVP and should remain small.
3. **Result Unlock** — complete the actual payment-gated result access flow: Admin publishes → Student/Parent sees result-ready state → result remains locked → SkulGo verifies payment → result/report card becomes viewable and printable/downloadable.
4. **Full payment-gated result access** — verify the complete end-to-end payment and access boundary before treating Result Unlock as complete.
5. **SkulGo internal Admin Dashboard** — small platform overview only.
6. **Unique referral ID per personal account** — ID first; commission definition later.
7. **School Admin Support → SkulGo Admin** — simple title/body submission and internal visibility.

### Safety rule for this checkpoint

Do not expose or commit payment secrets. Do not merge the subscription branch automatically. Do not declare a feature production-ready until the deployed commit and live behavior have been verified.


## Current delivery sequence

The immediate development sequence is **role-by-role**, with testing after each role.

### Phase 1 — Finish and verify Admin

Complete the Admin workspace and verify every Admin navigation item works against the existing APIs and records:

**Dashboard → Applications → Staff → Sections → Classes → Subjects → Assign → Fees → Announcements → My Account**

Do not move to the next role until the Admin flow is usable end-to-end.

Verification should cover:
- correct school workspace selection;
- Admin-only actions;
- approval of people;
- class/subject setup;
- teacher and class-master assignment;
- attendance/results/fees visibility where Admin is expected to see them;
- empty/loading/error states;
- offline behavior for duties that already support offline operation;
- no dead Admin navigation links.

### Phase 2 — Teacher

Build and verify the Teacher workspace one piece at a time using the existing records and assignment APIs.

Target flow:

**Personal account → school connection → approved Teacher membership → assigned classes/subjects → attendance/scores → results visibility**

Verify real teacher duties, including class-master versus subject-teacher scope, final score submission behavior, and offline attendance/scores where supported.

Do not add unrelated teacher features just to make the workspace look larger.

### Phase 3 — Student

Build and verify the Student workspace.

Target flow:

**Personal account → admission request → Admin approval → class/admission ID → own records**

Verify:
- own class and subjects;
- attendance visibility;
- published results visibility;
- fees/payment visibility;
- correct restriction from other students' records;
- offline read restoration where supported.

### Phase 4 — Parent

Build and verify the Parent workspace.

Target flow:

**Personal account → child request using Admission ID → Admin approval → approved child connection → child records**

Verify:
- only approved children are visible;
- attendance;
- published results;
- fees/payments;
- cached/offline restoration where supported.

### Phase 5 — Cashier

Build and verify the Cashier workspace.

Target flow:

**Personal account → job request → Admin approval → school fees workspace → record payment → outstanding balance**

Verify:
- cashier-only payment actions;
- correct school isolation;
- shared payment records;
- offline payment queue/reconciliation;
- no access to unrelated Admin/teacher functions.

### Role-by-role test rule

For each role:

**inspect → build smallest useful workspace → test → deploy → live smoke test → record result → then move to next role**

No rush and no simultaneous expansion across all roles.

If real testing reveals a genuine gap, fix that role first before moving forward.

## Current priority order

**1. Finish and verify Admin**  
**2. Build and test Teacher**  
**3. Build and test Student**  
**4. Build and test Parent**  
**5. Build and test Cashier**  
**6. Run a cross-role pilot and fix evidence-backed gaps**  
**7. Harden production security, backups and subscription boundary**  
**8. Repeat: observe → fix → wire → extend → test**

## Handover principle

### Engineering change discipline

Every future fix should follow the same small-change loop:

**inspect → identify evidence → smallest fix → typecheck/test → review diff → focused commit → verify deployment when applicable**

Rules:

- Read the current repository state before editing.
- Preserve existing working behavior.
- Reuse the existing schema/API/page instead of creating duplicate paths.
- Fix the exact reported cause; do not broaden the task without approval.
- Do not perform unrelated refactors or dependency upgrades.
- Do not use destructive Git commands on local work.
- Do not treat a successful commit as proof of a successful deployment.
- Record the commit and verification result in the handover when a change materially affects architecture or workflow.



The codebase should always be understandable to the next developer or AI.

Every meaningful change should leave:
- clear architecture;
- focused tests;
- predictable record ownership;
- explicit role permissions;
- reusable shared offline behavior;
- a small surface area;
- room for the next real school-driven module.

> **SkulGo does not need to be complete. It needs to be useful, connected, reliable and easy to extend.**
