# SkulGo

**Motto: Transparent and Secure Records**

SkulGo is a lightweight school record system for Nigerian primary and secondary schools.

## MVP scope

The first stage focuses only on the connected core:

**People → Classes → Subjects → Attendance → Scores → Results → Fees**

Core roles:

- School Admin / Principal
- Teacher
- Student
- Parent
- Cashier

The MVP is intentionally small. It is not a complete school-management system.

## Core flow

1. Register a school.
2. Create the basic school structure.
3. Approve teachers and students.
4. Assign teachers to classes and subjects.
5. Record attendance.
6. Enter scores.
7. Calculate results and positions.
8. Publish results.
9. Let students and approved parents view published results.
10. Record fee payments and show balances.

## Design principles

- Clean, small codebase.
- Mobile-friendly workflows.
- Role-based access.
- Strict school/tenant isolation.
- Connected records instead of duplicated information.
- Principal does **approve → assign → manage**, not extensive configuration.
- Teacher daily work should be fast.
- Student and parent experiences are mostly view-only.
- Cashier uses a simple fee ledger.
- Offline support starts with a lightweight local-data/sync-queue abstraction.

## Explicitly out of scope

Payroll, inventory, hostel, transport, library, timetable engines, biometric integration, SMS/WhatsApp automation, AI features, complex accounting, CRM, marketing, school website builder, payment-provider infrastructure, subscriptions, advanced analytics, complex notifications, marketplace, and parent community features.

## Repository status

This repository intentionally starts clean. No App-School or Bridge Hosting code is part of the foundation.

## Current implementation

The repository now has:

- Next.js + Prisma foundation with SQLite development database.
- School registration with automatic base sections.
- Simple school-scoped sections, classes, subjects, and student APIs.
- Automatic student admission IDs.
- Teacher creation with automatic teacher codes.
- Teacher approval state and approval endpoint.
- School-scoped teacher → class → subject assignments.
- Assignment checks that teacher, class, and subject belong to the same school.
- Assignment blocked until the teacher is approved.
- Lightweight class attendance workflow.
- Attendance records can be created or updated for a student/date/session.
- Class attendance view returns every student with present/absent/unmarked state.
- Simple grading helpers.

Authentication/session handling, assessments/results, fees, and lightweight offline synchronization are still intentionally small next steps rather than being faked as complete.

## Development rule

Before adding a feature, ask:

> Does this directly help the core school record flow?

If not, do not build it in this stage.

**Think small. Build the core. Stop when the core flow works.**
