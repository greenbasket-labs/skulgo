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

### Announcements and messages

A simple announcement area is available to the school community. Admin can write one announcement and it can be shown to the relevant **staff, students and parents** connected to the school. Parents also have a simple way to message/contact the school through the same communication area. This stays lightweight; it is not a full chat or social network.

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

## Current verification

The personal-account → school workspace → student admission approval journey is passing in Playwright. The teacher journey currently exposes a product bug: an approved teacher request must create the Teacher profile as approved before a class/subject assignment can be made. This is being fixed in the approval path; do not mark the teacher journey complete until the local E2E test passes.


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
