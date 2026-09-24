# SkulGo

**Motto: Transparent & Secure Records**

SkulGo is a very lightweight school records application. It keeps the school structure and records connected, while every person works through their own personal SkulGo account.

## Simple model

**Personal account → School connection → Duty → School work**

A person keeps one personal account. A school is a separate entity. A person can be connected to one or more schools, with a duty for each connection.

The same person who owns a school can register that school, configure it, then return to their personal account and enter the school workspace to operate in their approved duty.

## Keep it light

SkulGo is an **internal school operating record tool**, not a large all-in-one software suite. It should feel as simple as the school's existing register, ledger or notebook, but keep records connected so staff do not repeatedly write the same information. Schools can keep familiar offline/manual processes where they prefer. Online payment, digital result payment and similar options are **optional school settings**, not mandatory parts of daily school work.

### School subscription

SkulGo school plans are currently monthly:

| Plan | Price |
|---|---:|
| Free Trial | ₦0 for 14 days |
| Basic | ₦2,500/month |
| Starter | ₦5,000/month |
| Pro | ₦10,000/month |
| Premium | ₦18,000/month |
| Custom | Contact SkulGo |

The plan page is available to the school Admin. Capacity limits are intentionally configurable while real infrastructure/load testing is completed; the public pricing should not promise invented student limits.

**Subscription payment providers:**
- **Paystack** — online checkout with server-side verification and webhook confirmation.
- **Moniepoint** — school transfers to the configured SkulGo Moniepoint account, then submits the transfer reference for verification.

Provider secrets and bank details must stay in environment variables and must never be committed to GitHub.

The **₦200 result unlock** is separate from the school subscription.

SkulGo is built in small modules. Each module should solve one real school task and fit into the connected record flow.

### Sidebar and dashboard design

SkulGo uses a compact, persistent workspace sidebar so the main dashboard stays clean and focused.

The visual reference is the simple navigation pattern used by modern operational tools: **clear sections, short labels, consistent spacing, and the smallest useful number of visible links**.

Design principles:

- Keep the **dashboard for current activity and important information**, not for holding every navigation action.
- Keep workspace navigation in the **left sidebar** on desktop.
- Group related links into small logical areas when grouping improves scanning (for example, School, Academics, Finance, Communication, Account).
- Show **only the links the current role can use**.
- Use short, familiar labels.
- Do not add a sidebar item merely to expose a future or speculative feature.
- Keep the sidebar visually quiet: clear active state, compact spacing, minimal decoration, and no unnecessary badges/cards.
- Keep school identity and the current user's role visible without competing with navigation.
- On small screens, stack or collapse navigation cleanly so it does not dominate the page.
- Reuse the existing role navigation source in `lib/workspace-nav.ts`; do not create separate navigation lists in individual pages.

The goal is:

> **Navigation carries complexity; the dashboard carries the work.**

Do not copy another product's branding or exact interface. Use the reference only for information hierarchy and usability.

### Principal / School owner

Sidebar stays small:

**Dashboard · Applications · Staff · Sections · Classes · Subjects · Assign · Fees · My Account**

Applications is where the principal reviews and approves **student admissions, staff/job applications, and parent/child link requests**.

Assign is where the principal connects approved people to school duties, such as **teacher → class, teacher → subject, and class-master responsibility**.

The principal sees the whole school operation needed for the role:

- school structure
- teachers and assignments
- students/classes
- attendance overview
- results
- fees, payments and outstanding balances

The dashboard can show a few compact daily activity cards. Examples: **today's attendance percentage**, **today's payments**, and **result completion progress**. Each card opens the related school records when tapped. The information is calculated from the connected records rather than entered manually.

The principal mainly **approves, assigns and manages**.

### Sections

Sections are part of the school's core structure.

The Admin **Sections** workspace is intentionally small. It only:

1. shows the standard section choices:
   - Nursery
   - Primary
   - Junior Secondary
   - Senior Secondary
   - Custom
2. lets Admin select and save a section;
3. shows sections already saved.

Saving a new section must **add** it to the school. It must never replace or overwrite another saved section.

