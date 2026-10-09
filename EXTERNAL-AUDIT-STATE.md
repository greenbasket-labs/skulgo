# SkulGo External Audit State

**Document type:** External code-review checkpoint  
**Repository:** https://github.com/greenbasket-labs/skulgo  
**Reviewed ref:** `main` (GitHub files fetched during this review; confirm the deployed commit before relying on findings)  
**Review status:** Preliminary — not a complete security audit, penetration test, legal opinion, or compliance certification  
**Last updated:** 2026-10-09

## 1. Purpose and review rules

This file records the external review findings to date so the review can continue without losing context.

Review principles:
- Inspect before changing code.
- Preserve SkulGo's existing product rules and lightweight scope; do not overbuild.
- Do not change application code as part of this checkpoint.
- Distinguish confirmed observations from risks that still require validation.
- Prioritize student privacy, tenant/school isolation, authentication and authorization, data integrity, recoverability, affordability, and applicable official requirements.
- Any eventual fix should be narrowly scoped, tested, and documented. Do not claim production readiness or regulatory compliance without evidence.

## 2. Repository and files inspected

The following files were fetched from the repository's `main` branch for this checkpoint:

- `README.md` — product scope, workflows, architecture and product principles.
- `HANDOVER.md` — developer rules, auth/workspace model, offline-first behavior, test notes and stated production-readiness work.
- `SECURITY.md` — security reporting and development safety policy.
- `package.json` — scripts and dependency versions.
- `.github/workflows/ci.yml` — automated CI steps.
- `next.config.ts` — Next.js configuration.
- `prisma/schema.prisma` — development SQLite schema (partial content inspected).
- `prisma/schema.production.prisma` — production PostgreSQL schema (partial content inspected).
- `.env.example` — example environment variables.
- `lib/auth.ts` — partial authentication/session/device-session implementation.
- `app/api/auth/login/route.ts` — login flow.
- `app/api/auth/verify-email/route.ts` — email verification.
- `app/api/auth/forgot-password/route.ts` — password reset request.
- `app/api/auth/reset-password/route.ts` — password reset.
- `app/api/workspaces/select/route.ts` — workspace membership selection.
- `app/api/schools/route.ts` — school registration and initial membership/subscription/audit creation.
- `app/api/schools/[schoolId]/attendance/route.ts` — partial attendance API.
- `app/api/schools/[schoolId]/assessments/route.ts` — partial assessment API.
- `app/api/schools/[schoolId]/results/route.ts` — partial results API.
- `app/api/schools/[schoolId]/results/publish/route.ts` — result publishing.
- `app/api/schools/[schoolId]/payments/route.ts` — partial payments API.
- `lib/offline-queue.ts` — partial client-side offline queue/cache implementation.
- `tests/e2e/pilot-workspace.spec.ts` — partial end-to-end test review.

Some files were only inspected in part due to review-output limits. This list does not mean every line or every related route has been audited.

## 3. Preliminary findings

### F-01 — Production schema command can accept data loss
**Priority:** High  
**Status:** Confirmed configuration; operational impact requires deployment review  
**Evidence:** `package.json` defines `db:push:prod` as `npm run db:prepare:workspace-codes && prisma db push --schema prisma/schema.production.prisma --accept-data-loss`. The `build:prod` script runs this before the Next.js build.

**Risk:** Prisma schema synchronization with `--accept-data-loss` can permit destructive schema changes. If this script is run against production, an otherwise routine build or deployment could risk production data.

**Recommended verification/action:**
1. Inspect the actual Render build/deploy command and determine whether `build:prod` runs in production.
2. Check current production schema and database state before changing any schema workflow.
3. Prefer reviewed, versioned migrations and a deliberate migration step over an automatic destructive schema push.
4. Confirm a current backup and successfully tested restore procedure before any schema change.
5. Do not run the production script during this audit.

