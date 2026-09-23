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

SkulGo is a paid school service, but the pilot stays focused on usefulness first. Schools can subscribe **monthly, per term (3 months), or yearly**. The yearly subscription is planned to receive a **30% discount** from the normal yearly-equivalent price. Exact prices will be set later. Subscription status should be visible to the school owner/admin without becoming part of the school's daily work.

SkulGo is built in small modules. Each module should solve one real school task and fit into the connected record flow.

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

- assigned fees
- payments received
- outstanding balances

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
