# SkulGo Developer / AI Handover

## Read this first

SkulGo is intentionally small.

It is not a large all-in-one school ERP. It is a school operating record tool whose main value is keeping school records connected while reducing repeated entry.

**Do not overbuild. Do not merge or copy old App-School/Bridge Hosting code into this repository.**

Before changing code, read:
- README.md
- ROADMAP.md
- prisma/schema.prisma
- the relevant API route
- the relevant E2E test

Then inspect the current main branch.

## Product model

## Personal identity and school history

The `User` record is the person's long-term SkulGo identity.

A person can move through different school stages using the same identity:

**Student → other school → Teacher → other school**, etc.

`SchoolMembership` represents the person's relationship/access to a specific school. It now preserves:

- role;
- start date (`createdAt`);
- active access;
- ended date (`endedAt`);
- leaving reason (`endReason`).

When Admin ends a staff relationship, the system should:

1. close the active school access;
2. record the end date and selected leaving reason;
3. retain the membership history;
4. write the important action to `AuditLog`.

The history belongs to the person's Personal Profile, while school operational records remain owned by the school.

Do not build a full CV, promotion engine, HR system or reference system unless a real pilot need justifies it.



Personal account
→ School connection
→ Role / duty
→ School work

A User is a personal identity.

A School is a separate entity.

A SchoolMembership connects a person to a school and gives that person the role for that school.

A person may belong to more than one school.

Do not move the role back onto the global User model.

## Roles

ADMIN
TEACHER
STUDENT
PARENT
CASHIER

Admin is the school owner/principal/head responsible for school operation.

Role navigation lives in:
lib/workspace-nav.ts

Keep the sidebar small.

## Core record pipe

People
→ Classes
→ Subjects
→ Attendance
→ Scores
→ Results
→ Fees

Keep relationships connected.

Do not create duplicate module-specific versions of the same school record unless a real need is proven.

## Important database models

See prisma/schema.prisma.

Core models:
- User
- School
- SchoolMembership
- SchoolRequest
- Section
- SchoolClass
- Subject
- Teacher
- TeacherAssignment
- Student
- Parent
- ParentStudent
- Attendance
- Assessment
- Result
- FeeRecord
- Payment
- SchoolSubscription

## Authentication and workspace

lib/auth.ts uses a signed HttpOnly session containing:
- user ID;
- selected membership ID;
- expiry.

Login returns a user's available school workspaces.

Selecting a workspace puts the membership ID into the session.

For school-scoped APIs, validate:
1. logged-in user;
2. correct school membership;
3. correct role/duty;
4. correct target record.

## Offline-first architecture

Offline is a product-wide rule, not a payment feature.

Shared implementation:
lib/offline-queue.ts
components/offline-status.tsx

The shared layer currently provides:
- action queue;
- cached-record foundation;
- stable offline POST references;
- automatic sync on the online event;
- visible online/offline status;
- pending sync count.

Proven offline workflows:
- Attendance;
- Scores;
- Payments;
- Cached teacher/student/attendance/score workspace views;
- Cached published results/read records for supported pilot views.

Extend the shared layer. Do not make separate offline engines per module.

The server remains authoritative and must re-check permissions when queued actions replay.

The lightweight service-worker/app-shell foundation is implemented and deployed; the remaining work is to harden reliable offline navigation/recovery across the exact pilot routes rather than expand offline coverage indiscriminately.

## Assessment and Results

Assessment is currently:

CA 0–30
Exam 0–70
Total = CA + Exam

lib/grading.ts contains the current total/grade logic.

Result generation:
- reads saved assessments;
- calculates total/percentage;
- calculates subject position from classmates' assessment totals;
- creates/updates Result;
- starts unpublished.

Publishing is an Admin operation.

Result GET access is scoped:
- Student → own student record;
- Parent → approved ParentStudent links;
- published-only filtering can be required by the caller.

Relevant routes:
- app/api/schools/[schoolId]/assessments/route.ts
- app/api/schools/[schoolId]/results/route.ts
- app/api/schools/[schoolId]/results/publish/route.ts

Relevant pages:
- app/scores/page.tsx
- app/results/page.tsx

## Teacher assignment rule

Teacher work comes from TeacherAssignment.

Teacher score writes are checked against the logged-in teacher's exact:
- school;
- teacher;
- class;
- subject.

