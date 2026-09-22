# SkulGo Roadmap

**Current branch:** main  
**Purpose:** lightweight school operating record tool for Nigerian schools.

## Current MVP — DONE / PROVEN

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
- Class setup with section, class and optional arm.
- Subject setup.
- Teacher → class + subject assignment.
- Attendance for assigned teacher/class.
- Shared fee/payment records.
- Student, Parent, Cashier and Admin payment recording paths.
- CA + Exam assessment entry.
- Teacher score entry for only the teacher's assigned class/subject.
- Score entry works offline and syncs when internet returns.
- Attendance works offline and syncs when internet returns.
- Result generation from saved assessments.
- Result publishing by Admin.
- Student/Parent result visibility is restricted to published records.
- Basic role-scoped API protections for the tested workflows.
- Focused E2E coverage for the main pilot flows.

## Current verification

The project owner has supplied passing local proof for:

- npm run typecheck
- offline Attendance → reconnect → server verification
- Student payment → Parent/Cashier visibility
- Teacher approval/assignment
- offline Scores → reconnect → server verification
- Result generation → unpublished → Admin publish → Student visibility

Do not claim a test was run unless the current developer actually ran it or the project owner supplied the output.

## Before first real school pilot

### 1. Full offline-first app behavior

The existing shared offline queue proves offline writes for Attendance and Scores, but SkulGo is intended to behave offline-first across normal school work.

Complete the shared offline architecture so a loaded workspace can continue through temporary internet loss:

Loaded app/workspace
→ Internet drops
→ User continues normal work
→ Records save locally
→ Queue syncs automatically
→ Server re-validates permissions

Do not create separate offline systems per module. Extend the shared offline layer.

A service worker/app-shell strategy is still needed for reliable offline navigation/loading.

### 2. Production database

Local development uses SQLite.

Before real school data:
- move to the chosen production PostgreSQL database;
- configure production-safe migrations;
- verify backup and restore;
- keep secrets outside the repository.

### 3. Production deployment

Set up:
- production hosting;
- production environment variables;
- HTTPS;
- production domain;
- startup/health checks;
- database connectivity.

Then run the critical smoke tests against the deployed environment.

### 4. Production security pass

Review every API route for:
- authentication;
- school membership;
- role permissions;
- object-level access;
- safe offline replay;
- idempotency where repeated sync can happen.

Use the existing Attendance / Assessment / Result permission pattern.

### 5. Subscription enforcement

The schema already includes:
- MONTHLY
- TERM
- YEARLY
- ACTIVE
- EXPIRED
- TRIAL

Keep the commercial layer small:
- school subscription record;
- active/trial/expired state;
- owner/admin visibility;
- simple access rule for expired schools.

Exact prices are not fixed yet. Yearly pricing is planned to have a 30% discount versus the normal yearly-equivalent price.

### 6. Backup and recovery

Before real school data:
- automatic database backups;
- documented restore procedure;
- at least one restore test.

## First pilot

Use the existing connected workflow:

Admin
→ create structure
→ approve people
→ assign teacher duties

Teacher
→ attendance
→ scores

Admin
→ generate/publish results
→ fees

Student / Parent
→ attendance
→ published results
→ fees

Cashier
→ record payments

The pilot should collect real operational pain and failures before adding many new modules.

## After pilot

Only add a module when real school use proves the need and it strengthens the connected record flow.

Possible later work:
- lightweight announcements/school messages;
- result presentation/download;
- optional result-view payment;
- subscription/payment automation;
- additional offline coverage.

## Explicitly out of scope for this stage

Do not add:
- payroll;
- inventory;
- hostel;
- transport;
- library;
- biometric systems;
- full accounting;
- CRM;
- marketplace;
- school website builder;
- AI features;
- advanced analytics;
- large notification systems;
- complex chat/social features.

**Rule: solve one real school duty at a time.**
