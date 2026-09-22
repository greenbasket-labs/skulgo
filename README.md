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

As implementation progresses, this README will document the actual architecture, database, authentication, tenant isolation, local setup, tests, and extension points.

## Development rule

Before adding a feature, ask:

> Does this directly help the core school record flow?

If not, do not build it in this stage.

**Think small. Build the core. Stop when the core flow works.**


## Current implementation

The repository currently contains the clean Next.js + Prisma foundation, a relational SQLite development database schema, school registration API, automatic base sections, a simple grading module, and a minimal dashboard entry point.

Authentication/session handling, approval workflows, teacher assignments, attendance, assessments/results, fees, and lightweight offline synchronization are intentionally the next core implementation steps rather than being faked as complete.
