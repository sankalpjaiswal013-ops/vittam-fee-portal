import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteNav } from "@/components/vittam/SiteNav";
import { ReceiptCard } from "@/components/vittam/ReceiptCard";
import { HeroSlabs } from "@/components/vittam/HeroSlabs";
import { inr } from "@/lib/vittam-mock";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/")(({
  head: () => ({
    meta: [
      { title: "Vittam — every rupee, reconciled" },
      { name: "description", content: "Bilingual school fee platform bridging UPI, cash, and cheque with a full reconciliation audit trail." },
      { property: "og:title", content: "Vittam — every rupee, reconciled" },
      { property: "og:description", content: "Bilingual school fee platform bridging UPI, cash, and cheque." },
    ],
  }),
  component: Landing,
}));

// ─── Payment Fees panel ──────────────────────────────────────────────────────

function PaymentFeesPanel() {
  const [types, setTypes] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [category, setCategory] = useState("mandatory");
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsAdmin(!!session));
    loadTypes();
  }, []);

  async function loadTypes() {
    const { data } = await supabase.from("fee_types").select("*").order("name");
    setTypes(data || []);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true); setMsg("");
    const { error } = await supabase.from("fee_types").insert({ 
      name: newName.trim(), 
      category: category.trim() || "mandatory" 
    });
    
    if (error) setMsg(`Error: ${error.message}`);
    else { setMsg("✓ Fee type added."); setNewName(""); loadTypes(); }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this fee type?")) return;
    await supabase.from("fee_types").delete().eq("id", id);
    loadTypes();
  }

  return (
    <section id="payment-fees" className="mx-auto max-w-6xl px-6 pb-20">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-[color:var(--marigold)] mb-2">Fee catalogue</p>
          <h2 className="font-serif text-3xl font-semibold">Payment fees</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            This is the master list of fee categories (names only). Specific amounts are assigned to classes and students in the Admin Console.
          </p>
        </div>
        <Link to="/admin/" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary transition-colors">
          Full Admin Console →
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Fee list */}
        <ReceiptCard className="p-0">
          <div className="overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="pb-3 pr-6 font-medium">Fee Type</th>
                  <th className="pb-3 pr-6 font-medium">Category</th>
                  {isAdmin && <th className="pb-3 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {types.map((t) => (
                  <tr key={t.id} className="border-t border-border/60">
                    <td className="py-3.5 pr-6 font-medium text-foreground">{t.name}</td>
                    <td className="py-3.5 pr-6 font-mono text-xs text-muted-foreground">{t.category || "—"}</td>
                    {isAdmin && (
                      <td className="py-3.5 text-right">
                        <button onClick={() => handleDelete(t.id)} className="text-xs text-[color:var(--alert)] hover:underline font-semibold">Remove</button>
                      </td>
                    )}
                  </tr>
                ))}
                {types.length === 0 && (
                  <tr><td colSpan={3} className="py-10 text-center text-xs text-muted-foreground">No fee types configured yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </ReceiptCard>

        {/* Add form — only admins */}
        {isAdmin ? (
          <ReceiptCard>
            <h3 className="font-serif text-base font-semibold mb-4">Add Fee Type</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Name</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Tuition Fee" required
                  className="w-full rounded border border-input bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[color:var(--marigold)]" />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Category</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded border border-input bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[color:var(--marigold)]"
                >
                  <option value="mandatory">Mandatory</option>
                  <option value="optional">Optional</option>
                  <option value="fine">Fine / Penalty</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {msg && <p className={`text-xs p-2 rounded ${msg.startsWith("✓") ? "text-[color:var(--banyan)] bg-[color:var(--banyan)]/10" : "text-[color:var(--alert)] bg-[color:var(--alert)]/10"}`}>{msg}</p>}
              <button type="submit" disabled={adding}
                className="w-full bg-[color:var(--marigold)] text-[#1a130a] font-semibold py-2 rounded text-xs hover:brightness-95 disabled:opacity-50">
                {adding ? "Adding…" : "Add Fee Type"}
              </button>
            </form>
          </ReceiptCard>
        ) : (
          <ReceiptCard>
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">Log in as admin to add or remove fee types.</p>
              <Link to="/login" className="rounded-md bg-[color:var(--marigold)] px-4 py-2 text-xs font-semibold text-[#1a130a] hover:brightness-95">
                Admin Login
              </Link>
            </div>
          </ReceiptCard>
        )}
      </div>
    </section>
  );
}

// ─── Cut Rolls panel ─────────────────────────────────────────────────────────

