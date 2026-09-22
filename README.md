# SkulGo

**Motto: Transparent & Secure Records**

SkulGo is a very lightweight school records application. It keeps the school structure and records connected, while every person works through their own personal SkulGo account.

## Simple model

**Personal account → School connection → Duty → School work**

A person keeps one personal account. A school is a separate entity. A person can be connected to one or more schools, with a duty for each connection.

The same person who owns a school can register that school, configure it, then return to their personal account and enter the school workspace to operate in their approved duty.

## Keep it light

SkulGo is built in small modules. Each module should solve one real school task and fit into the connected record flow.

### Principal / School owner

Sidebar stays small:

**Dashboard · Applications · Staff · Assign · Classes · Subjects · Fees · My Account**

Applications is where the principal reviews and approves **student admissions, staff/job applications, and parent/child link requests**.

Assign is where the principal connects approved people to school duties, such as **teacher → class, teacher → subject, and class-master responsibility**.

Sees the whole school operation needed for the role:

- school structure
- teachers and assignments
- students/classes
- attendance overview
- results
- fees, payments and outstanding balances

The dashboard can show a few compact daily activity cards. Examples: **today's attendance percentage**, **today's payments**, and **result completion progress**. Each card opens the related school records when tapped. The information is calculated from the connected records rather than entered manually.

The principal mainly **approves, assigns and manages**.

### Classes

Classes are selected from a Nigerian school class list. The school only activates the classes it actually offers. The list runs from **Play Class / Nursery through Primary 1–6, JSS 1–3 and SS 1–3**. The class may optionally have an **arm** such as A, B or C.

Selecting and saving a class means that class is part of the school's operating structure. The same class record is then used by admissions, students, class masters, subjects, attendance and results.

### Subjects

Subjects use a Nigerian school subject catalog. Admin selects only the subjects the school actually offers and saves them to the school's subject list. The selected list is editable later: Admin can **add, remove or edit** subjects. These saved subjects are then available in **Assign** when connecting subjects to staff.

### Teacher

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

After an approved child link:

- my child / my children
- attendance
- school results when published
- assigned fees
- payments and balance
- simple result/record viewing

### Cashier

Works with the school's fee records:

- assigned fees
- payments received
- outstanding balances

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