Use this object-level pattern for new teacher features.

## Fees and payments

The payment record is shared.

Payment may be recorded by:
- Student for self;
- Parent for approved child;
- Cashier;
- Admin.

Do not create separate ledgers per role.

Payment.reference is unique when present and is used to support idempotent offline POST replay.

## Current important pages/routes

Authentication:
- app/api/auth/login/route.ts
- app/api/auth/logout/route.ts
- app/api/auth/me/route.ts

School/workspace:
- app/api/schools/route.ts
- app/api/schools/search/route.ts
- app/api/workspaces/select/route.ts

Applications:
- app/api/school-requests/route.ts
- app/api/schools/[schoolId]/requests/[requestId]/route.ts

Structure:
- sections;
- classes;
- subjects;
- assignments.

Daily records:
- attendance;
- assessments;
- results;
- fees/payments.

## Current E2E files

tests/e2e/pilot-workspace.spec.ts
tests/e2e/teacher-assignment.spec.ts
tests/e2e/payment-flow.spec.ts
tests/e2e/offline-attendance.spec.ts
tests/e2e/score-flow.spec.ts
tests/e2e/results-flow.spec.ts

Recent owner-supplied results include:
- Score offline → sync: 1 passed;
- Results generate → unpublished → publish → Student visibility: 1 passed;
- The broader pilot/payment/teacher/offline-attendance tests also passed in the owner's local environment.

These are evidence of tested workflows, not a claim that every production route is complete.

## Known local warnings