The Sections screen does **not** create classes, subjects, teachers, students or assignments.

### Classes

Classes are configured separately from Sections.

The Classes workspace reads the school's saved sections and provides the starter classes appropriate to each section:

- Nursery → Nursery 1–3
- Primary → Primary 1–6
- Junior Secondary → JSS 1–3
- Senior Secondary → SS 1–3

Other common school types can later use simple starter patterns, such as University 100–500 Level, NCE/College of Education Year 1–3, Polytechnic ND1/ND2/HND1/HND2, KG1–3, or College Year 1–3. Unknown Custom sections should allow manual classes.

A class may optionally have an **arm** such as A, B or C.

The Classes screen is only for classes and optional arms. It does not become a subjects/teachers/attendance screen.

Selecting and saving a class means that class is part of the school's operating structure. The same class record is then used by admissions, students, class masters, subjects, attendance and results.

### Subjects

Subjects use a Nigerian school subject catalog. Admin selects only the subjects the school actually offers and saves them to the school's subject list. The selected list is editable later: Admin can **add, remove or edit** subjects.

The intended lightweight structure is **subject by school/class**, so a Primary 1 subject list can differ from Primary 6, JSS or SS.

These saved subjects are then available in **Assign** when connecting subjects to staff.

### Teacher

After approval, the teacher gets a small duty workspace. If nothing has been assigned yet, the workspace stays empty and clearly says what is still waiting, such as **Class not assigned**, **Subject not assigned**, or **Students not assigned**.

Only sees the work assigned to them.

**Class master:**
- my class
- whole-class attendance
- my class students

**Subject teacher:**
- my subject
- classes/students under that subject
- assignments, scores and related assessment work

A teacher does not see unrelated classes or subjects.

### Student

Sees their own connected school records, such as:

- class
- attendance
- subjects
- scores/results
- fees and balance

### Parent

After an approved child link, the parent sees only **My Child / My Children** and their connected school records.

The parent workspace stays very small:

- **My Children**
- **Attendance**
- **Fees & Payments**
- **Results**
- **Announcements / School messages**

For attendance, when the class teacher submits daily attendance, the parent can see whether the child was **present or absent that day**.

For fees, the parent sees assigned fees, amount paid and outstanding balance, and can pay directly from SkulGo. The payment is recorded for the school without the parent needing to contact the school separately.

When a result is published, the parent sees that the **result is ready**. Viewing/downloading the result requires the configured result-view payment (for example **₦200 once per result**). After payment, the parent can view and download the result digitally.

### Cashier

Works with the school's fee records:

- search a student by Admission ID;
- verify the student's fee and outstanding balance;
- record cash received at the school using the school's teller/receipt number;
- optionally record a manual bank transfer received by the school;
- see payments received and outstanding balances.

Online payment is optional. A school can continue using its normal cash/teller process without requiring students or parents to make online payments.

### Announcements and messages

A simple announcement area is available to the school community. Admin can write one announcement and it can be shown to the relevant **staff, students and parents** connected to the school. Parents also have a simple way to message/contact the school through the same communication area. This stays lightweight; it is not a full chat or social network.

## Core record flow

**People → Classes → Subjects → Attendance → Scores → Results → Fees**

Keep the relationships connected. Do not duplicate the same school record in separate systems.

## Modular development rule

Build small, independent pieces that can be extended later.

Before adding anything, ask:

> Does this directly help a real school duty or the core record flow?

If no, leave it out.

Do not build payroll, inventory, hostel, transport, library, biometric systems, complex accounting, AI features, CRM, school websites, marketplaces, advanced analytics, or large notification systems in this stage.

**Think small. Build one useful piece at a time.**

## Current MVP status — September 2026

The existing MVP contains the core school-record flows and focused local proof for:

- personal account → school workspace
- student admission and approval
- parent → child approval
- teacher approval and assignment
- cashier approval
- attendance
- CA + Exam score entry
- offline attendance → automatic sync
- offline score entry → automatic sync
- result generation
- result publishing
- published-result visibility for students
- shared fee/payment flow across Student, Parent, Cashier and Admin

The current development branch also contains the first incremental Admin structure work:

