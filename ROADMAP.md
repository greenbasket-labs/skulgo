# SkulGo Roadmap

**Current production branch:** `main`  
**Latest deployed commit:** `4814d22`  
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

**Current status:** Offline-first core was merged through PR #2, then promoted to `main` through PR #3. The resulting `main` merge commit is `4814d22`, and Render is confirmed Live on that commit.

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
Create/finish school structure → approve people → assign duties → oversee attendance, results and fees.

### Teacher
Open assigned class/subject → record attendance → record CA/exam scores → continue during temporary internet loss.

### Student
See own class, attendance, subjects, published results and fees/balance.

### Parent
See approved children and their attendance, published results and fees/payments.

### Cashier
Record school payments and view outstanding balances.

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

## Current priority order

**1. Observe and run the real-school pilot**  
**2. Fix real gaps in the existing pilot flow**  
**3. Harden production security, backups and subscription boundary**  
**4. Improve remaining offline navigation/recovery for pilot routes**  
**5. Use pilot evidence to choose the next small capability**  
**6. Repeat: observe → fix → wire → extend → test**

## Handover principle

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
