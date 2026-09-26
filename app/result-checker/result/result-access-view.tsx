"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Result = {
  id: string;
  studentId: string;
  term: string;
  total: number;
  grade: string;
  position: number;
  student: {
    admissionId: string;
    firstName: string;
    lastName: string;
    class: { name: string; arm: string | null } | null;
  };
  subject: { name: string };
};

export default function ResultAccessView() {
  const params = useSearchParams();
  const [school, setSchool] = useState<{ name: string; abbr: string } | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [message, setMessage] = useState("Loading result…");

  useEffect(() => {
    const reference = params.get("reference");
    if (!reference) {
      setMessage("Payment reference is missing.");
      return;
    }

    void (async () => {
      const response = await fetch("/api/result-checker/result?reference=" + encodeURIComponent(reference));
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error || "Result could not be loaded.");
        return;
      }
      setSchool(data.school);
      setResults(Array.isArray(data.results) ? data.results : []);
      setMessage("");
    })();
  }, [params]);

  const groups = useMemo(() => {
    const map = new Map<string, Result[]>();
    for (const item of results) {
      const key = item.studentId + ":" + item.term;
      const group = map.get(key) ?? [];
      group.push(item);
      map.set(key, group);
    }
    return [...map.values()];
  }, [results]);

  if (message && !results.length) {
    return (
      <main className="workspace-main">
        <div className="card">
          <h1>Result Checker</h1>
          <p className="muted">{message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <p className="muted">SkulGo</p>
        <h1>Result</h1>
      </div>

      {groups.map(items => {
        const first = items[0];
        return (
          <section className="card" key={first.studentId + ":" + first.term} style={{ marginBottom: 18 }}>
            <h2>{school?.name}</h2>
            <p><strong>{first.student.firstName} {first.student.lastName}</strong></p>
            <p className="muted">{first.student.admissionId} · {first.student.class?.name ?? "Class"}{first.student.class?.arm ? " · " + first.student.class.arm : ""}</p>
            <p className="muted">{first.term}</p>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 8 }}>Subject</th>
                    <th style={{ textAlign: "left", padding: 8 }}>Total</th>
                    <th style={{ textAlign: "left", padding: 8 }}>Grade</th>
                    <th style={{ textAlign: "left", padding: 8 }}>Position</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td style={{ padding: 8 }}>{item.subject.name}</td>
                      <td style={{ padding: 8 }}>{item.total}/100</td>
                      <td style={{ padding: 8 }}>{item.grade}</td>
                      <td style={{ padding: 8 }}>{item.position}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button className="button" type="button" onClick={() => window.print()} style={{ marginTop: 16 }}>
              Print Result
            </button>
          </section>
        );
      })}
    </main>
  );
}