- Admin navigation now includes **Sections**.
- A lightweight **Sections** workspace has been added.
- Sections are saved independently from the Classes workspace.
- The Sections screen is deliberately not responsible for creating classes.

## Production launch status

The current `main` branch is deployed to Render.

- Production web service: `https://skulgo.onrender.com`
- Production database: Render PostgreSQL
- Production Prisma schema: `prisma/schema.production.prisma`
- Custom domain: `https://skulgo.com`
- `www.skulgo.com` is configured to redirect to `skulgo.com`
- Custom domains are verified in Render and HTTPS is active.

For local development, SkulGo continues to use SQLite. Production uses PostgreSQL through `prisma/schema.production.prisma`.

## Offline-first principle

Offline is a SkulGo-wide behavior. The shared offline layer stores queued actions and cached records locally, then synchronizes when internet returns. Offline attendance and offline score entry have been proven.

## Developer / AI handover

### Important: do not restart the project

A new developer or coding AI should **continue from the repository state**, not redesign SkulGo from scratch.

The product direction is intentionally narrow:

> **A lightweight connected school-record tool for Nigerian schools.**

Do not turn it into a full ERP, school CRM, accounting suite or social platform.

### Current safe development branch

The current incremental Admin-structure work is on:

`fix/admin-structure-safe`

It is intentionally separate from `main`.

Recent commits on this branch:

- `95879af` — add Sections to Admin navigation
- `121a62f` — add lightweight Admin Sections workspace

Do not merge this branch into `main` automatically. Test locally first.

### Local developer rule

The user may have **uncommitted local work on another branch**. Never assume the remote branch represents the user's local files.

Before changing anything:

1. Check the current branch.
2. Check `git status`.
3. Do not overwrite, reset, stash, or delete the user's local work unless explicitly instructed.
4. Inspect the relevant existing file before editing it.
5. Make one small change.
6. Typecheck/test.
7. Commit only the intended files.
8. Report exactly what changed.

### Existing local work warning

The user's local development branch has included work around:

- school ownership
- school access codes
- memberships/access routes
- Admin school structure
- Sections
- Classes
- Applications
- Prisma schema changes

Some of this work may not yet exist on `main` or on this safe branch.

Therefore:

**Do not replace the local schema or local Admin pages with an older remote version.**

If a remote branch and local branch differ, inspect and reconcile deliberately.

### Authentication rule

The current auth response exposes the active school through:

`data.user.membership.schoolId`

Do not accidentally use:

`data.user.memberships.schoolId`

School access must always be checked server-side through the authenticated user's active school membership.

### School isolation

Every school record must remain tenant-isolated.

Never trust a school ID from the browser by itself. API routes must verify:

1. the user is authenticated;
2. the user has an active membership in that school;
3. the user's role is allowed to perform the operation.

Admin-only operations must enforce the Admin role server-side.

### Section rule

The Sections workspace is intentionally minimal.

**Allowed:**
- choose one of the standard section names or Custom;
- save the section;
- display saved sections.

**Not allowed in the Sections workspace:**
- automatically creating classes;
- assigning teachers;
- adding subjects;
- adding students;
- attendance;
- fees;
- results.

Adding a new section must append to the school's existing sections. Never replace the previous sections.

### Classes rule

Classes are the next separate structure workspace.

Classes should read the saved sections and provide the appropriate starter class list. Class editing and optional arms belong here, not in Sections.

Do not invent a second unrelated class structure.

### Subjects rule

Subjects should remain lightweight and school-specific.

The intended direction is:

**School → Section/Class → available Subjects**

Admin should be able to use starter Nigerian subjects, then edit the school's actual list. Avoid building a curriculum engine.

### Assign rule

Assign is the wiring point, not a large HR system.

It should connect existing records such as:

- Teacher → Class
- Teacher → Subject → Class
- Teacher → Class Teacher/Class Master role

Do not duplicate teacher, class or subject records inside Assign.

### Fees rule

Fees should remain simple:

**Fee name → amount → scope → student record → payment → balance**

Cash, bank transfer, card and optional online payment can be supported without building a large accounting system.

### Dashboard rule