### F-02 — School/tenant isolation requires systematic route-by-route tests
**Priority:** High  
**Status:** Review gap; no universal bypass established by this checkpoint  
**Evidence:** Workspace selection checks that the active membership belongs to the current user. The inspected attendance, results, and payments routes contain school/membership checks and role-specific filters.

**Risk:** Multi-school school-record systems need consistent object-level authorization on every read and write. Checking a `schoolId` alone does not necessarily prove that the requested class, student, subject, result, fee, payment, or target record belongs to that school and is within the caller's assigned duties.

**Recommended verification/action:**
- Build a role/route authorization matrix for ADMIN, TEACHER, STUDENT, PARENT, and CASHIER.
- Test cross-school IDs, inactive memberships, unassigned classes/subjects, unapproved parent-child links, unpublished results, and direct API requests.
- Review all GET/POST/PATCH/PUT/DELETE handlers, not only the sample routes inspected here.
- Add regression tests for each verified authorization boundary.
- Treat as a priority review area, not a confirmed exploitable vulnerability yet.

### F-03 — CI workflow does not run the E2E suite
**Priority:** Medium  
**Status:** Confirmed configuration  
**Evidence:** `.github/workflows/ci.yml` runs dependency installation, Prisma client generation, TypeScript typecheck, and `npm run build`. It does not run `npm run e2e`.

**Risk:** Changes may pass typechecking and build while breaking important school workflows or authorization behavior.

**Recommended verification/action:** Determine whether E2E tests can run safely in CI with isolated test data and required environment variables. Add stable tests for critical pilot workflows, especially login/workspace access, school isolation, attendance, assessments/results, payments, and offline sync. Keep tests that require secrets or production data out of CI.

### F-04 — Backup and restore readiness is not yet evidenced
**Priority:** High for production operations  
**Status:** Open verification item  
**Evidence:** `HANDOVER.md` lists verification of automatic backup and restore among remaining production-readiness items.

**Risk:** School records, assessment results, attendance, and financial records may be difficult or impossible to recover after accidental deletion, schema mistakes, or infrastructure failure if backups are absent or unusable.

**Recommended verification/action:** Inspect hosting/database backup settings, retention, access controls, recovery-point and recovery-time expectations, and perform a documented restore test in a non-production environment. Do not infer that backups are absent solely because the handover says they need verification.

### F-05 — Offline queue and cached school data need a privacy/reliability review
**Priority:** High review priority  
**Status:** Open verification item  
**Evidence:** `lib/offline-queue.ts` stores queued actions and cached records in browser `localStorage`; queue entries carry a personal-account + membership scope key. The handover says the server should re-check permissions when queued actions replay.

**Risk:** Browser storage can persist on a shared device and may be accessible to script executing in the same origin. Correct queue scoping in the client is useful, but it is not an authorization boundary. Queued operations must be validated by the server at replay time, and stale or unauthorized cached information must not be exposed to another account or workspace.

**Recommended verification/action:**
- Trace all cache key creation, record reads, logout/workspace switching, and queue cleanup behavior.
- Verify server-side authorization is re-run for every replayed action.
- Test duplicate replay, expired sessions, revoked membership, account switching, and failed/conflicting sync.
- Review whether sensitive student data should be cached and how long it is retained.
- Do not conclude a leak exists until these flows are tested.

### F-06 — Authentication/session implementation needs a complete security pass
**Priority:** High review priority  
**Status:** Partial implementation inspected; additional verification required  
**Evidence:** `lib/auth.ts` uses HMAC-signed session payloads, HttpOnly cookies, SameSite=Lax, and a production guard requiring `SESSION_SECRET`. Login checks password and email verification and applies a two-active-device limit.

**Positive observations:** A production fallback session secret is not silently used when `NODE_ENV=production`; session cookies are HttpOnly and are marked Secure in production in the inspected code.

**Open checks:** Rate limiting and abuse controls on login, signup, verification OTP/link, password reset, PIN checks, and device recovery; password policy and hash parameters; session revocation after password reset; CSRF protections for state-changing cookie-authenticated requests; cookie handling and session/device binding; token expiry and replay; email enumeration; and audit coverage. These have not been fully verified.