function CutRollsPanel() {
  const [rolls, setRolls] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem("vittam_terms") || "[]"); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [termName, setTermName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cutoffDate, setCutoffDate] = useState("");
  const [installments, setInstallments] = useState(1);
  const [semester, setSemester] = useState("I");
  const [lateFeePercent, setLateFeePercent] = useState(2);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsAdmin(!!session));
  }, []);

  function openRoll() {
    if (!termName || !startDate || !endDate) return;
    const roll = { id: Date.now(), termName, startDate, endDate, cutoffDate, installments, semester, lateFeePercent, status: "active", createdAt: new Date().toISOString() };
    const updated = [roll, ...rolls];
    setRolls(updated);
    localStorage.setItem("vittam_terms", JSON.stringify(updated));
    setShowForm(false);
    setTermName(""); setStartDate(""); setEndDate(""); setCutoffDate("");
  }

  function closeTerm(id: number) {
    const updated = rolls.map((r) => r.id === id ? { ...r, status: "closed" } : r);
    setRolls(updated);
    localStorage.setItem("vittam_terms", JSON.stringify(updated));
  }

  function printRoll(roll: any) {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Fee Roll — ${roll.termName}</title>
      <style>
        body { font-family: monospace; padding: 32px; max-width: 750px; margin: 0 auto; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .meta { font-size: 11px; color: #666; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f0e8; text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid #ddd; }
        td { border: 1px solid #ddd; padding: 8px; font-size: 11px; }
        .footer { margin-top: 24px; font-size: 10px; color: #888; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>📋 Fee Roll — ${roll.termName}</h1>
      <p class="meta">Semester ${roll.semester} &nbsp;·&nbsp; ${roll.startDate} to ${roll.endDate} &nbsp;·&nbsp; ${roll.installments} installment(s) &nbsp;·&nbsp; Cut-off: ${roll.cutoffDate || "N/A"} &nbsp;·&nbsp; Late fee: ${roll.lateFeePercent}%/mo</p>
      <table>
        <tr><th>#</th><th>Student Name</th><th>Roll No</th><th>Class</th><th>Amount Due</th><th>Due Date</th><th>Inst. #</th><th>Paid</th><th>Signature</th></tr>
        ${Array.from({ length: 25 }, (_, i) => `<tr><td>${i + 1}</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>${roll.cutoffDate || roll.endDate}</td><td>1/${roll.installments}</td><td>☐</td><td>&nbsp;</td></tr>`).join("")}
      </table>
      <div class="footer">Generated: ${new Date().toLocaleString("en-IN")} · Vittam School Fee Management</div>
      </body></html>`);
    win.document.close();
    win.print();
  }

  return (
    <section id="cut-rolls" className="mx-auto max-w-6xl px-6 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-[color:var(--marigold)] mb-2">Academic terms</p>
          <h2 className="font-serif text-3xl font-semibold">Cut rolls</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Open new academic terms, set cut-off deadlines and installment cycles, print fee roll sheets.
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)}
            className="rounded-md bg-[color:var(--marigold)] px-5 py-2.5 text-sm font-semibold text-[#1a130a] hover:brightness-95 transition-all">
            + Open New Roll
          </button>
        )}
      </div>

      {/* Open new roll form */}
      {showForm && isAdmin && (
        <ReceiptCard className="mb-8 max-w-2xl">
          <h3 className="font-serif text-lg font-semibold mb-5">Open New Academic Roll</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Term / Roll Name</label>
              <input value={termName} onChange={(e) => setTermName(e.target.value)} placeholder="AY 2026-27 Term I"
                className="w-full rounded border border-input bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[color:var(--marigold)]" />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Semester</label>
              <select value={semester} onChange={(e) => setSemester(e.target.value)}
                className="w-full rounded border border-input bg-background p-2 text-xs focus:outline-none">
                {["I", "II", "III", "Annual"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Installments</label>
              <select value={installments} onChange={(e) => setInstallments(Number(e.target.value))}
                className="w-full rounded border border-input bg-background p-2 text-xs focus:outline-none">
                {[1, 2, 3, 4, 6, 12].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded border border-input bg-background p-2 text-xs focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded border border-input bg-background p-2 text-xs focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Cut-off Date</label>
              <input type="date" value={cutoffDate} onChange={(e) => setCutoffDate(e.target.value)}
                className="w-full rounded border border-input bg-background p-2 text-xs focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Late Fee %/month</label>
              <input type="number" min={0} max={50} value={lateFeePercent} onChange={(e) => setLateFeePercent(Number(e.target.value))}
                className="w-full rounded border border-input bg-background p-2 text-xs focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowForm(false)}
              className="flex-1 border border-border py-2 rounded text-xs text-muted-foreground hover:bg-secondary transition">Cancel</button>
            <button onClick={openRoll} disabled={!termName || !startDate || !endDate}
              className="flex-1 bg-[color:var(--marigold)] text-[#1a130a] font-semibold py-2 rounded text-xs hover:brightness-95 disabled:opacity-40">
              Open Roll
            </button>
          </div>
        </ReceiptCard>
      )}

      {/* Active and past rolls */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rolls.map((r) => (
          <ReceiptCard key={r.id} className="flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-serif text-base font-semibold leading-tight">{r.termName}</p>
                <p className="font-mono text-xs text-muted-foreground mt-0.5">Sem {r.semester} · {r.installments} instalment{r.installments > 1 ? "s" : ""}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                r.status === "active"
                  ? "text-[color:var(--banyan)] border-[color:var(--banyan)]/30 bg-[color:var(--banyan)]/10"
                  : "text-muted-foreground border-border"
              }`}>
                {r.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">Start</span>
              <span className="font-mono">{r.startDate}</span>
              <span className="text-muted-foreground">End</span>
              <span className="font-mono">{r.endDate}</span>
              <span className="text-muted-foreground">Cut-off</span>
              <span className="font-mono text-[color:var(--marigold)]">{r.cutoffDate || "—"}</span>
              <span className="text-muted-foreground">Late fee</span>
              <span className="font-mono text-[color:var(--alert)]">{r.lateFeePercent}%/mo</span>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => printRoll(r)}
                className="flex-1 border border-border py-1.5 rounded text-xs text-muted-foreground hover:border-[color:var(--marigold)]/40 hover:text-foreground transition">
                🖨 Print Roll
              </button>
              {isAdmin && r.status === "active" && (
                <button onClick={() => closeTerm(r.id)}
                  className="flex-1 border border-[color:var(--alert)]/30 py-1.5 rounded text-xs text-[color:var(--alert)] hover:bg-[color:var(--alert)]/5 transition">
                  Close Term
                </button>
              )}
            </div>
          </ReceiptCard>
        ))}
        {rolls.length === 0 && !showForm && (
          <div className="col-span-3 py-14 text-center text-sm text-muted-foreground">
            No academic rolls opened yet.{" "}
            {isAdmin
              ? <button onClick={() => setShowForm(true)} className="text-[color:var(--marigold)] underline">Open the first one.</button>
              : "Log in as admin to open terms."
            }
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Landing page ─────────────────────────────────────────────────────────────

function Landing() {
  return (
    <div className="min-h-screen">
      <SiteNav />
      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-24 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-4 font-mono text-xs uppercase tracking-widest text-[color:var(--marigold)]">
                School fee reconciliation
              </p>
              <h1 className="font-serif text-5xl font-semibold leading-[1.05] sm:text-6xl">
                Every rupee,<br />reconciled.
              </h1>
              <p className="mt-6 max-w-md text-lg text-muted-foreground">
                Vittam bridges UPI checkouts and offline cash or cheque deposits into one audit
                trail. Parents pay how they can. Schools see the whole ledger.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/student-login"
                  className="rounded-md bg-[color:var(--marigold)] px-5 py-3 text-sm font-medium text-[color:var(--primary-foreground)] shadow-sm hover:brightness-95 flex items-center gap-1.5"
                >
                  <span>🎓</span> Student & Parent Portal
                </Link>
                <Link
                  to="/admin/"
                  className="rounded-md border border-border px-5 py-3 text-sm font-medium hover:bg-secondary flex items-center gap-1.5"
                >
                  <span>⚙</span> Admin Console
                </Link>
              </div>
            </div>
            <HeroSlabs />
          </div>
        </section>

        {/* Stats */}
        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="grid gap-6 sm:grid-cols-3">
            <ReceiptCard>
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Reconciled this term</p>
              <p className="mt-3 font-serif text-4xl font-semibold text-[color:var(--banyan)]">{inr(4820000)}</p>
              <p className="mt-1 text-sm text-muted-foreground">Across 612 students</p>
            </ReceiptCard>
            <ReceiptCard>
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Overdue</p>
              <p className="mt-3 font-serif text-4xl font-semibold text-[color:var(--alert)]">{inr(318200)}</p>
              <p className="mt-1 text-sm text-muted-foreground">47 accounts past 7 days</p>
            </ReceiptCard>
            <ReceiptCard>
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Slips pending verify</p>
              <p className="mt-3 font-serif text-4xl font-semibold text-[color:var(--marigold)]">23</p>
              <p className="mt-1 text-sm text-muted-foreground">Awaiting accountant review</p>
            </ReceiptCard>
          </div>
        </section>

        {/* Divider */}
        <div className="mx-auto max-w-6xl px-6 mb-16">
          <div className="border-t border-border/60" />
        </div>

        {/* Payment Fees */}
        <PaymentFeesPanel />

        {/* Divider */}
        <div className="mx-auto max-w-6xl px-6 mb-16">
          <div className="border-t border-border/60" />
        </div>

        {/* Cut Rolls */}
        <CutRollsPanel />
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-muted-foreground">
          © 2026 Vittam. Built for the Smart School FinTech Innovation Challenge.
        </div>
      </footer>
    </div>
  );
}