The Admin dashboard is a live school activity screen, not a giant analytics page.

Information should come from existing connected records. Do not ask Admin to type the same information again just to create dashboard statistics.

The guiding principle is:

> **One entry, then the connected information circulates to the people who are allowed to see it.**

### MVP boundary

Do not add these unless the product direction is explicitly changed:

- payroll
- salary management
- inventory
- hostel management
- transport management
- library management
- biometric systems
- timetable engine
- exam-hall management
- complex accounting
- CRM
- school website builder
- marketplace
- AI tutor
- AI grading
- complex notification infrastructure
- parent social/community platform
- multi-provider payment framework
- subscription billing engine
- advanced analytics

### Handover test philosophy

The goal is not to prove that every possible feature exists.

The goal is to prove the connected school flow with small, understandable tests:

**Register school → create structure → approve people → assign duties → record attendance/scores/fees → generate connected records → show the right information to the right role.**

If a proposed feature does not improve that flow, stop and discuss it before building it.

### Before every future change

A new developer or AI should answer these questions internally:

1. What existing file already handles this?
2. Is there already an API for it?
3. Is the same record already stored somewhere else?
4. Which role is allowed to perform this action?
5. Does the API enforce school membership?
6. Will this duplicate data entry?
7. Does this belong to the current MVP?
8. Can this be implemented with a smaller change?
9. Can the change be tested independently?
10. Will this preserve existing local work?

If the answer is unclear, inspect first. Do not guess.


### Current wiring principles

SkulGo is intentionally designed like a **digital school record book with wiring**:

- A school owns the school records.
- A personal account is the person's identity/profile/CV.
- A school membership gives that person a role and authorized view.
- A record is entered once and remains a school record.
- Authorized people see the same underlying record through their own workspace.
- Students see only their own records.
- Parents see only their approved children's records.
- Teachers see only their assigned classes, students and subjects.
- Admin sees the school records needed to manage the school.
- Changes to important school records create an audit entry.

Do not create separate copies of the same attendance, score, result or payment for each role.

### Personal account vs school records

The personal account is intentionally separate from the school workspace.

The personal account is the person's simple profile/CV:

- name and email
- Teacher ID or Admission ID when applicable
- connected schools and roles

The school workspace contains the records owned by that school.

A person can therefore keep the same personal identity while having different authorized school connections later.

### Automatic structure

The school setup is intentionally small:

**Section selected → starter classes → starter subjects → Admin edits only what the school needs.**

For the core Nigerian section choices:

- Nursery → Nursery 1–3
- Primary → Primary 1–6
- Junior Secondary → JSS 1–3
- Senior Secondary → SS 1–3

Starter subjects are stored in a small editable catalog in `lib/subject-catalog.ts`. This is deliberately a starter list, not a curriculum engine.

### Class teacher and subject teacher

A class teacher is a separate simple school assignment. Only the assigned class teacher should submit that class's attendance.

A subject teacher works through their existing Teacher → Class → Subject assignment and records CA/exam scores there.

### Audit

Important school changes use `AuditLog`.

The audit record stores:

- who changed it
- what action happened
- which school record changed
- when it happened
- small details about the change

Audit is a record-history mechanism, not a large workflow.

### Offline-first

The app already has:

- service-worker shell caching
- online/offline status
- local record caching
- an offline write queue
- automatic queue reconciliation when internet returns

Attendance, assessment and payment writes already use the queue when the device is offline.

Keep offline behavior lightweight. Do not introduce a large sync engine unless real pilot use proves it necessary.

### Launch discipline

The immediate goal is **school testing**, not feature completeness.

A new developer or AI should prefer:

1. make the existing school record flow easier;
2. keep role access narrow;
3. enter information once;
4. let the same record circulate to authorized people;
5. preserve audit history;
6. preserve offline entry and reconciliation;
7. avoid adding a new subsystem when an existing record can be wired to another role.

## Initial onboarding flow

1. Create a **personal SkulGo account**.
2. From the personal account, search for a school.
3. Open the school and choose **Apply**.
4. Choose the intended connection:
   - **Student** → admission application form.
   - **Teacher / staff** → job application form.
   - **Parent** → parent/child connection request.