Playwright/Next.js currently reports warnings about:
- multiple lockfiles / inferred workspace root;
- cross-origin requests from 127.0.0.1 to /_next/*.

They have not blocked the passing E2E workflows.

Treat them as cleanup items unless they become functional problems.

## Production status

## Current identity/history implementation checkpoint

Implemented in the current development history:

- `7490fb0` — `feat: keep school employment history on membership` — added `endedAt` and `endReason` to `SchoolMembership`.
- `6d62698` — `feat: show school work history in personal profile` — Personal Profile now shows school history.
- `8914ff4` — `feat: let admin end staff school access with reason` — Admin can close active staff school access and retain history.
- `5e1db02` — `feat: expose staff membership id for access management` — teacher API exposes the membership ID needed for access management.
- `2f796cc` — `feat: expose cashier membership id for access management` — cashier API exposes the membership ID needed for access management.
- `67a99a6` — `feat: let admin end staff school access with reason` — staff UI provides the leaving-reason/end-access action.
- `a95b40e` — `fix: hide cv wording from personal profile links` — current UI avoids presenting the future CV direction as a finished CV feature.

These changes establish the **foundation only**. Promotion history, a full CV builder and richer employment history are future work, not current MVP scope.

**Production caution:** the production Prisma schema is maintained separately in `prisma/schema.production.prisma`. Before deploying schema changes, verify that the production schema contains the same required membership fields and that the production migration/db-push path is safe. Do not claim the above schema change is production-live until that is verified.



The production baseline is now live on Render from `main`.

Verified deployment checkpoint:
- `main` merge commit: `4814d22`;
- Render deployment: **Live** for `4814d22`;
- Custom domain: `https://skulgo.com`;
- Render service: `skulgo`.

The next work is therefore pilot hardening, not initial deployment.

Remaining production-readiness items:
1. Harden reliable offline navigation/recovery across pilot routes.
2. Complete the production API/auth/object-level security review.
3. Enforce the school subscription boundary.
4. Verify automatic backup and restore.
5. Run/expand live smoke tests against deployed infrastructure.

## Safe development workflow

## Exact fix / repair mode

This is the required mode for future coding AIs and developers.

### 1. Inspect first

Before touching code:

- check the current branch;
- check `git status`;
- read the current relevant file;
- inspect the related API route and schema;
- inspect the existing test;
- inspect the actual build/runtime error if one exists.

Never assume an older conversation, branch or remembered version is the current code.

### 2. Diagnose from evidence

Use the real compiler error, runtime error, failing test, user-visible behavior, database/schema state, or deployment log.

Do not invent a cause because it "looks likely."

### 3. Make the smallest safe fix

Prefer:

**one bug → one focused change → one focused commit**

Reuse the existing route/model/page/utility. Do not create a second implementation of something SkulGo already has.

### 4. Verify before moving on

At minimum:

- typecheck/build the affected code;
- run the focused test;
- inspect the diff.

If the change affects production, verify the deployed commit separately.

### 5. Preserve local work

The user may have uncommitted work.

Never reset, hard reset, clean, stash, overwrite local files, or replace local schema/pages with an older remote version unless the user explicitly tells you to do so.

### 6. No broad fixes

Do not solve a narrow error with:

- `npm audit fix --force`;
- blanket dependency upgrades;
- unrelated refactors;
- schema rewrites;
- replacing whole pages/routes;
- copying code from the old App-School/Bridge Hosting projects.

If a broad change is genuinely required, explain why and wait for approval when it changes architecture or product scope.

### 7. Commit discipline

After each meaningful fix, report:

- what was wrong;
- what was changed;
- files changed;
- commit SHA;
- tests/build result;
- deployment result, if any.

A commit is **not** proof that Render is live.

### 8. Handover discipline

When a change affects the product model, database, permissions or workflow, update:

- `README.md`;
- `ROADMAP.md`;
- `HANDOVER.md`;

so the next AI starts from the real current state.



For every change:

1. Read current main.
2. Identify the smallest existing route/model/page to extend.
3. Reuse current records and utilities.
4. Add the smallest E2E proof.
5. Typecheck.
6. Run the focused E2E.
7. Only then expand.

When using the GitHub connector:
- fetch the current file first;
- use the exact current blob SHA;
- update/create only what is needed;
- never invent SHAs;
- never merge old repositories into SkulGo.

## Product boundary

## Result unlock wording rule

Do not describe a fixed **₦200 result unlock fee** as a school-facing setting or current school requirement.

The commercial result-access fee belongs to SkulGo's own terms and conditions. The complete payment-gated result-access flow remains a separate implementation item.

When documenting result access, describe the behavior without hardcoding a public price unless the current product decision explicitly requires it.



Before adding anything, ask:

> Does this directly solve a real school duty or strengthen the connected record flow?

If not, leave it out.

Do not add payroll, inventory, hostel, transport, library, biometric systems, full accounting, CRM, marketplace, AI, advanced analytics, or large communication systems at this stage.

## Handover point

The core pilot record chain is implemented and the offline-first core has passed the current focused local Playwright suite with **10/10 tests passing**.

The changes were promoted to `main` through PR #3, merge commit `4814d22`, and Render is confirmed **Live** on that same commit for `skulgo.com`.

The next major engineering focus is **real-school pilot hardening**: observe real usage, repair actual gaps, wire existing records to the right roles, and add only small capabilities justified by evidence.

**Continue from current main; do not restart the product or rebuild existing flows from scratch.**

## Student admission ID format

Student Admission IDs use the school abbreviation, admission year, section code, and a four-digit sequence:

**{SCHOOL-ABBR}/{YEAR}/{SECTION-CODE}/{NNNN}**

Standard section codes are:

- Senior Secondary → **SS**
- Junior Secondary → **JS**
- Primary → **PRI**
- Nursery → **NUR**

For custom sections, SkulGo derives a compact code from the section name (for example, University → **UNI**). This keeps IDs readable without storing the full section name in the ID.

Examples: **ACA/2026/SS/5087**, **ACA/2026/JS/1204**, **ACA/2026/PRI/3411**, **UNI/2026/UNI/0001**.


## Student Admission ID Format

Student Admission IDs use:

`{SCHOOL-ABBR}/{YEAR}/{SECTION-CODE}/{4-DIGIT}`

The section part must use a short section code, not the full section name.

Standard section codes:
- Senior Secondary → `SS`
- Junior Secondary → `JS`
- Primary → `PRI`
- Nursery → `NUR`

Custom sections must use a compact code derived from the section name. For example:
- University → `UNI`
- College → `COL`
- Other custom section names should produce a short, readable uppercase code.

Examples:
- `ACA/2026/SS/5087`
- `ACA/2026/JS/1204`
- `ACA/2026/PRI/3411`
- `ACA/2026/NUR/7820`
- `UNI/2026/UNI/0001`

Do not put a full section label such as `SENIOR SECONDARY` into a new Student Admission ID. The section code is for compact identification and must remain independent of the human-readable section name.
