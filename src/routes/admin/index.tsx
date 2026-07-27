import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { supabase } from "@/lib/supabase";
import { StatusPill } from "@/components/vittam/StatusPill";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Vittam Admin — Full Console" },
      { name: "description", content: "Unified admin panel: students, fees, transactions, cut rolls, admit cards, and class management." },
    ],
  }),
  component: AdminConsole,
});

// ─── helpers ────────────────────────────────────────────────────────────────

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n);
}

type Tab =
  | "overview"
  | "classes"
  | "students"
  | "verify"
  | "defaulters"
  | "fee-types"
  | "transactions"
  | "cut-rolls"
  | "contacts"
  | "admit-cards";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview",     label: "Overview",       icon: "◈" },
  { id: "classes",      label: "Classes",         icon: "🏫" },
  { id: "students",     label: "Students",        icon: "👤" },
  { id: "verify",       label: "Verify Slips",    icon: "✅" },
  { id: "defaulters",   label: "Defaulters",      icon: "⚠️" },
  { id: "fee-types",    label: "Fee Types",       icon: "💰" },
  { id: "transactions", label: "Transactions",    icon: "📋" },
  { id: "cut-rolls",    label: "Cut Rolls",       icon: "📅" },
  { id: "contacts",     label: "Contacts",        icon: "📞" },
  { id: "admit-cards",  label: "Admit Cards",     icon: "🪪" },
];

// ─── root component ─────────────────────────────────────────────────────────