5. Submit the application. The person is **not connected to the school until Admin approves**.
6. After Admin approves:
   - Student receives an automatic **Admission ID** and becomes connected to the selected class.
   - Teacher receives an automatic **Teacher ID** and becomes connected to the school.
   - Parent becomes connected only after the school verifies and approves the child relationship.
7. The person returns to their personal SkulGo account and enters the connected school workspace to perform the duties allowed by that connection.

The school remains a separate entity. Personal accounts are identities; school connections define the person's role and access.


### Student Admission IDs

Student Admission IDs use the compact format `{SCHOOL-ABBR}/{YEAR}/{SECTION-CODE}/{4-DIGIT}`.

Standard section codes:
- Senior Secondary → `SS`
- Junior Secondary → `JS`
- Primary → `PRI`
- Nursery → `NUR`

Custom sections use a compact uppercase code derived from the section name (for example, University → `UNI`).

Examples: `ACA/2026/SS/5087`, `ACA/2026/JS/1204`, `ACA/2026/PRI/3411`, `ACA/2026/NUR/7820`.

Never generate new IDs with the full human-readable section name such as `SENIOR SECONDARY`.


## School-specific configuration design

SkulGo uses one lightweight common engine, while each school controls its own school-owned configuration.

### What every school enters

**School identity**
- school name
- abbreviation
- address
- phone
- school email

**School structure**
- sections actually used by the school
- classes under each section
- optional class arms
- subjects offered by each class

**People and duties**
- approve student admissions
- approve teachers/staff
- approve cashiers
- approve parent/child connections
- assign teachers to classes and subjects
- designate class masters

**School fees**
- fee name
- amount
- who the fee applies to: whole school, section, or class
- approval of the fee
- payment options the school chooses to enable
- result-view/unlock amount

**School records**
- attendance through class teachers
- CA/exam scores through assigned teachers
- result generation and Admin publishing
- school announcements
- school payment records

### What SkulGo generates

SkulGo generates the connected operational records automatically from the school's setup:
- Student Admission ID
- Teacher ID
- non-academic staff/Cashier ID
- fee records from approved fee definitions
- payment balances from fee records and recorded payments
- result records from saved assessments
- audit history for important school actions

### School-specific result settings

Different schools do not need to share the same report-card presentation or result rules.

The first lightweight configuration should allow Admin to define:
- school result heading/name;
- term names used by the school;
- grading bands;
- result-view/unlock amount;
- whether the result is available digitally after payment;
- the basic report-card fields the school wants to display.

The underlying student, assessment, result, fee and payment records remain the same. School configuration changes the way the common engine operates for that school; it does not create a second data system.

### Configuration principle

**One SkulGo engine → each school has its own configuration → every person sees the records allowed by their role.**

Do not hardcode one school's name, sections, subjects, fees, grading settings or report-card wording into shared application logic.

Keep the configuration small and school-owned. Add a new setting only when a real school needs a persistent difference.
### Result configuration and SkulGo Result Unlock

The school has a default result configuration that can be adjusted for its own report cards.

**School-controlled:**
- grading bands;
- report-card heading and term labels;
- report-card fields such as student name, Admission ID, class, subject breakdown, total, percentage, grade, position, attendance and remarks;
- result unlock price.

**SkulGo-controlled:**
- the Result Unlock feature itself;
- the published-result access gate;
- payment verification before unlocking;
- digital result/report-card access after a successful unlock.

The default Result Unlock price is **₦200 per result**. The school may change the price for its own workspace, but it does not own or replace the SkulGo unlock mechanism.

Defaults are stored separately from school records so a school can use its own settings without creating a second grading/result system.




### Subscription environment

Production billing uses these environment variables:

```text
PAYSTACK_SECRET_KEY=...
MONIEPOINT_BANK_NAME=...
MONIEPOINT_ACCOUNT_NAME=...
MONIEPOINT_ACCOUNT_NUMBER=...
```

Paystack checkout is initialized server-side. The server verifies the transaction amount and status before activating the school plan, and the Paystack webhook is signature-checked.
