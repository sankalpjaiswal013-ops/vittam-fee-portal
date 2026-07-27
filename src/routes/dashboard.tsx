import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { SiteNav } from "@/components/vittam/SiteNav";
import { ReceiptCard } from "@/components/vittam/ReceiptCard";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Defaulter Risk — Vittam Admin" },
      { name: "description", content: "Students ranked by risk score. Send WhatsApp reminders with pre-filled checkout links." },
    ],
  }),
  component: DefaulterDashboard,
});

type Defaulter = {
  student_id: string;
  name: string;
  roll_no: string;
  class: string;
  guardian_name: string;
  guardian_contact: string;
  balance: number;
  days_overdue: number;
  risk: number;
};

function inr(val: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
}

function DefaulterDashboard() {
  // Enforce staff/admin login check
  const { admin, loading: authLoading } = useRequireAdmin();
  
  const [defaulters, setDefaulters] = useState<Defaulter[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const nav = useNavigate();

  const loadBalances = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("student_balances")
        .select("*");
      
      if (error) {
        console.error(error);
        return;
      }

      // Map DB view fields to UI fields and filter only overdue/debt balances
      const formatted = (data || [])
        .map((row: any) => {
          const bal = Number(row.balance || 0);
          const days = Number(row.days_overdue || 0);
          const risk = bal * days;
          return {
            student_id: row.student_id,
            name: row.name,
            roll_no: row.roll_no,
            class: row.class,
            guardian_name: row.guardian_name || "Guardian",
            guardian_contact: row.guardian_contact || "",
            balance: bal,
            days_overdue: days,
            risk
          };
        })
        .filter((d: any) => d.balance > 0)
        .sort((a, b) => b.risk - a.risk);

      setDefaulters(formatted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (admin) {
      loadBalances();
    }
  }, [admin]);

  const totalOutstanding = useMemo(() => {
    return defaulters.reduce((s, r) => s + r.balance, 0);
  }, [defaulters]);

  const longestOverdue = useMemo(() => {
    return defaulters.length > 0 ? Math.max(...defaulters.map(d => d.days_overdue)) : 0;
  }, [defaulters]);

  const maxRisk = useMemo(() => {
    return defaulters.length > 0 ? defaulters[0].risk : 1;
  }, [defaulters]);

  async function handleLogout() {
    await supabase.auth.signOut();
    nav({ to: "/login" });
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <SiteNav />
        <main className="mx-auto max-w-6xl px-6 py-20 text-center font-mono text-sm text-muted-foreground animate-pulse">
          Loading defaulter risk logs...
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-semibold">Defaulter risk</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ranked by outstanding balance and overdue duration. Reminders pre-populate WhatsApp.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded border border-[color:var(--alert)]/30 text-[color:var(--alert)] px-3 py-1.5 text-xs font-semibold hover:bg-[color:var(--alert)]/5 transition"
          >
            Log Out
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <ReceiptCard>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Total outstanding</p>
            <p className="mt-3 font-serif text-3xl font-semibold text-[color:var(--alert)]">{inr(totalOutstanding)}</p>
          </ReceiptCard>
          <ReceiptCard>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Accounts flagged</p>
            <p className="mt-3 font-serif text-3xl font-semibold">{defaulters.length}</p>
          </ReceiptCard>
          <ReceiptCard>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Longest overdue</p>
            <p className="mt-3 font-serif text-3xl font-semibold">{longestOverdue} days</p>
          </ReceiptCard>
        </div>

        {/* Defaulter Table */}
        <div className="mt-10">
          <ReceiptCard className="p-0">
            <div className="overflow-x-auto p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Rank</th>
                    <th className="pb-3 pr-4 font-medium">Student</th>
                    <th className="pb-3 pr-4 font-medium">Class · roll</th>
                    <th className="pb-3 pr-4 font-medium">Balance</th>
                    <th className="pb-3 pr-4 font-medium">Days late</th>
                    <th className="pb-3 pr-4 font-medium">Risk</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {defaulters.map((d, i) => {
                    const checkout = `http://localhost:3000/student-login`; // redirect to portal
                    const defaultMsg = `Namaste ${d.guardian_name}, this is a reminder from Vittam. ${d.name} (Class ${d.class}, roll ${d.roll_no}) has an outstanding fee of ${inr(d.balance)} pending ${d.days_overdue} days. Pay securely: ${checkout}`;
                    const link = `https://wa.me/${d.guardian_contact}?text=${encodeURIComponent(openId === d.student_id && message ? message : defaultMsg)}`;
                    return (
                      <tr key={d.student_id} className="border-t border-border/60">
                        <td className="py-3 pr-4 font-mono text-xs">{i + 1}</td>
                        <td className="py-3 pr-4 font-medium">{d.name}</td>
                        <td className="py-3 pr-4 font-mono text-xs">{d.class} · {d.roll_no}</td>
                        <td className="py-3 pr-4 font-mono font-semibold">{inr(d.balance)}</td>
                        <td className="py-3 pr-4 font-mono text-xs">{d.days_overdue}</td>
                        <td className="py-3 pr-4">
                          <RiskBar score={d.risk} max={maxRisk} />
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              setOpenId(openId === d.student_id ? null : d.student_id);
                              setMessage(defaultMsg);
                            }}
                            className="text-xs font-medium text-[color:var(--marigold)] hover:underline mr-4"
                          >
                            {openId === d.student_id ? "Close" : "Reminder"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {defaulters.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-xs text-muted-foreground">
                        No outstanding defaulters flagged this term.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ReceiptCard>
        </div>

        {/* WhatsApp Reminder Editor Drawer */}
        {openId && (() => {
          const selectedStudent = defaulters.find(d => d.student_id === openId);
          if (!selectedStudent) return null;
          const checkout = `http://localhost:3000/student-login`;
          const defaultMsg = `Namaste ${selectedStudent.guardian_name}, this is a reminder from Vittam. ${selectedStudent.name} (Class ${selectedStudent.class}, roll ${selectedStudent.roll_no}) has an outstanding fee of ${inr(selectedStudent.balance)} pending ${selectedStudent.days_overdue} days. Pay securely: ${checkout}`;
          const link = `https://wa.me/${selectedStudent.guardian_contact}?text=${encodeURIComponent(message || defaultMsg)}`;
          return (
            <div className="fixed bottom-6 right-6 bg-[#18181B] border border-[#27272A] p-5 rounded-2xl max-w-md w-full shadow-2xl z-50 animate-fade-in text-left">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Edit Alert Alert Message</h4>
                <button onClick={() => setOpenId(null)} className="text-muted-foreground hover:text-white">✕</button>
              </div>
              <p className="text-xs text-white/70 mb-2">Recipient: <span className="font-semibold text-white font-mono">{selectedStudent.guardian_name} ({selectedStudent.guardian_contact})</span></p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[color:var(--marigold)]"
              />
              <div className="mt-4 flex gap-2 justify-end">
                <button onClick={() => setOpenId(null)} className="rounded border border-border px-3 py-1.5 text-xs">Cancel</button>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded bg-[color:var(--banyan)] text-white font-semibold px-4 py-1.5 text-xs flex items-center gap-1.5"
                >
                  Send WhatsApp ↗
                </a>
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}

function RiskBar({ score, max }: { score: number; max: number }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  const color = pct > 66 ? "var(--alert)" : pct > 33 ? "var(--marigold)" : "var(--banyan)";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-xs" style={{ color }}>{score}</span>
    </div>
  );
}