### F-07 — Result publishing behavior needs business-rule and scope tests
**Priority:** Medium  
**Status:** Open verification item  
**Evidence:** `app/api/schools/[schoolId]/results/publish/route.ts` checks for an ADMIN membership in the specified school and supports SCHOOL, SECTION, and CLASS scopes. The student-selection query also includes a Senior Secondary section-name filter, while the update query applies school, term, and selected scope.

**Risk:** The difference between the selection query and the update query may be intentional or may leave a mismatch between what the code checks and what it publishes. The route's selected student data is not used in the shown update operation.

**Recommended verification/action:** Confirm intended publishing rules with the product owner, inspect the full current route and schema, and test each scope with multiple sections/classes and terms. Do not alter the business rule until its intended behavior is established.

### F-08 — Official readiness and affordability are not yet assessed
**Priority:** Medium planning item  
**Status:** Not assessed  
**Evidence:** The repository describes a school-record system handling student, parent/staff, attendance, assessment, results, fees, payments, and audit data.

**Recommended verification/action:** Identify the actual target institutions, procurement/tender conditions, data-controller/processor responsibilities, applicable Nigerian data-protection obligations, retention/deletion expectations, incident response, accessibility, record export, and any required education-system integrations. Confirm applicability with authoritative requirements and qualified advice. Do not claim compliance from code inspection alone.

For affordability, collect the actual hosting, managed PostgreSQL, email delivery, backups, domain, monitoring, and support costs; model realistic pilot and growth scenarios. No verified operating-cost figures are available in this checkpoint.

## 4. Positive foundations observed (not certification)

- The product documentation defines a focused school-record scope and says not to overbuild.
- School membership is modeled separately from the global user identity.
- The inspected workspace-selection route checks that the membership belongs to the current user and is active.
- The login route requires email verification.
- The inspected session implementation uses signed sessions and HttpOnly cookies.
- The database has audit-log relationships and the school-registration flow creates an audit entry.
- CI performs typechecking and a production build.
- E2E test files exist for pilot workflows, teacher assignments, payments, offline attendance, scores, and results (the existence of tests does not prove the whole suite currently passes).

## 5. Scope limitations

- Review was performed against selected GitHub `main` files; the exact deployed commit was not independently confirmed in this checkpoint.
- No repository clone was run locally, no commands or tests were executed against the code, and no live-system penetration tests were performed.
- No production database, hosting settings, secrets, backup configuration, runtime logs, or monitoring configuration were inspected.
- Some files were retrieved only partially.
- No code or configuration was changed by this checkpoint.
- No legal, regulatory, procurement, or government-integration compliance conclusion is made.

## 6. Next review sequence

1. Confirm the exact commit deployed to Render and whether the local laptop has unpushed changes.
2. Inspect production deployment commands and schema migration safety before any production deployment.
3. Review `lib/auth.ts` fully and trace login, signup, verification, password reset, PIN, device recovery, logout, and session revocation.
4. Build a complete API/role/tenant authorization matrix; review each sensitive route and add negative tests.
5. Review payment integrity and provider callbacks, including reference uniqueness/idempotency, amount/currency authority, and proof of payment.
6. Review offline cache/queue lifecycle, account switching, sync authorization, conflict handling, and duplicate prevention.
7. Verify backups/restores, error monitoring, rate limits, secrets configuration, and deployment rollback.
8. Run typecheck/build/E2E in a safe local or isolated CI environment and record exact results.
9. Research the official requirements that actually apply to SkulGo's intended market, clearly separating verified requirements from assumptions.
10. Prepare a final report with evidence, severity, remediation, test result, and remaining risk for each finding.

## 7. Change log

- **2026-10-09:** Created the initial external audit checkpoint from selected files in `greenbasket-labs/skulgo` on `main`. Recorded preliminary findings F-01 through F-08. No application code changed.