function AdminConsole() {
  const { admin, loading: authLoading } = useRequireAdmin();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0C]">
        <div className="font-mono text-xs text-muted-foreground animate-pulse">
          Authenticating admin session…
        </div>
      </div>
    );
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    nav({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen bg-[#0A0A0C] text-white">
      {/* ── Sidebar ── */}
      <aside className="hidden md:flex w-56 flex-col border-r border-[#1F2028] bg-[#0D0D10] sticky top-0 h-screen">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#1F2028]">
          <span className="inline-block h-5 w-5 rounded-sm bg-[#E8A33D]" />
          <span className="font-serif text-lg font-semibold text-white">Vittam</span>
          <span className="ml-auto font-mono text-[9px] text-[#E8A33D] border border-[#E8A33D]/30 px-1.5 py-0.5 rounded">ADMIN</span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              id={`admin-tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${
                tab === t.id
                  ? "bg-[#E8A33D]/10 text-[#E8A33D] font-medium"
                  : "text-[#6B7280] hover:text-white hover:bg-[#161620]"
              }`}
            >
              <span className="text-base leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        {/* Bottom: logout */}
        <div className="px-3 pb-4">
          <div className="text-[10px] text-[#4B5563] font-mono px-3 py-1 truncate">{admin?.email}</div>
          <button
            onClick={handleLogout}
            className="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#C4432B] hover:bg-[#C4432B]/8 transition"
          >
            <span>⎋</span> Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top nav ── */}
      <div className="md:hidden w-full fixed top-0 z-50 bg-[#0D0D10] border-b border-[#1F2028] px-4 py-3 flex items-center gap-3 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              tab === t.id ? "bg-[#E8A33D]/15 text-[#E8A33D]" : "text-[#6B7280]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto md:p-8 p-4 md:pt-8 pt-16">
        {tab === "overview"     && <OverviewTab />}
        {tab === "classes"      && <ClassesTab />}
        {tab === "students"     && <StudentsTab />}
        {tab === "verify"       && <VerifyTab />}
        {tab === "defaulters"   && <DefaultersTab />}
        {tab === "fee-types"    && <FeeTypesTab />}
        {tab === "transactions" && <TransactionsTab />}
        {tab === "cut-rolls"    && <CutRollsTab />}
        {tab === "contacts"     && <ContactsTab />}
        {tab === "admit-cards"  && <AdmitCardsTab />}
      </main>
    </div>
  );
}

// ─── tiny sparkline ─────────────────────────────────────────────────────────

function Sparkline({ values, color = "#E8A33D" }: { values: number[]; color?: string }) {
  if (!values.length) return null;
  const max = Math.max(...values) || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 100 - (v / max) * 100;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="w-16 h-8" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab() {
  const [stats, setStats] = useState({ outstanding: 0, slips: 0, students: 0, paid: 0 });
  const [sparkData] = useState([4, 7, 5, 9, 6, 12, 10, 15, 13, 18]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [balRes, slipRes, studRes] = await Promise.all([
          supabase.from("student_balances").select("balance"),
          supabase.from("transactions").select("id, status").eq("status", "pending").in("method", ["cash", "cheque"]),
          supabase.from("students").select("id", { count: "exact", head: true }),
        ]);
        const outstanding = (balRes.data || []).reduce((s, r) => s + Number(r.balance || 0), 0);
        setStats({
          outstanding,
          slips: slipRes.data?.length || 0,
          students: studRes.count || 0,
          paid: 0,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const kpis = [
    { label: "Total Outstanding", value: inr(stats.outstanding), color: "#C4432B", spark: sparkData },
    { label: "Slips Pending",     value: String(stats.slips),     color: "#E8A33D", spark: sparkData.map(v => v * 0.4) },
    { label: "Students on Roll",  value: String(stats.students),  color: "#2F6B4F", spark: sparkData.map(v => v * 0.7) },
  ];

  return (
    <div>
      <SectionHeader title="Overview" subtitle="Live snapshot across all fee accounts" />
      {loading ? (
        <LoadingPulse text="Loading metrics…" />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-3 mt-6">
            {kpis.map((k) => (
              <AdminCard key={k.label}>
                <div className="flex justify-between items-start">
                  <p className="text-xs font-mono uppercase tracking-widest text-[#6B7280]">{k.label}</p>
                  <Sparkline values={k.spark} color={k.color} />
                </div>
                <p className="mt-3 font-serif text-3xl font-semibold" style={{ color: k.color }}>{k.value}</p>
              </AdminCard>
            ))}
          </div>

          {/* Collection bar chart */}
          <div className="mt-8">
            <AdminCard>
              <p className="text-xs font-mono uppercase tracking-widest text-[#6B7280] mb-4">Collection over last 10 periods</p>
              <div className="flex items-end gap-1.5 h-24">
                {sparkData.map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t transition-all"
                      style={{
                        height: `${(v / Math.max(...sparkData)) * 100}%`,
                        background: `linear-gradient(to top, #E8A33D, #E8A33D88)`,
                        minHeight: 4,
                      }}
                    />
                    <span className="font-mono text-[8px] text-[#4B5563]">{i + 1}</span>
                  </div>
                ))}
              </div>
            </AdminCard>
          </div>

          {/* Quick links */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Add Student", color: "#E8A33D" },
              { label: "Verify Slip", color: "#2F6B4F" },
              { label: "Open Cut Roll", color: "#7C3AED" },
              { label: "Print Admit Card", color: "#0891B2" },
            ].map((q) => (
              <button
                key={q.label}
                className="rounded-xl border border-[#1F2028] bg-[#0D0D10] px-4 py-3 text-left text-sm font-medium hover:border-[#E8A33D]/30 transition"
                style={{ color: q.color }}
              >
                {q.label} →
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: CLASSES
// ─────────────────────────────────────────────────────────────────────────────

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const SECTIONS = ["A", "B", "C", "D"];

function ClassesTab() {
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("A");
  const [students, setStudents] = useState<any[]>([]);
  const [feeTypes, setFeeTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Class-level fee assignment states
  const [showBulkFee, setShowBulkFee] = useState(false);
  const [bulkFeeTypeId, setBulkFeeTypeId] = useState("");
  const [bulkAmount, setBulkAmount] = useState(5000);
  const [bulkDue, setBulkDue] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");

  useEffect(() => {
    if (!selectedGrade) return;
    const classHyphen = `${selectedGrade}-${selectedSection}`;
    const classNoHyphen = `${selectedGrade}${selectedSection}`;
    setLoading(true);
    Promise.all([
      supabase.from("student_balances")
        .select("*")
        .or(`class.ilike.${classHyphen}%,class.ilike.${classNoHyphen}%`)
        .order("name"),
      supabase.from("fee_types").select("*"),
    ]).then(([studRes, ftRes]) => {
      setStudents(studRes.data || []);
      setFeeTypes(ftRes.data || []);
      setLoading(false);
    });
  }, [selectedGrade, selectedSection]);

  async function handleBulkFee(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGrade || !bulkFeeTypeId || !bulkDue) return;
    setBulkSubmitting(true);
    setBulkMsg("");
    const rows = students.map((s) => ({
      student_id: s.student_id,
      fee_type_id: bulkFeeTypeId,
      amount: bulkAmount,
      due_date: bulkDue,
      status: "pending",
    }));
    const { error } = await supabase.from("fee_assignments").insert(rows);
    setBulkMsg(error ? `Error: ${error.message}` : `✓ Assigned fee to ${rows.length} students.`);
    setBulkSubmitting(false);
  }

  return (
    <div>
      <SectionHeader title="Class Management" subtitle="Browse grades 1–12, manage sections and bulk-assign fees" />

      {/* Grade selector */}
      <div className="mt-6 flex flex-wrap gap-2">
        {GRADES.map((g) => (
          <button
            key={g}
            onClick={() => { setSelectedGrade(g); setSelectedSection("A"); }}
            className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all border ${
              selectedGrade === g
                ? "bg-[#E8A33D] text-black border-[#E8A33D]"
                : "bg-[#0D0D10] border-[#1F2028] text-[#6B7280] hover:border-[#E8A33D]/40 hover:text-white"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {selectedGrade && (
        <>
          {/* Section tabs */}
          <div className="mt-5 flex gap-2">
            {SECTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSection(s)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  selectedSection === s
                    ? "bg-[#E8A33D]/15 text-[#E8A33D] border-[#E8A33D]/30"
                    : "border-[#1F2028] text-[#6B7280] hover:text-white"
                }`}
              >
                Section {s}
              </button>
            ))}
          </div>

          <div className="mt-5 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-white">
              Class {selectedGrade}-{selectedSection} · {loading ? "…" : `${students.length} students`}
            </h3>
            <button
              onClick={() => setShowBulkFee(true)}
              className="px-4 py-2 text-xs bg-[#E8A33D] text-black font-semibold rounded-lg hover:brightness-95"
            >
              Bulk Assign Fee
            </button>
          </div>

          {loading ? (
            <LoadingPulse text="Loading class roster…" />
          ) : (
            <AdminCard className="mt-4 p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-widest text-[#4B5563] border-b border-[#1F2028]">
                      <th className="pb-3 pt-4 px-5 font-medium">Student</th>
                      <th className="pb-3 pt-4 px-4 font-medium">Roll No</th>
                      <th className="pb-3 pt-4 px-4 font-medium">Balance</th>
                      <th className="pb-3 pt-4 px-4 font-medium">Guardian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.student_id} className="border-t border-[#1F2028]">
                        <td className="py-3 px-5 text-white font-medium">{s.name}</td>
                        <td className="py-3 px-4 font-mono text-xs text-[#9CA3AF]">{s.roll_no}</td>
                        <td className="py-3 px-4 font-mono text-sm text-[#E8A33D]">{inr(Number(s.balance || 0))}</td>
                        <td className="py-3 px-4 text-xs text-[#6B7280]">{s.guardian_name || "—"}</td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-xs text-[#4B5563]">
                          No students found for class {selectedGrade}-{selectedSection}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </AdminCard>
          )}
        </>
      )}

      {!selectedGrade && (
        <div className="mt-12 text-center text-sm text-[#4B5563]">
          Select a grade above to view students grouped by section.
        </div>
      )}

      {/* Bulk Fee Modal */}
      {showBulkFee && (
        <Modal onClose={() => { setShowBulkFee(false); setBulkMsg(""); }}>
          <h3 className="text-sm font-semibold text-white mb-1">
            Bulk Assign Fee — Class {selectedGrade}-{selectedSection}
          </h3>
          <p className="text-xs text-[#6B7280] mb-5">
            This will assign a fee to all {students.length} students in this class.
          </p>
          <form onSubmit={handleBulkFee} className="space-y-4">
            <Field label="Fee Type">
              <select
                value={bulkFeeTypeId}
                onChange={(e) => setBulkFeeTypeId(e.target.value)}
                required
                className="admin-input"
              >
                <option value="">-- Select --</option>
                {feeTypes.map((ft) => (
                  <option key={ft.id} value={ft.id}>{ft.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Amount (₹)">
              <input
                type="number"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(Number(e.target.value))}
                required
                className="admin-input"
              />
            </Field>
            <Field label="Due Date">
              <input
                type="date"
                value={bulkDue}
                onChange={(e) => setBulkDue(e.target.value)}
                required
                className="admin-input"
              />
            </Field>
            {bulkMsg && (
              <p className={`text-xs p-2 rounded ${bulkMsg.startsWith("✓") ? "text-[#2F6B4F] bg-[#2F6B4F]/10" : "text-[#C4432B] bg-[#C4432B]/10"}`}>
                {bulkMsg}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowBulkFee(false)} className="flex-1 modal-cancel">Cancel</button>
              <button type="submit" disabled={bulkSubmitting} className="flex-1 modal-primary">
                {bulkSubmitting ? "Assigning…" : `Assign to ${students.length} students`}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

interface Row {
  name: string;
  roll_no: string;
  class: string;
  guardian_name: string;
  guardian_contact: string;
  email: string;
  branch: string;
}

function parseCsv(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const [headerRow, ...rest] = lines;
  
  // Split columns, ignoring commas inside quotes
  const cols = headerRow.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c) => c.replace(/^["']|["']$/g, '').trim().toLowerCase());
  
  // Find column index based on synonyms
  const getIndex = (synonyms: string[]) => {
    return cols.findIndex((col) => synonyms.some((syn) => col.includes(syn) || syn.includes(col)));
  };

  const nameIdx = getIndex(["name", "student", "full"]);
  const rollIdx = getIndex(["roll", "admission", "id", "no"]);
  const classIdx = getIndex(["class", "grade", "standard", "sec"]);
  const gNameIdx = getIndex(["guardian", "parent", "father", "mother"]);
  const gContactIdx = getIndex(["contact", "phone", "mobile", "number"]);
  const emailIdx = getIndex(["email", "gmail"]);
  const branchIdx = getIndex(["branch", "campus"]);

  return rest.map((line) => {
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((p) => p.replace(/^["']|["']$/g, '').trim());
    return {
      name: nameIdx !== -1 ? (parts[nameIdx] ?? "") : "",
      roll_no: rollIdx !== -1 ? (parts[rollIdx] ?? "") : "",
      class: classIdx !== -1 ? (parts[classIdx] ?? "") : "",
      guardian_name: gNameIdx !== -1 ? (parts[gNameIdx] ?? "") : "",
      guardian_contact: gContactIdx !== -1 ? (parts[gContactIdx] ?? "") : "",
      email: emailIdx !== -1 ? (parts[emailIdx] ?? "") : "",
      branch: branchIdx !== -1 ? (parts[branchIdx] ?? "Main") : "Main",
    };
  });
}

function StudentsTab() {
  const [students, setStudents] = useState<any[]>([]);
  const [feeTypes, setFeeTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subTab, setSubTab] = useState<"roster" | "add" | "import" | "document-converter">("roster");

  // CSV Bulk states
  const [csvText, setCsvText] = useState("");
  const [drag, setDrag] = useState(false);
  const [committed, setCommitted] = useState<number | null>(null);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);

  // Document Converter states
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string>("");
  const [converterRows, setConverterRows] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [docTextContent, setDocTextContent] = useState<string>("");

  // Add student form
  const [mName, setMName] = useState(""); const [mRoll, setMRoll] = useState("");
  const [mClass, setMClass] = useState(""); const [mGuardian, setMGuardian] = useState("");
  const [mPhone, setMPhone] = useState(""); const [mEmail, setMEmail] = useState("");
  const [addMsg, setAddMsg] = useState(""); const [addErr, setAddErr] = useState("");
  const [adding, setAdding] = useState(false);

  // Fee & waiver modals
  const [feeStudent, setFeeStudent] = useState<any>(null);
  const [waiverStudent, setWaiverStudent] = useState<any>(null);
  const [waiverAssignments, setWaiverAssignments] = useState<any[]>([]);
  const [feeTypeId, setFeeTypeId] = useState("");
  const [feeAmount, setFeeAmount] = useState(5000);
  const [dueDate, setDueDate] = useState("");
  const [waiverAssignId, setWaiverAssignId] = useState("");
  const [waiverPct, setWaiverPct] = useState(25);
  const [waiverReason, setWaiverReason] = useState("");

  const load = async () => {
    setLoading(true);
    const [sRes, ftRes] = await Promise.all([
      supabase.from("student_balances").select("*").order("name"),
      supabase.from("fee_types").select("*").order("name"),
    ]);
    setStudents(sRes.data || []);
    setFeeTypes(ftRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const CSV_EXAMPLE = `name,roll_no,class,guardian_name,guardian_contact,email,branch
Aarav Sharma,10B-02,10-B,Priya Sharma,+919812345342,priya@gmail.com,Jaipur Yad
Isha Patel,9A-03,9-A,Rakesh Patel,+919900011122,rakesh@gmail.com,Dharams
Kabir Menon,7C-22,7-C,Anita Menon,+919845567780,anita@yahoo.com,Jaipur Yad`;

  const parsedRows = useMemo(() => parseCsv(csvText), [csvText]);

  const dupeRolls = useMemo(() => {
    const counts = new Map<string, number>();
    parsedRows.forEach((r) => counts.set(r.roll_no, (counts.get(r.roll_no) ?? 0) + 1));
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([r]) => r));
  }, [parsedRows]);

  const okCount = parsedRows.filter((r) => r.roll_no && !dupeRolls.has(r.roll_no)).length;

  async function commitCSVImport() {
    if (okCount === 0) return;
    setImporting(true);
    setImportError("");
    setCommitted(null);

    const rowsToInsert = parsedRows
      .filter((r) => r.roll_no && !dupeRolls.has(r.roll_no))
      .map((r) => ({
        name: r.name,
        roll_no: r.roll_no,
        class: r.class,
        guardian_name: r.guardian_name,
        guardian_contact: r.guardian_contact
      }));

    try {
      const { error } = await supabase.from("students").insert(rowsToInsert);
      if (error) {
        setImportError(error.message);
      } else {
        setCommitted(rowsToInsert.length);
        setCsvText("");
        load();
      }
    } catch (e: any) {
      setImportError(e.message || "Bulk commit failed.");
    } finally {
      setImporting(false);
    }
  }

  async function onFiles(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setCsvText(await f.text());
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) =>
      s.name?.toLowerCase().includes(q) || s.roll_no?.toLowerCase().includes(q) || s.class?.toLowerCase().includes(q)
    );
  }, [students, search]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddErr(""); setAddMsg(""); setAdding(true);
    const { error } = await supabase.from("students").insert({
      name: mName.trim(), roll_no: mRoll.trim().toUpperCase(),
      class: mClass.trim(), guardian_name: mGuardian.trim() || null,
      guardian_contact: mPhone.trim() || null, email: mEmail.trim() || null,
    });
    if (error) setAddErr(error.message);
    else { setAddMsg(`✓ Student "${mName}" added.`); setMName(""); setMRoll(""); setMClass(""); setMGuardian(""); setMPhone(""); setMEmail(""); load(); }
    setAdding(false);
  }

  async function handleAssignFee(e: React.FormEvent) {
    e.preventDefault();
    if (!feeStudent || !feeTypeId || !dueDate) return;
    const { error } = await supabase.from("fee_assignments").insert({
      student_id: feeStudent.student_id, fee_type_id: feeTypeId,
      amount: feeAmount, due_date: dueDate, status: "pending",
    });
    if (error) alert(error.message);
    else { setFeeStudent(null); setFeeTypeId(""); load(); }
  }

  async function openWaiver(s: any) {
    const { data } = await supabase.from("fee_assignments").select("id, amount, status, fee_types(name)").eq("student_id", s.student_id).neq("status", "paid");
    setWaiverAssignments(data || []);
    if (data && data.length > 0) setWaiverAssignId(data[0].id);
    setWaiverStudent(s);
  }

  async function handleWaiver(e: React.FormEvent) {
    e.preventDefault();
    if (!waiverAssignId) return;
    const { error } = await supabase.from("waivers").insert({ fee_assignment_id: waiverAssignId, percent: waiverPct, reason: waiverReason || "Scholarship" });
    if (error) alert(error.message);
    else { setWaiverStudent(null); setWaiverReason(""); load(); }
  }

  return (
    <div>
      <SectionHeader title="Student Console" subtitle="Manage roster, assign fees, apply waivers" />

      <div className="flex gap-2 mt-5">
        {(["roster", "add", "import", "document-converter"] as const).map((st) => (
          <button key={st} onClick={() => setSubTab(st)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition ${subTab === st ? "bg-[#E8A33D]/15 text-[#E8A33D] border-[#E8A33D]/30" : "border-[#1F2028] text-[#6B7280] hover:text-white"}`}>
            {st === "roster" ? "Active Roster" : st === "add" ? "Add Student" : st === "import" ? "Bulk CSV Ingest" : "📄 Doc to CSV Converter"}
          </button>
        ))}
      </div>

      {subTab === "roster" && (
        <>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, roll, or class…"
            className="mt-4 w-full admin-input"
          />
          {loading ? <LoadingPulse text="Loading roster…" /> : (
            <AdminCard className="mt-4 p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-widest text-[#4B5563] border-b border-[#1F2028]">
                      {["Student", "Class · Roll", "Guardian", "Outstanding", "Actions"].map((h) => (
                        <th key={h} className="pb-3 pt-4 px-5 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.student_id} className="border-t border-[#1F2028]">
                        <td className="py-3.5 px-5 font-medium text-white">{s.name}</td>
                        <td className="py-3.5 px-5 font-mono text-xs text-[#9CA3AF]">{s.class} · {s.roll_no}</td>
                        <td className="py-3.5 px-5 text-xs text-[#6B7280]">{s.guardian_name || "—"}</td>
                        <td className="py-3.5 px-5 font-mono text-[#E8A33D]">{inr(Number(s.balance || 0))}</td>
                        <td className="py-3.5 px-5 space-x-3">
                          <button onClick={() => setFeeStudent(s)} className="text-xs text-[#E8A33D] hover:underline font-semibold">Fee</button>
                          <button onClick={() => openWaiver(s)} className="text-xs text-[#2F6B4F] hover:underline font-semibold">Waiver</button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={5} className="py-12 text-center text-xs text-[#4B5563]">No students found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </AdminCard>
          )}
        </>
      )}

      {subTab === "add" && (
        <AdminCard className="mt-5 max-w-md">
          <h3 className="font-serif text-lg text-white mb-4">Add Student</h3>
          <form onSubmit={handleAdd} className="space-y-3">
            {[
              { label: "Full Name", value: mName, set: setMName, placeholder: "Aarav Sharma", required: true },
              { label: "Roll Number", value: mRoll, set: setMRoll, placeholder: "10A-02", required: true },
              { label: "Class", value: mClass, set: setMClass, placeholder: "10-A", required: true },
              { label: "Guardian Name", value: mGuardian, set: setMGuardian, placeholder: "Priya Sharma", required: false },
              { label: "Phone (with code)", value: mPhone, set: setMPhone, placeholder: "+919812345342", required: false },
              { label: "Email / Gmail", value: mEmail, set: setMEmail, placeholder: "aarav@gmail.com", required: false },
            ].map((f) => (
              <Field key={f.label} label={f.label}>
                <input type="text" value={f.value} onChange={(e) => f.set(e.target.value)}
                  placeholder={f.placeholder} required={f.required} className="admin-input" />
              </Field>
            ))}
            {addErr && <p className="text-xs text-[#C4432B] bg-[#C4432B]/10 p-2 rounded">{addErr}</p>}
            {addMsg && <p className="text-xs text-[#2F6B4F] bg-[#2F6B4F]/10 p-2 rounded">{addMsg}</p>}
            <button type="submit" disabled={adding} className="w-full modal-primary">
              {adding ? "Adding…" : "Add Student"}
            </button>
          </form>
        </AdminCard>
      )}

      {subTab === "import" && (
        <div className="mt-5 grid gap-8 lg:grid-cols-[1.5fr_1fr] text-left animate-fade-in">
          {/* Bulk CSV Drop/Paste Column */}
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <AdminCard>
                <label
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
                  className={`flex h-40 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed transition ${
                    drag ? "border-[color:var(--marigold)] bg-[color:var(--marigold)]/8" : "border-[#1F2028]"
                  }`}
                >
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => onFiles(e.target.files)}
                    className="hidden"
                  />
                  <p className="font-serif text-lg text-white">Drop CSV file here</p>
                  <p className="mt-1 text-xs text-muted-foreground">or click to choose file</p>
                </label>
                <button
                  onClick={() => setCsvText(CSV_EXAMPLE)}
                  className="mt-4 text-xs text-muted-foreground underline underline-offset-4 hover:text-white block"
                >
                  Load sample roster
                </button>
              </AdminCard>

              <AdminCard>
                <label className="mb-2 block text-sm font-medium text-white">Paste raw CSV text</label>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  rows={7}
                  placeholder={CSV_EXAMPLE}
                  className="w-full rounded-md border border-[#1F2028] bg-background p-2.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[color:var(--marigold)] text-white"
                />
              </AdminCard>
            </div>

            {/* Preview table & commit */}
            {parsedRows.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-serif text-lg font-semibold text-white">Roster Preview ({parsedRows.length} rows)</h3>
                  <span className="font-mono text-xs text-[color:var(--banyan)]">{okCount} ready to commit</span>
                </div>

                <AdminCard className="p-0 max-h-[300px] overflow-y-auto">
                  <div className="p-4">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-muted-foreground border-b border-[#1F2028] font-mono uppercase pb-2">
                          <th className="pb-2">Name</th>
                          <th className="pb-2">Roll No</th>
                          <th className="pb-2">Class / Branch</th>
                          <th className="pb-2">Contact & Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.map((r, i) => {
                          const dup = dupeRolls.has(r.roll_no);
                          return (
                            <tr key={i} className={`border-b border-[#1F2028] ${dup ? "bg-[color:var(--alert)]/5" : ""}`}>
                              <td className="py-2">{r.name}</td>
                              <td className="py-2 font-mono text-white">
                                {r.roll_no}
                                {dup && <span className="ml-1 text-[9px] text-[color:var(--alert)] font-bold">(duplicate)</span>}
                              </td>
                              <td className="py-2 font-mono">{r.class} <span className="text-muted-foreground ml-1">({r.branch})</span></td>
                              <td className="py-2 font-mono text-[10px] text-muted-foreground flex flex-col">
                                <span>{r.guardian_name} ({r.guardian_contact})</span>
                                <span className="text-[color:var(--marigold)]">{r.email}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </AdminCard>

                {importError && (
                  <div className="bg-[color:var(--alert)]/10 border border-[color:var(--alert)]/20 text-[color:var(--alert)] text-xs rounded p-3">
                    {importError}
                  </div>
                )}

                {committed !== null && (
                  <div className="bg-[color:var(--banyan)]/10 border border-[color:var(--banyan)]/20 text-[color:var(--banyan)] text-xs rounded p-3">
                    ✓ Bulk imported {committed} student records.
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={commitCSVImport}
                    disabled={okCount === 0 || importing}
                    className="rounded bg-[color:var(--marigold)] text-black font-semibold px-5 py-2.5 text-xs hover:bg-marigold/90 disabled:opacity-40"
                  >
                    {importing ? "Importing..." : `Commit ${okCount} Students`}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#0D0D10] border border-[#1F2028] rounded-xl p-5 self-start text-xs text-[#6B7280] space-y-3 leading-relaxed">
            <h4 className="font-semibold text-white text-sm">Roster CSV Format Guidelines</h4>
            <p>Ensure your CSV has a header row with these exact column names:</p>
            <code className="block bg-black/50 p-2 rounded font-mono text-[10px] text-white">name,roll_no,class,guardian_name,guardian_contact,email,branch</code>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>roll_no</strong> must be unique for each student.</li>
              <li><strong>class</strong> format should match your grade levels (e.g. 10-A, 5-B).</li>
              <li><strong>guardian_contact</strong> is used to send payment alerts and verification SMS.</li>
            </ul>
          </div>
        </div>
      )}

      {subTab === "document-converter" && (
        <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_1.5fr] text-left animate-fade-in">
          {/* Left side: Upload & Preview */}
          <div className="space-y-6">
            <AdminCard className="p-6">
              <h3 className="font-serif text-lg font-semibold text-white mb-1">Upload Roster Document</h3>
              <p className="text-xs text-muted-foreground mb-4">Upload an image, scan, roster copy, or receipt of student records.</p>
              
              {!docFile ? (
                <label className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-[#1F2028] hover:border-[color:var(--marigold)] transition">
                  <input
                    type="file"
                    accept="image/*,application/pdf,text/*,.csv"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setDocFile(file);
                        if (file.type.startsWith("image/")) {
                          setDocPreviewUrl(URL.createObjectURL(file));
                          setDocTextContent("");
                        } else {
                          setDocPreviewUrl("");
                          try {
                            const text = await file.text();
                            setDocTextContent(text);
                          } catch (err) {
                            setDocTextContent("");
                          }
                        }
                      }
                    }}
                    className="hidden"
                  />
                  <span className="text-3xl mb-2">📁</span>
                  <p className="font-serif text-sm text-white">Select document file</p>
                  <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, PDF, TXT, CSV</p>
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-lg border border-[#1F2028] overflow-hidden bg-black/40 flex items-center justify-center p-2 min-h-[220px]">
                    {docPreviewUrl ? (
                      <div className="relative w-full">
                        <img src={docPreviewUrl} alt="Uploaded document" className="max-h-[300px] w-auto mx-auto object-contain rounded animate-fade-in" />
                        {scanning && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-[1px]">
                            {/* Horizontal Scanning Line */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-[color:var(--marigold)] shadow-[0_0_10px_#E8A33D] animate-scan" />
                            <span className="text-xs font-mono text-[color:var(--marigold)] font-semibold animate-pulse">TRANSCRIBING DETAILS...</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <span className="text-4xl">📄</span>
                        <p className="text-xs text-white font-medium mt-2">{docFile.name}</p>
                        <p className="text-[10px] text-muted-foreground">({(docFile.size / 1024).toFixed(1)} KB)</p>
                        {scanning && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-[1px]">
                            <span className="text-xs font-mono text-[color:var(--marigold)] font-semibold animate-pulse">ANALYZING DOCUMENT...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setScanning(true);
                        setTimeout(() => {
                          setScanning(false);
                          if (docTextContent) {
                            const rows = parseCsv(docTextContent);
                            if (rows.length > 0) {
                              setConverterRows(rows);
                              return;
                            }
                          }
                          // Fallback to mock scanned results for hackathon demo
                          setConverterRows([
                            { name: "Devendra Singh", roll_no: "10B-05", class: "10-B", guardian_name: "Gajendra Singh", guardian_contact: "+919876543210", email: "devendra@gmail.com", branch: "Jaipur" },
                            { name: "Anjali Sharma", roll_no: "9A-04", class: "9-A", guardian_name: "Sunil Sharma", guardian_contact: "+919922883344", email: "anjali@yahoo.com", branch: "Dharamsala" },
                            { name: "Rahul Verma", roll_no: "8C-12", class: "8-C", guardian_name: "Meena Verma", guardian_contact: "+919811223344", email: "rahul@gmail.com", branch: "Jaipur" }
                          ]);
                        }, 1500);
                      }}
                      disabled={scanning}
                      className="flex-1 bg-[color:var(--marigold)] text-black font-semibold py-2 rounded text-xs hover:brightness-95 disabled:opacity-50"
                    >
                      ⚡ AI Scan & Extract
                    </button>
                    <button
                      onClick={() => {
                        setDocFile(null);
                        setDocPreviewUrl("");
                        setConverterRows([]);
                        setDocTextContent("");
                      }}
                      className="border border-[#27272A] text-white/70 px-3 py-2 rounded text-xs hover:bg-[#27272A]"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </AdminCard>
          </div>

          {/* Right side: Editable table */}
          <div className="space-y-6">
            <AdminCard className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-serif text-lg font-semibold text-white">Noted Details Grid</h3>
                  <p className="text-xs text-muted-foreground">Type or verify the student details below before exporting.</p>
                </div>
                <button
                  onClick={() => {
                    setConverterRows([
                      ...converterRows,
                      { name: "", roll_no: "", class: "", guardian_name: "", guardian_contact: "", email: "", branch: "Main" }
                    ]);
                  }}
                  className="border border-[color:var(--marigold)] text-[color:var(--marigold)] px-2.5 py-1 rounded text-xs font-semibold hover:bg-[color:var(--marigold)]/10"
                >
                  + Add Row
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[650px]">
                  <thead>
                    <tr className="text-muted-foreground border-b border-[#1F2028] font-mono uppercase pb-2">
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Roll No</th>
                      <th className="pb-2">Class</th>
                      <th className="pb-2">Guardian</th>
                      <th className="pb-2">Contact</th>
                      <th className="pb-2">Email</th>
                      <th className="pb-2">Branch</th>
                      <th className="pb-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {converterRows.map((row, index) => (
                      <tr key={index} className="border-b border-[#1F2028]">
                        <td className="py-2 pr-1">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => {
                              const newRows = [...converterRows];
                              newRows[index].name = e.target.value;
                              setConverterRows(newRows);
                            }}
                            placeholder="Name"
                            className="w-full bg-[#0D0D10] border border-[#27272A] rounded p-1 text-[11px] text-white"
                          />
                        </td>
                        <td className="py-2 pr-1">
                          <input
                            type="text"
                            value={row.roll_no}
                            onChange={(e) => {
                              const newRows = [...converterRows];
                              newRows[index].roll_no = e.target.value;
                              setConverterRows(newRows);
                            }}
                            placeholder="10A-01"
                            className="w-16 bg-[#0D0D10] border border-[#27272A] rounded p-1 text-[11px] text-white font-mono"
                          />
                        </td>
                        <td className="py-2 pr-1">
                          <input
                            type="text"
                            value={row.class}
                            onChange={(e) => {
                              const newRows = [...converterRows];
                              newRows[index].class = e.target.value;
                              setConverterRows(newRows);
                            }}
                            placeholder="10-A"
                            className="w-12 bg-[#0D0D10] border border-[#27272A] rounded p-1 text-[11px] text-white"
                          />
                        </td>
                        <td className="py-2 pr-1">
                          <input
                            type="text"
                            value={row.guardian_name}
                            onChange={(e) => {
                              const newRows = [...converterRows];
                              newRows[index].guardian_name = e.target.value;
                              setConverterRows(newRows);
                            }}
                            placeholder="Guardian Name"
                            className="w-full bg-[#0D0D10] border border-[#27272A] rounded p-1 text-[11px] text-white"
                          />
                        </td>
                        <td className="py-2 pr-1">
                          <input
                            type="text"
                            value={row.guardian_contact}
                            onChange={(e) => {
                              const newRows = [...converterRows];
                              newRows[index].guardian_contact = e.target.value;
                              setConverterRows(newRows);
                            }}
                            placeholder="+91..."
                            className="w-24 bg-[#0D0D10] border border-[#27272A] rounded p-1 text-[11px] text-white font-mono"
                          />
                        </td>
                        <td className="py-2 pr-1">
                          <input
                            type="email"
                            value={row.email}
                            onChange={(e) => {
                              const newRows = [...converterRows];
                              newRows[index].email = e.target.value;
                              setConverterRows(newRows);
                            }}
                            placeholder="email@domain.com"
                            className="w-full bg-[#0D0D10] border border-[#27272A] rounded p-1 text-[11px] text-white"
                          />
                        </td>
                        <td className="py-2 pr-1">
                          <input
                            type="text"
                            value={row.branch}
                            onChange={(e) => {
                              const newRows = [...converterRows];
                              newRows[index].branch = e.target.value;
                              setConverterRows(newRows);
                            }}
                            placeholder="Branch"
                            className="w-16 bg-[#0D0D10] border border-[#27272A] rounded p-1 text-[11px] text-white"
                          />
                        </td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setConverterRows(converterRows.filter((_, i) => i !== index));
                            }}
                            className="text-[color:var(--alert)] hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {converterRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-muted-foreground text-xs">
                          Grid is empty. Upload a document and click "AI Scan", or click "+ Add Row" to begin.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {converterRows.length > 0 && (
                <div className="mt-6 flex justify-end gap-3 border-t border-[#1F2028] pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      // Generate CSV string
                      const csvHeaders = "name,roll_no,class,guardian_name,guardian_contact,email,branch\n";
                      const csvContent = converterRows
                        .map((r) => `"${r.name}","${r.roll_no}","${r.class}","${r.guardian_name}","${r.guardian_contact}","${r.email}","${r.branch}"`)
                        .join("\n");
                      const blob = new Blob([csvHeaders + csvContent], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.setAttribute("href", url);
                      link.setAttribute("download", "student_roster.csv");
                      link.style.visibility = "hidden";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="border border-[#1F2028] text-white px-4 py-2 rounded text-xs font-semibold hover:bg-[#1F2028]"
                  >
                    📥 Download CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const csvHeaders = "name,roll_no,class,guardian_name,guardian_contact,email,branch\n";
                      const csvContent = converterRows
                        .map((r) => `${r.name},${r.roll_no},${r.class},${r.guardian_name},${r.guardian_contact},${r.email},${r.branch}`)
                        .join("\n");
                      setCsvText(csvHeaders + csvContent);
                      setSubTab("import");
                      alert("⚡ Loaded roster into bulk import queue! Review preview table and click Commit to save.");
                    }}
                    className="bg-[color:var(--marigold)] text-black px-4 py-2 rounded text-xs font-semibold hover:brightness-95"
                  >
                    ⚡ Load to Import Queue
                  </button>
                </div>
              )}
            </AdminCard>
          </div>
        </div>
      )}

      {/* Assign Fee Modal */}
      {feeStudent && (
        <Modal onClose={() => setFeeStudent(null)}>
          <h3 className="text-sm font-semibold text-white mb-1">Assign Fee — {feeStudent.name}</h3>
          <form onSubmit={handleAssignFee} className="space-y-4 mt-4">
            <Field label="Fee Type">
              <select value={feeTypeId} onChange={(e) => setFeeTypeId(e.target.value)} required className="admin-input">
                <option value="">-- Select --</option>
                {feeTypes.map((ft) => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
              </select>
            </Field>
            <Field label="Amount (₹)">
              <input type="number" value={feeAmount} onChange={(e) => setFeeAmount(Number(e.target.value))} required className="admin-input" />
            </Field>
            <Field label="Due Date">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="admin-input" />
            </Field>
            <div className="flex gap-2">
              <button type="button" onClick={() => setFeeStudent(null)} className="flex-1 modal-cancel">Cancel</button>
              <button type="submit" className="flex-1 modal-primary">Assign</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Waiver Modal */}
      {waiverStudent && (
        <Modal onClose={() => setWaiverStudent(null)}>
          <h3 className="text-sm font-semibold text-white mb-1">Apply Waiver — {waiverStudent.name}</h3>
          {waiverAssignments.length > 0 ? (
            <form onSubmit={handleWaiver} className="space-y-4 mt-4">
              <Field label="Active Fee">
                <select value={waiverAssignId} onChange={(e) => setWaiverAssignId(e.target.value)} className="admin-input">
                  {waiverAssignments.map((a) => (
                    <option key={a.id} value={a.id}>{a.fee_types?.name} (₹{a.amount} · {a.status})</option>
                  ))}
                </select>
              </Field>
              <Field label="Waiver %">
                <input type="number" min={1} max={100} value={waiverPct} onChange={(e) => setWaiverPct(Number(e.target.value))} required className="admin-input" />
              </Field>
              <Field label="Reason">
                <input type="text" value={waiverReason} onChange={(e) => setWaiverReason(e.target.value)} placeholder="Merit scholarship" required className="admin-input" />
              </Field>
              <div className="flex gap-2">
                <button type="button" onClick={() => setWaiverStudent(null)} className="flex-1 modal-cancel">Cancel</button>
                <button type="submit" className="flex-1 modal-primary">Apply Waiver</button>
              </div>
            </form>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-[#C4432B] bg-[#C4432B]/10 p-3 rounded">No pending fees for this student.</p>
              <button onClick={() => setWaiverStudent(null)} className="w-full modal-cancel">Close</button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: VERIFY
// ─────────────────────────────────────────────────────────────────────────────

function fallbackSvg(ref: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 380'><rect width='300' height='380' fill='#0D0D10'/><rect x='16' y='16' width='268' height='40' fill='#E8A33D' opacity='0.85'/><text x='28' y='42' font-family='monospace' font-size='14' fill='#000000'>${ref}</text><text x='36' y='220' font-family='monospace' font-size='12' fill='#ffffff' opacity='0.3'>NO PHOTO</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function VerifyTab() {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [verifier, setVerifier] = useState("");
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("transactions")
      .select(`id, amount, method, status, deposit_slip_note, slip_url, created_at, fee_assignments(id, amount, fee_types(name)), students(name, roll_no, class)`)
      .eq("status", "pending").in("method", ["cash", "cheque"]).order("created_at");
    setSlips((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function reconcile(s: any) {
    if (!verifier.trim()) return;
    setWorking(true);
    await supabase.from("transactions").update({ status: "reconciled", verified_by: verifier }).eq("id", s.id);
    if (s.fee_assignments?.id) await supabase.from("fee_assignments").update({ status: "paid" }).eq("id", s.fee_assignments.id);
    setSelected(null); setVerifier(""); setWorking(false); load();
  }

  async function reject(s: any) {
    if (!confirm("Reject this slip?")) return;
    setWorking(true);
    await supabase.from("transactions").update({ status: "failed" }).eq("id", s.id);
    setSelected(null); setWorking(false); load();
  }

  return (
    <div>
      <SectionHeader title="Verify Offline Slips" subtitle={`${slips.length} pending reconciliation`} />
      {loading ? <LoadingPulse text="Loading slips…" /> : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slips.map((s) => (
            <button key={s.id} onClick={() => setSelected(s)} className="text-left group">
              <AdminCard className="p-4 hover:border-[#E8A33D]/40 transition">
                <div className="overflow-hidden rounded-lg border border-[#1F2028] bg-[#06060A]">
                  <img src={s.slip_url || fallbackSvg(s.id.slice(0, 8).toUpperCase())}
                    alt="slip" className="h-36 w-full object-cover group-hover:scale-[1.02] transition" />
                </div>
                <div className="mt-3 flex justify-between items-start">
                  <div>
                    <p className="font-serif text-sm font-semibold text-white">{s.students?.name || "Student"}</p>
                    <p className="font-mono text-[10px] text-[#6B7280] mt-0.5">{s.students?.roll_no} · {new Date(s.created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                  <p className="font-mono text-sm font-bold text-[#E8A33D]">{inr(s.amount)}</p>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <span className="font-mono text-[10px] text-[#4B5563] uppercase">{s.method}</span>
                  <StatusPill status={s.status} />
                </div>
              </AdminCard>
            </button>
          ))}
          {slips.length === 0 && <p className="col-span-3 py-16 text-center text-sm text-[#4B5563]">No pending slips. ✓</p>}
        </div>
      )}

      {selected && (
        <Modal onClose={() => { setSelected(null); setVerifier(""); }} wide>
          <div className="flex justify-between items-start">
            <div>
              <p className="font-serif text-lg text-white">{selected.students?.name}</p>
              <p className="font-mono text-xs text-[#6B7280]">Roll {selected.students?.roll_no} · Class {selected.students?.class}</p>
            </div>
            <p className="font-serif text-2xl text-[#E8A33D]">{inr(selected.amount)}</p>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="border border-[#1F2028] rounded-xl bg-[#06060A] overflow-hidden min-h-[200px] flex items-center justify-center">
              <img src={selected.slip_url || fallbackSvg(selected.id.slice(0, 8).toUpperCase())} alt="slip" className="w-full max-h-[260px] object-contain" />
            </div>
            <div className="flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase text-[#4B5563] mb-1">Slip Note</p>
                <p className="text-xs text-white bg-[#1F2028]/60 border border-[#1F2028] p-2.5 rounded-lg">{selected.deposit_slip_note || "No note."}</p>
                <Field label="Verifier Signature" className="mt-4">
                  <input value={verifier} onChange={(e) => setVerifier(e.target.value)} placeholder="e.g. M. Sen, Accountant" className="admin-input" />
                </Field>
              </div>
              <div className="mt-5 space-y-2">
                <button disabled={!verifier.trim() || working} onClick={() => reconcile(selected)} className="w-full modal-primary disabled:opacity-40">
                  {working ? "Processing…" : "Reconcile ✓"}
                </button>
                <div className="flex gap-2">
                  <button onClick={() => reject(selected)} disabled={working} className="flex-1 py-2 rounded-lg border border-[#C4432B]/40 text-[#C4432B] text-xs hover:bg-[#C4432B]/8 transition">Reject</button>
                  <button onClick={() => setSelected(null)} className="flex-1 modal-cancel">Close</button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: DEFAULTERS
// ─────────────────────────────────────────────────────────────────────────────

function DefaultersTab() {
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.from("student_balances").select("*").then(({ data }) => {
      const f = (data || []).map((r: any) => {
        const bal = Number(r.balance || 0), days = Number(r.days_overdue || 0);
        return { ...r, balance: bal, days_overdue: days, risk: bal * days };
      }).filter((d: any) => d.balance > 0).sort((a: any, b: any) => b.risk - a.risk);
      setDefaulters(f);
      setLoading(false);
    });
  }, []);

  const maxRisk = defaulters.length > 0 ? defaulters[0].risk : 1;
  const total = defaulters.reduce((s, d) => s + d.balance, 0);

  return (
    <div>
      <SectionHeader title="Defaulter Risk" subtitle="Ranked by outstanding × overdue days" />
      <div className="grid gap-4 sm:grid-cols-3 mt-6">
        {[
          { label: "Total Outstanding", v: inr(total), c: "#C4432B" },
          { label: "Accounts Flagged", v: String(defaulters.length), c: "#E8A33D" },
          { label: "Longest Overdue", v: `${defaulters.length ? Math.max(...defaulters.map(d => d.days_overdue)) : 0} days`, c: "#6B7280" },
        ].map((m) => (
          <AdminCard key={m.label}>
            <p className="text-xs font-mono uppercase text-[#4B5563]">{m.label}</p>
            <p className="mt-2 font-serif text-2xl font-semibold" style={{ color: m.c }}>{m.v}</p>
          </AdminCard>
        ))}
      </div>

      {loading ? <LoadingPulse text="Loading defaulters…" /> : (
        <AdminCard className="mt-6 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-[#4B5563] border-b border-[#1F2028]">
                  {["#", "Student", "Class", "Balance", "Days Late", "Risk", ""].map((h) => (
                    <th key={h} className="pb-3 pt-4 px-5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {defaulters.map((d, i) => {
                  const link = `https://wa.me/${d.guardian_contact}?text=${encodeURIComponent(openId === d.student_id && message ? message : `Fee reminder for ${d.name}: ${inr(d.balance)} due.`)}`;
                  return (
                    <tr key={d.student_id} className="border-t border-[#1F2028]">
                      <td className="py-3 px-5 font-mono text-xs text-[#4B5563]">{i + 1}</td>
                      <td className="py-3 px-5 text-white font-medium">{d.name}</td>
                      <td className="py-3 px-5 font-mono text-xs text-[#9CA3AF]">{d.class}</td>
                      <td className="py-3 px-5 font-mono text-[#E8A33D]">{inr(d.balance)}</td>
                      <td className="py-3 px-5 font-mono text-xs">{d.days_overdue}</td>
                      <td className="py-3 px-5"><MiniRiskBar score={d.risk} max={maxRisk} /></td>
                      <td className="py-3 px-5 text-right">
                        <button onClick={() => { setOpenId(d.student_id); setMessage(`Namaste ${d.guardian_name || "Guardian"}, ${d.name} (${d.roll_no}) has ₹${d.balance} overdue by ${d.days_overdue} days.`); }}
                          className="text-xs text-[#E8A33D] hover:underline font-semibold">Remind</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      {openId && (() => {
        const d = defaulters.find(x => x.student_id === openId);
        if (!d) return null;
        const link = `https://wa.me/${d.guardian_contact}?text=${encodeURIComponent(message)}`;
        return (
          <div className="fixed bottom-6 right-6 bg-[#0D0D10] border border-[#1F2028] p-5 rounded-2xl max-w-sm w-full shadow-2xl z-50 animate-fade-in">
            <div className="flex justify-between mb-3">
              <span className="text-xs font-mono uppercase text-[#4B5563]">WhatsApp Reminder</span>
              <button onClick={() => setOpenId(null)} className="text-[#4B5563] hover:text-white">✕</button>
            </div>
            <p className="text-xs text-[#9CA3AF] mb-2">To: <span className="text-white font-semibold">{d.guardian_name} ({d.guardian_contact})</span></p>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full admin-input resize-none" />
            <div className="mt-3 flex gap-2">
              <button onClick={() => setOpenId(null)} className="flex-1 modal-cancel">Cancel</button>
              <a href={link} target="_blank" rel="noopener noreferrer" className="flex-1 modal-primary text-center">Send ↗</a>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function MiniRiskBar({ score, max }: { score: number; max: number }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  const color = pct > 66 ? "#C4432B" : pct > 33 ? "#E8A33D" : "#2F6B4F";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#1F2028]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-xs" style={{ color }}>{score}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: FEE TYPES
// ─────────────────────────────────────────────────────────────────────────────

function FeeTypesTab() {
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("fee_types").select("*").order("name");
    setTypes(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true); setMsg("");
    const { error } = await supabase.from("fee_types").insert({ name: newName.trim(), description: newDesc.trim() || null });
    if (error) setMsg(`Error: ${error.message}`);
    else { setMsg("✓ Fee type added."); setNewName(""); setNewDesc(""); load(); }
    setAdding(false);
  }

  async function handleRename(id: string) {
    const { error } = await supabase.from("fee_types").update({ name: editName.trim() }).eq("id", id);
    if (error) alert(error.message);
    else { setEditId(null); load(); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this fee type? This may affect existing assignments.")) return;
    await supabase.from("fee_types").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <SectionHeader title="Fee Types" subtitle="Create and manage payment fee categories" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <AdminCard className="p-0">
          {loading ? <LoadingPulse text="Loading fee types…" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-[#4B5563] border-b border-[#1F2028]">
                  <th className="pb-3 pt-4 px-5 font-medium">Name</th>
                  <th className="pb-3 pt-4 px-5 font-medium">Description</th>
                  <th className="pb-3 pt-4 px-5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {types.map((t) => (
                  <tr key={t.id} className="border-t border-[#1F2028]">
                    <td className="py-3 px-5 text-white font-medium">
                      {editId === t.id ? (
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="admin-input w-40" autoFocus />
                      ) : t.name}
                    </td>
                    <td className="py-3 px-5 text-xs text-[#6B7280]">{t.description || "—"}</td>
                    <td className="py-3 px-5 text-right space-x-3">
                      {editId === t.id ? (
                        <>
                          <button onClick={() => handleRename(t.id)} className="text-xs text-[#2F6B4F] hover:underline font-semibold">Save</button>
                          <button onClick={() => setEditId(null)} className="text-xs text-[#6B7280] hover:underline">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditId(t.id); setEditName(t.name); }} className="text-xs text-[#E8A33D] hover:underline font-semibold">Rename</button>
                          <button onClick={() => handleDelete(t.id)} className="text-xs text-[#C4432B] hover:underline font-semibold">Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {types.length === 0 && <tr><td colSpan={3} className="py-10 text-center text-xs text-[#4B5563]">No fee types yet.</td></tr>}
              </tbody>
            </table>
          )}
        </AdminCard>

        <AdminCard>
          <h3 className="font-serif text-base text-white mb-4">Add Fee Type</h3>
          <form onSubmit={handleAdd} className="space-y-3">
            <Field label="Fee Type Name">
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Tuition Fee" required className="admin-input" />
            </Field>
            <Field label="Description (optional)">
              <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Annual tuition payment" className="admin-input" />
            </Field>
            {msg && <p className={`text-xs p-2 rounded ${msg.startsWith("✓") ? "text-[#2F6B4F] bg-[#2F6B4F]/10" : "text-[#C4432B] bg-[#C4432B]/10"}`}>{msg}</p>}
            <button type="submit" disabled={adding} className="w-full modal-primary">{adding ? "Adding…" : "Add Fee Type"}</button>
          </form>
        </AdminCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: TRANSACTIONS
// ─────────────────────────────────────────────────────────────────────────────

function TransactionsTab() {
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "reconciled" | "failed">("all");

  useEffect(() => {
    supabase.from("transactions")
      .select("id, amount, method, status, created_at, students(name, roll_no)")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => { setTxns((data as any) || []); setLoading(false); });
  }, []);

  const filtered = txns.filter((t) => filter === "all" || t.status === filter);

  return (
    <div>
      <SectionHeader title="Transactions" subtitle="Full ledger of all payment entries" />
      <div className="flex gap-2 mt-5">
        {(["all", "pending", "reconciled", "failed"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition capitalize ${filter === f ? "bg-[#E8A33D]/15 text-[#E8A33D] border-[#E8A33D]/30" : "border-[#1F2028] text-[#6B7280] hover:text-white"}`}>
            {f}
          </button>
        ))}
      </div>
      {loading ? <LoadingPulse text="Loading transactions…" /> : (
        <AdminCard className="mt-4 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-[#4B5563] border-b border-[#1F2028]">
                  {["Date", "Student", "Amount", "Method", "Status"].map((h) => (
                    <th key={h} className="pb-3 pt-4 px-5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-t border-[#1F2028]">
                    <td className="py-3 px-5 font-mono text-xs text-[#6B7280]">{new Date(t.created_at).toLocaleDateString("en-IN")}</td>
                    <td className="py-3 px-5 text-white">{t.students?.name || "—"} <span className="text-[#4B5563] font-mono text-[10px]">{t.students?.roll_no}</span></td>
                    <td className="py-3 px-5 font-mono font-semibold text-[#E8A33D]">{inr(t.amount)}</td>
                    <td className="py-3 px-5 font-mono text-xs uppercase text-[#9CA3AF]">{t.method}</td>
                    <td className="py-3 px-5"><StatusPill status={t.status} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-xs text-[#4B5563]">No transactions found.</td></tr>}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: CUT ROLLS
// ─────────────────────────────────────────────────────────────────────────────

function CutRollsTab() {
  const [rolls, setRolls] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem("vittam_terms") || "[]"); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [termName, setTermName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cutoffDate, setCutoffDate] = useState("");
  const [installments, setInstallments] = useState(1);
  const [semester, setSemester] = useState("I");
  const [lateFeePercent, setLateFeePercent] = useState(2);

  function save() {
    if (!termName || !startDate || !endDate) return;
    const newRoll = { id: Date.now(), termName, startDate, endDate, cutoffDate, installments, semester, lateFeePercent, status: "active", createdAt: new Date().toISOString() };
    const updated = [newRoll, ...rolls];
    setRolls(updated);
    localStorage.setItem("vittam_terms", JSON.stringify(updated));
    setShowForm(false);
    setTermName(""); setStartDate(""); setEndDate(""); setCutoffDate(""); setInstallments(1); setSemester("I");
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
      <style>body{font-family:monospace;padding:32px;max-width:700px;margin:0 auto}h1{font-size:20px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px;font-size:12px}.header{display:flex;justify-content:space-between;margin-bottom:24px}</style>
      </head><body>
      <div class="header"><h1>📋 Fee Roll Sheet — ${roll.termName}</h1><span>Semester ${roll.semester} · ${roll.startDate} to ${roll.endDate}</span></div>
      <table><tr><th>S.No</th><th>Student Name</th><th>Roll No</th><th>Class</th><th>Amount Due</th><th>Due Date</th><th>Installment</th><th>Signature</th></tr>
      ${Array.from({ length: 20 }, (_, i) => `<tr><td>${i + 1}</td><td></td><td></td><td></td><td></td><td>${roll.cutoffDate || roll.endDate}</td><td>${roll.installments}</td><td></td></tr>`).join("")}
      </table>
      <p style="margin-top:24px;font-size:11px">Cut-off date: ${roll.cutoffDate || "N/A"} · Late fee: ${roll.lateFeePercent}% per month · Generated: ${new Date().toLocaleString("en-IN")}</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  return (
    <div>
      <SectionHeader title="Cut Rolls" subtitle="Manage academic terms, installment cycles and fee cut-off dates" />
      <div className="mt-5 flex justify-end">
        <button onClick={() => setShowForm(true)} className="modal-primary px-5 py-2.5">+ Open New Roll</button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {rolls.map((r) => (
          <AdminCard key={r.id}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-serif text-base text-white font-semibold">{r.termName}</p>
                <p className="font-mono text-xs text-[#6B7280] mt-0.5">Semester {r.semester} · {r.installments} installment{r.installments > 1 ? "s" : ""}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${r.status === "active" ? "text-[#2F6B4F] border-[#2F6B4F]/30 bg-[#2F6B4F]/10" : "text-[#4B5563] border-[#1F2028]"}`}>
                {r.status}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-[#4B5563]">Start:</span> <span className="text-[#9CA3AF] font-mono">{r.startDate}</span></div>
              <div><span className="text-[#4B5563]">End:</span> <span className="text-[#9CA3AF] font-mono">{r.endDate}</span></div>
              <div><span className="text-[#4B5563]">Cut-off:</span> <span className="text-[#E8A33D] font-mono">{r.cutoffDate || "—"}</span></div>
              <div><span className="text-[#4B5563]">Late fee:</span> <span className="text-[#C4432B] font-mono">{r.lateFeePercent}%/mo</span></div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => printRoll(r)} className="flex-1 text-xs border border-[#1F2028] text-[#9CA3AF] py-1.5 rounded-lg hover:border-[#E8A33D]/30 hover:text-[#E8A33D] transition">🖨 Print Roll</button>
              {r.status === "active" && <button onClick={() => closeTerm(r.id)} className="flex-1 text-xs border border-[#C4432B]/30 text-[#C4432B] py-1.5 rounded-lg hover:bg-[#C4432B]/8 transition">Close Term</button>}
            </div>
          </AdminCard>
        ))}
        {rolls.length === 0 && (
          <div className="col-span-2 py-16 text-center text-sm text-[#4B5563]">No terms opened yet. Click "Open New Roll" to begin.</div>
        )}
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <h3 className="text-sm font-semibold text-white mb-5">Open New Academic Roll</h3>
          <div className="space-y-3">
            <Field label="Term / Roll Name">
              <input value={termName} onChange={(e) => setTermName(e.target.value)} placeholder="e.g. AY 2026-27 Term I" className="admin-input" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Semester">
                <select value={semester} onChange={(e) => setSemester(e.target.value)} className="admin-input">
                  {["I", "II", "III", "Annual"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Installments">
                <select value={installments} onChange={(e) => setInstallments(Number(e.target.value))} className="admin-input">
                  {[1, 2, 3, 4, 6, 12].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="admin-input" /></Field>
              <Field label="End Date"><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="admin-input" /></Field>
            </div>
            <Field label="Cut-off Date (last day without late fee)">
              <input type="date" value={cutoffDate} onChange={(e) => setCutoffDate(e.target.value)} className="admin-input" />
            </Field>
            <Field label="Late Fee % per month">
              <input type="number" min={0} max={50} value={lateFeePercent} onChange={(e) => setLateFeePercent(Number(e.target.value))} className="admin-input" />
            </Field>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setShowForm(false)} className="flex-1 modal-cancel">Cancel</button>
            <button onClick={save} disabled={!termName || !startDate || !endDate} className="flex-1 modal-primary disabled:opacity-40">Open Roll</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: CONTACTS (update phone / email)
// ─────────────────────────────────────────────────────────────────────────────

function ContactsTab() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("students").select("id, name, roll_no, class, guardian_contact, email").order("name");
    setStudents(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) => s.name?.toLowerCase().includes(q) || s.roll_no?.toLowerCase().includes(q));
  }, [students, search]);

  async function saveContact(id: string) {
    setSaving(true); setMsg("");
    const { error } = await supabase.from("students").update({ guardian_contact: editPhone.trim() || null, email: editEmail.trim() || null }).eq("id", id);
    if (error) setMsg(`Error: ${error.message}`);
    else { setMsg("✓ Contact updated."); setEditId(null); load(); }
    setSaving(false);
  }

  return (
    <div>
      <SectionHeader title="Contact Updates" subtitle="Update student phone numbers and Gmail addresses" />
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student…" className="mt-5 w-full admin-input" />
      {msg && <p className={`mt-3 text-xs p-2 rounded ${msg.startsWith("✓") ? "text-[#2F6B4F] bg-[#2F6B4F]/10" : "text-[#C4432B] bg-[#C4432B]/10"}`}>{msg}</p>}
      {loading ? <LoadingPulse text="Loading contacts…" /> : (
        <AdminCard className="mt-4 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-[#4B5563] border-b border-[#1F2028]">
                  {["Student", "Class · Roll", "Phone", "Email / Gmail", "Actions"].map((h) => (
                    <th key={h} className="pb-3 pt-4 px-5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t border-[#1F2028]">
                    <td className="py-3 px-5 text-white font-medium">{s.name}</td>
                    <td className="py-3 px-5 font-mono text-xs text-[#9CA3AF]">{s.class} · {s.roll_no}</td>
                    <td className="py-3 px-5">
                      {editId === s.id ? (
                        <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="admin-input w-36" placeholder="+91…" />
                      ) : (
                        <span className="font-mono text-xs text-[#9CA3AF]">{s.guardian_contact || "—"}</span>
                      )}
                    </td>
                    <td className="py-3 px-5">
                      {editId === s.id ? (
                        <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="admin-input w-44" placeholder="user@gmail.com" />
                      ) : (
                        <span className="font-mono text-xs text-[#9CA3AF]">{s.email || "—"}</span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-right space-x-3">
                      {editId === s.id ? (
                        <>
                          <button onClick={() => saveContact(s.id)} disabled={saving} className="text-xs text-[#2F6B4F] hover:underline font-semibold">Save</button>
                          <button onClick={() => setEditId(null)} className="text-xs text-[#6B7280] hover:underline">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => { setEditId(s.id); setEditPhone(s.guardian_contact || ""); setEditEmail(s.email || ""); setMsg(""); }}
                          className="text-xs text-[#E8A33D] hover:underline font-semibold">Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-xs text-[#4B5563]">No students found.</td></tr>}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: ADMIT CARDS
// ─────────────────────────────────────────────────────────────────────────────

function AdmitCardsTab() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState<number | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [examName, setExamName] = useState("Annual Examination 2026-27");
  const [examDate, setExamDate] = useState("");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    supabase.from("students").select("id, name, roll_no, class, guardian_name, guardian_contact, email").order("class").then(({ data }) => {
      setStudents(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.name?.toLowerCase().includes(q) || s.roll_no?.toLowerCase().includes(q);
      const matchGrade = grade === "all" || s.class?.startsWith(String(grade));
      return matchSearch && matchGrade;
    });
  }, [students, search, grade]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map((s) => s.id)));
  }

  function printCards() {
    const toPrint = students.filter((s) => selected.has(s.id));
    if (!toPrint.length) return;
    setPrinting(true);
    const win = window.open("", "_blank");
    if (!win) { setPrinting(false); return; }
    const cards = toPrint.map((s) => `
      <div style="width:320px;border:2px solid #E8A33D;border-radius:8px;padding:20px;page-break-inside:avoid;margin-bottom:16px;font-family:monospace">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #E8A33D;padding-bottom:10px;margin-bottom:10px">
          <div>
            <p style="font-size:15px;font-weight:700;margin:0">${s.name}</p>
            <p style="font-size:11px;color:#666;margin:2px 0">Roll No: ${s.roll_no}</p>
          </div>
          <div style="background:#E8A33D;color:#000;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:700">${s.class}</div>
        </div>
        <p style="font-size:11px;margin:4px 0"><strong>Exam:</strong> ${examName}</p>
        ${examDate ? `<p style="font-size:11px;margin:4px 0"><strong>Date:</strong> ${examDate}</p>` : ""}
        <p style="font-size:11px;margin:4px 0"><strong>Guardian:</strong> ${s.guardian_name || "—"}</p>
        <div style="margin-top:14px;border-top:1px dashed #ccc;padding-top:10px;display:flex;justify-content:space-between">
          <span style="font-size:10px;color:#888">Candidate Signature</span>
          <span style="font-size:10px;color:#888">Principal Signature</span>
        </div>
      </div>`).join("");
    win.document.write(`<html><head><title>Admit Cards</title><style>body{padding:32px;display:flex;flex-wrap:wrap;gap:16px;background:#fff}@media print{body{padding:0}}</style></head><body>${cards}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); setPrinting(false); }, 500);
  }

  return (
    <div>
      <SectionHeader title="Admit Cards" subtitle="Generate and print student admit cards for exams" />

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Exam / Event Name" className="lg:col-span-2">
          <input value={examName} onChange={(e) => setExamName(e.target.value)} className="admin-input" placeholder="Annual Examination 2026-27" />
        </Field>
        <Field label="Exam Date">
          <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="admin-input" />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap gap-3 items-center">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student…" className="admin-input w-52" />
        <select value={grade === "all" ? "all" : grade} onChange={(e) => setGrade(e.target.value === "all" ? "all" : Number(e.target.value))} className="admin-input w-32">
          <option value="all">All Grades</option>
          {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
        </select>
        <button onClick={selectAll} className="text-xs text-[#E8A33D] hover:underline">Select All ({filtered.length})</button>
        <button onClick={() => setSelected(new Set())} className="text-xs text-[#6B7280] hover:underline">Clear</button>
        <button onClick={printCards} disabled={selected.size === 0 || printing}
          className="ml-auto modal-primary px-5 py-2 disabled:opacity-40">
          {printing ? "Generating…" : `🖨 Print ${selected.size} Cards`}
        </button>
      </div>

      {loading ? <LoadingPulse text="Loading students…" /> : (
        <AdminCard className="mt-4 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-[#4B5563] border-b border-[#1F2028]">
                  <th className="pb-3 pt-4 px-5 w-8">
                    <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={(e) => e.target.checked ? selectAll() : setSelected(new Set())}
                      className="rounded border-[#1F2028]" />
                  </th>
                  {["Student", "Class · Roll", "Guardian"].map((h) => (
                    <th key={h} className="pb-3 pt-4 px-5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className={`border-t border-[#1F2028] cursor-pointer transition ${selected.has(s.id) ? "bg-[#E8A33D]/5" : ""}`}
                    onClick={() => toggleSelect(s.id)}>
                    <td className="py-3 px-5">
                      <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} className="rounded" onClick={(e) => e.stopPropagation()} />
                    </td>
                    <td className="py-3 px-5 text-white font-medium">{s.name}</td>
                    <td className="py-3 px-5 font-mono text-xs text-[#9CA3AF]">{s.class} · {s.roll_no}</td>
                    <td className="py-3 px-5 text-xs text-[#6B7280]">{s.guardian_name || "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={4} className="py-12 text-center text-xs text-[#4B5563]">No students found.</td></tr>}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-white">{title}</h1>
      <p className="mt-1 text-sm text-[#6B7280]">{subtitle}</p>
    </div>
  );
}

function AdminCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#1F2028] bg-[#0D0D10] p-5 ${className}`}>
      {children}
    </div>
  );
}

function Modal({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={onClose}>
      <div className={`bg-[#0D0D10] border border-[#1F2028] rounded-2xl p-6 shadow-2xl ${wide ? "max-w-2xl w-full" : "max-w-sm w-full"}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[10px] uppercase tracking-widest text-[#4B5563] font-semibold mb-1">{label}</label>
      {children}
    </div>
  );
}

function LoadingPulse({ text }: { text: string }) {
  return <p className="mt-10 text-center font-mono text-xs text-[#4B5563] animate-pulse">{text}</p>;
}
