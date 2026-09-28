"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Register() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [introducedBy, setIntroducedBy] = useState("");
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase() ?? "";
    if (ref) setIntroducedBy(ref);
  }, []);
  const router = useRouter();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    const form = e.currentTarget;
    const password = String(new FormData(form).get("password") ?? "");
    const confirmPassword = String(new FormData(form).get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setBusy(false);
      setMessage("Passwords do not match");
      return;
    }

    const response = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });

    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error ?? "Could not create account");
      return;
    }

    router.push("/verify-email?pending=1&email=" + encodeURIComponent(data.email));
    router.refresh();
  }

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 520, margin: "40px auto" }}>
        <p className="muted">SkulGo</p>
        <h1>Create your personal account</h1>
        <p className="muted">
          Use one personal account for your school connections. We’ll send a verification link to your email.
        </p>

        <button
          type="button"
          className="button"
          style={{ width: "100%", marginBottom: 16 }}
          onClick={() => setShowHowItWorks(value => !value)}
          aria-expanded={showHowItWorks}
        >
          How does SkulGo work? {showHowItWorks ? "⌃" : "⌄"}
        </button>

        {showHowItWorks && (
          <section className="card" style={{ marginBottom: 18 }}>
            <h2>How SkulGo Works</h2>
            <p className="muted">
              SkulGo is a simple connected record book for schools.
            </p>
            <p className="muted">
              It is made to be easy to understand and easy to use. You do not need to be a computer expert to use it.
            </p>

            <h3>Start with your Personal Account</h3>
            <p>
              Your <strong>Personal Account belongs to you.</strong>
            </p>
            <p>
              Think of it as your identity on SkulGo.
            </p>
            <p>
              You create it once and keep using it as your school journey changes.
            </p>
            <p>Your account can stay with you when you:</p>
            <ul>
              <li>join a school;</li>
              <li>leave a school;</li>
              <li>join another school;</li>
              <li>move from one role to another;</li>
              <li>continue your education or work.</li>
            </ul>
            <p>
              Your Personal Account can keep your <strong>real-life school journey and connections over time.</strong>
            </p>
            <p>
              You do not need to create a completely new SkulGo identity every time your school or role changes.
            </p>
            <p><strong>Your Personal Account is yours.</strong></p>
            <p>The school's records are separate.</p>

            <h3>The school has its own workspace</h3>
            <p>
              Each school has its own <strong>School Workspace</strong>.
            </p>
            <p>This is where the school's records live.</p>
            <p>For example:</p>
            <ul>
              <li>Students</li>
              <li>Classes</li>
              <li>Subjects</li>
              <li>Attendance</li>
              <li>Scores</li>
              <li>Results</li>
              <li>Fees and payments</li>
              <li>School announcements</li>
            </ul>
            <p>
              The school controls these records and decides who can access them.
            </p>

            <h3>SkulGo keeps school setup simple</h3>
            <p>
              A school does not have to build everything from the beginning.
            </p>
            <p>
              SkulGo helps the school set up its basic structure.
            </p>
            <p>
              The school chooses what it actually uses, such as:
            </p>
            <p><strong>Section → Class → Subject → People → Duties</strong></p>
            <p>
              For example, a school can select its sections, use the suggested classes, choose the subjects it teaches, and then make changes where necessary.
            </p>
            <p>
              SkulGo provides the starting structure.
            </p>
            <p><strong>The school keeps control.</strong></p>
            <p>
              It does not need to understand complicated software configuration.
            </p>

            <h3>Your role connects you to the school</h3>
            <p>
              After your Personal Account is connected to a school, your role determines what you can see and do.
            </p>
            <p><strong>You → Personal Account → School → Teacher → Assigned Class</strong></p>
            <p><strong>You → Personal Account → School → Parent → Approved Child</strong></p>
            <p>Your role gives you the appropriate school access.</p>

            <h3>You can belong to more than one school</h3>
            <p>
              Your Personal Account can connect to different schools.
            </p>
            <p>For example:</p>
            <p>
              <strong>Your Personal Account</strong><br />
              → School A — Student<br />
              → School B — Teacher<br />
              → School C — another approved role
            </p>
            <p>Each school remains separate. Your Personal Account stays the same.</p>

            <h3>Your school journey stays connected to you</h3>
            <p>
              Your Personal Account is designed to remain useful beyond one school.
            </p>
            <p>
              If you are a student today and later become a teacher, your SkulGo identity does not need to be thrown away and recreated.
            </p>
            <p>
              Your school connections can change while your Personal Account remains yours.
            </p>
            <p>
              SkulGo can therefore become a simple record of your <strong>real-life school journey</strong>, while each school keeps control of its own school records.
            </p>

            <h3>School records are connected</h3>
            <p>
              SkulGo connects the school's records:
            </p>
            <p>
              <strong>People → Classes → Subjects → Attendance → Scores → Results → Fees</strong>
            </p>
            <p>
              Information is entered where the work happens and can then be used by the people who are authorised to see it.
            </p>
            <p>
              <strong>Enter the record once. Let the right information reach the right person.</strong>
            </p>
            <p>
              A teacher records attendance. The school has that attendance record. The student can see their own record. An approved parent can see their child's record.
            </p>
            <p>
              No one needs to create a separate copy just because another authorised person needs to see it.
            </p>

            <h3>Everyone sees what belongs to their role</h3>
            <p><strong>Admin</strong><br />Manages the school and its records.</p>
            <p><strong>Teacher</strong><br />Works with assigned classes, students and subjects.</p>
            <p><strong>Student</strong><br />Sees their own authorised school records.</p>
            <p><strong>Parent</strong><br />Sees their approved child's authorised records.</p>
            <p><strong>Cashier</strong><br />Works with the school's fees and payment records.</p>
            <p>People do not automatically see everything in the school.</p>

            <h3>Your Personal Account is not the school's account</h3>
            <p><strong>Personal Account = You</strong></p>
            <p><strong>School Workspace = The school</strong></p>
            <p><strong>School connection = Your role and access</strong></p>
            <p>
              Your Personal Account does not take ownership of the school's records.
            </p>
            <p>
              And the school does not need to recreate your personal identity every time your school relationship changes.
            </p>

            <h3>What happens when you leave a school?</h3>
            <p>
              Your school access can end without deleting your Personal Account.
            </p>
            <p>
              The school keeps its own records. Your connection to that school can remain in your history. Your Personal Account stays with you.
            </p>
            <p>
              If you later join another school, you can use the same SkulGo identity.
            </p>

            <h3>Your SkulGo Account ID</h3>
            <p>
              Your <strong>SkulGo Account ID</strong> identifies your Personal Account.
            </p>
            <p>
              It can be used when another person or school needs to connect you to a SkulGo process.
            </p>
            <p>
              Your Account ID is different from a school-specific ID.
            </p>
            <ul>
              <li><strong>SkulGo Account ID</strong> → identifies your Personal Account.</li>
              <li><strong>Admission ID</strong> → identifies your student record in a school.</li>
              <li><strong>Teacher ID</strong> → identifies your teacher record in a school.</li>
            </ul>

            <h3>SkulGo works with real school conditions</h3>
            <p>
              SkulGo is designed for schools where internet access may not always be reliable.
            </p>
            <p>
              For supported work, you can continue working when the connection is unavailable. Your changes can be saved on the device and synchronised when the connection returns.
            </p>
            <p>
              The goal is not to make schools depend on complicated technology.
            </p>
            <p>
              The goal is to make the school's existing record work <strong>simpler, connected and safer.</strong>
            </p>

            <h3>The simple idea</h3>
            <p><strong>Personal Account = You</strong></p>
            <p>Your identity and your continuing school journey on SkulGo.</p>
            <p><strong>School Workspace = The school</strong></p>
            <p>The school's own people, classes, attendance, scores, results, fees and other records.</p>
            <p><strong>School Connection = Your role</strong></p>
            <p>The connection that tells SkulGo which school you belong to and what you are allowed to do there.</p>
            <p>
              <strong>In one sentence: SkulGo keeps your personal identity with you, keeps school records with the school, and connects you to the right records through your role.</strong>
            </p>

            <button
              type="button"
              className="button"
              style={{ width: "100%", marginTop: 8 }}
              onClick={() => setShowHowItWorks(false)}
            >
              Back to sign up
            </button>
          </section>
        )}

        <form onSubmit={submit} className="grid">
          <label className="grid">
            <span>Full name</span>
            <input required name="name" placeholder="Full name" />
          </label>

          <label className="grid">
            <span>Email</span>
            <input required type="email" name="email" placeholder="Email" />
          </label>

          <label className="grid">
            <span>Password</span>
            <input required minLength={8} type="password" name="password" placeholder="Password" />
          </label>

          <label className="grid">
            <span>Who introduced you to SkulGo? <span className="muted">(optional)</span></span>
            <input
              name="referralCode"
              value={introducedBy}
              onChange={event => setIntroducedBy(event.target.value.toUpperCase())}
              placeholder="SkulGo Account ID"
            />
          </label>

          <label className="grid">
            <span>Confirm password</span>
            <input
              required
              minLength={8}
              type="password"
              name="confirmPassword"
              placeholder="Confirm password"
            />
          </label>

          <button className="button" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        {message && <p>{message}</p>}
        <p className="muted" style={{ marginTop: 16 }}>
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </div>
    </main>
  );
}
