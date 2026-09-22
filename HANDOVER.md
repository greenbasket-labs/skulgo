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
- Scores.

Extend the shared layer. Do not make separate offline engines per module.

The server remains authoritative and must re-check permissions when queued actions replay.

Full service-worker/app-shell offline navigation is still unfinished.

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

## Production blockers

Before a real school uses the production deployment, complete:

1. Full offline app-shell/navigation behavior.
2. Production PostgreSQL.
3. Production hosting + HTTPS + domain.
4. API/auth/object-level security review.
5. Subscription enforcement.
6. Automatic backup + restore test.
7. Live smoke tests.

## Safe development workflow

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

Before adding anything, ask:

> Does this directly solve a real school duty or strengthen the connected record flow?

If not, leave it out.

Do not add payroll, inventory, hostel, transport, library, biometric systems, full accounting, CRM, marketplace, AI, advanced analytics, or large communication systems at this stage.

## Handover point

The core pilot record chain is implemented and has focused local E2E proof.

The next major engineering focus is production reliability, especially full offline-first behavior and deployment readiness—not adding many more features.

**Continue from current main; do not restart the product or rebuild existing flows from scratch.**
