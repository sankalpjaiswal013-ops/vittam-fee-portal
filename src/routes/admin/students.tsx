import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { SiteNav } from "@/components/vittam/SiteNav";
import { ReceiptCard } from "@/components/vittam/ReceiptCard";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { supabase } from "@/lib/supabase";
import { inr } from "@/lib/vittam-mock";

export const Route = createFileRoute("/admin/students")({
  head: () => ({
    meta: [
      { title: "Student Roster Manager — Vittam Admin" },
      { name: "description", content: "Bulk ingest students, add student records, assign fees, and apply scholarship waivers." },
    ],
  }),
  component: IngestStudents,
});

type Row = { name: string; roll_no: string; class: string; guardian_name: string; guardian_contact: string; email: string; branch: string };

const example = `name,roll_no,class,guardian_name,guardian_contact,email,branch
Aarav Sharma,10B-02,10-B,Priya Sharma,+919812345342,priya@gmail.com,Jaipur Yad
Isha Patel,9A-03,9-A,Rakesh Patel,+919900011122,rakesh@gmail.com,Dharams
Kabir Menon,7C-22,7-C,Anita Menon,+919845567780,anita@yahoo.com,Jaipur Yad`;

function parseCsv(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const [header, ...rest] = lines;
  const cols = header.split(",").map((c) => c.trim().toLowerCase());
  return rest.map((line) => {
    const parts = line.split(",").map((c) => c.trim());
    const rec: Record<string, string> = {};
    cols.forEach((c, i) => (rec[c] = parts[i] ?? ""));
    return {
      name: rec.name ?? "",
      roll_no: rec.roll_no ?? "",
      class: rec.class ?? "",
      guardian_name: rec.guardian_name ?? "",
      guardian_contact: rec.guardian_contact ?? "",
      email: rec.email ?? "",
      branch: rec.branch ?? "Main",
    };
  });
}

function IngestStudents() {
  // Enforce staff/admin login check
  const { admin, loading: authLoading } = useRequireAdmin();

  // Active view tab inside IngestStudents: "roster" (list + assign actions) or "import" (bulk + manual creation)
  const [activeSubTab, setActiveSubTab] = useState<"roster" | "import">("roster");

  // Roster lists
  const [students, setStudents] = useState<any[]>([]);
  const [feeTypes, setFeeTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // CSV Bulk states
  const [csvText, setCsvText] = useState("");
  const [drag, setDrag] = useState(false);
  const [committed, setCommitted] = useState<number | null>(null);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);

  // Manual Add Student States
  const [mName, setMName] = useState("");
  const [mRoll, setMRoll] = useState("");
  const [mClass, setMClass] = useState("");
  const [mGuardian, setMGuardian] = useState("");
  const [mPhone, setMPhone] = useState("");
  const [manualSuccess, setManualSuccess] = useState("");
  const [manualError, setManualError] = useState("");

  // Assign Fee Modal States
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [feeAmount, setFeeAmount] = useState(5000);
  const [feeTypeId, setFeeTypeId] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Apply Waiver Modal States
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [activeAssignments, setActiveAssignments] = useState<any[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [waiverPercent, setWaiverPercent] = useState(25);
  const [waiverReason, setWaiverReason] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsRes, feeTypesRes] = await Promise.all([
        supabase.from("student_balances").select("*").order("name", { ascending: true }),
        supabase.from("fee_types").select("*").order("name", { ascending: true })
      ]);

      if (studentsRes.data) setStudents(studentsRes.data);
      if (feeTypesRes.data) setFeeTypes(feeTypesRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (admin) {
      loadData();
    }
  }, [admin]);

  // CSV Parsing preview check
  const parsedRows = useMemo(() => parseCsv(csvText), [csvText]);
  const dupeRolls = useMemo(() => {
    const counts = new Map<string, number>();
    parsedRows.forEach((r) => counts.set(r.roll_no, (counts.get(r.roll_no) ?? 0) + 1));
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([r]) => r));
  }, [parsedRows]);

  async function onFiles(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setCsvText(await f.text());
  }

  const okCount = parsedRows.filter((r) => r.roll_no && !dupeRolls.has(r.roll_no)).length;

  // Insert parsed rows into Supabase
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
        guardian_contact: r.guardian_contact,
        email: r.email,
        branch: r.branch
      }));

    try {
      const { error } = await supabase.from("students").insert(rowsToInsert);
      if (error) {
        setImportError(error.message);
      } else {
        setCommitted(rowsToInsert.length);
        setCsvText("");
        loadData();
      }
    } catch (e: any) {
      setImportError(e.message || "Bulk commit failed.");
    } finally {
      setImporting(false);
    }
  }

  // Create Single Student
  async function handleAddSingle(e: React.FormEvent) {
    e.preventDefault();
    setManualError("");
    setManualSuccess("");

    if (!mName.trim() || !mRoll.trim() || !mClass.trim()) {
      setManualError("Name, Roll Number, and Class are required.");
      return;
    }

    try {
      const { error } = await supabase.from("students").insert({
        name: mName.trim(),
        roll_no: mRoll.trim().toUpperCase(),
        class: mClass.trim(),
        guardian_name: mGuardian.trim() || null,
        guardian_contact: mPhone.trim() || null,
      });

      if (error) {
        setManualError(error.message);
      } else {
        setManualSuccess(`Student "${mName}" added successfully.`);
        setMName(""); setMRoll(""); setMClass(""); setMGuardian(""); setMPhone("");
        loadData();
      }
    } catch (e: any) {
      setManualError(e.message || "Manual creation failed.");
    }
  }

  // Assign Fee Operation
  async function handleAssignFeeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent || !feeTypeId || !dueDate) return;

    try {
      const { error } = await supabase.from("fee_assignments").insert({
        student_id: selectedStudent.student_id,
        fee_type_id: feeTypeId,
        amount: feeAmount,
        due_date: dueDate,
        status: "pending"
      });

      if (error) {
        alert(error.message);
      } else {
        setShowFeeModal(false);
        setSelectedStudent(null);
        setFeeTypeId("");
        loadData();
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  }

  // Fetch pending assignments for waivers dropdown
  async function openWaiverModal(studentRow: any) {
    setSelectedStudent(studentRow);
    try {
      const { data, error } = await supabase
        .from("fee_assignments")
        .select("id, amount, status, fee_types(name)")
        .eq("student_id", studentRow.student_id)
        .neq("status", "paid");
      
      if (data) {
        setActiveAssignments(data);
        if (data.length > 0) setSelectedAssignmentId(data[0].id);
      }
      setShowWaiverModal(true);
    } catch (e) {
      console.error(e);
    }
  }

  // Apply waiver discount
  async function handleApplyWaiverSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAssignmentId) return;

    try {
      const { error } = await supabase.from("waivers").insert({
        fee_assignment_id: selectedAssignmentId,
        percent: waiverPercent,
        reason: waiverReason || "Scholarship discount"
      });

      if (error) {
        alert(error.message);
      } else {
        setShowWaiverModal(false);
        setWaiverReason("");
        loadData();
      }
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <SiteNav />
        <main className="mx-auto max-w-6xl px-6 py-20 text-center font-mono text-sm text-muted-foreground animate-pulse">
          Loading student ledger lists...
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        
        {/* Toggle subtabs */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-serif text-3xl font-semibold">Student console</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage active student rosters, assign fees, and apply discounts.</p>
          </div>
          <div className="flex bg-[#18181B] rounded-lg p-1 border border-[#27272A]">
            <button
              onClick={() => setActiveSubTab("roster")}
              className={`px-4 py-1.5 text-xs font-semibold rounded ${activeSubTab === "roster" ? "bg-[#27272A] text-white" : "text-muted-foreground hover:text-white"}`}
            >
              Active Roster
            </button>
            <button
              onClick={() => setActiveSubTab("import")}
              className={`px-4 py-1.5 text-xs font-semibold rounded ${activeSubTab === "import" ? "bg-[#27272A] text-white" : "text-muted-foreground hover:text-white"}`}
            >
              Add & Ingest
            </button>
          </div>
        </div>

        {activeSubTab === "roster" ? (
          /* Active student ledger list with billing actions */
          <ReceiptCard className="p-0">
            <div className="overflow-x-auto p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Student Name</th>
                    <th className="pb-3 pr-4 font-medium">Class · roll</th>
                    <th className="pb-3 pr-4 font-medium">Guardian contact</th>
                    <th className="pb-3 pr-4 font-medium">Outstanding</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.student_id} className="border-t border-border/60">
                      <td className="py-3.5 pr-4 font-medium text-white">{s.name}</td>
                      <td className="py-3.5 pr-4 font-mono text-xs text-muted-foreground">{s.class} · {s.roll_no}</td>
                      <td className="py-3.5 pr-4 font-mono text-xs text-muted-foreground">{s.guardian_name || "N/A"} ({s.guardian_contact || "N/A"})</td>
                      <td className="py-3.5 pr-4 font-mono text-sm">{inr(Number(s.balance || 0))}</td>
                      <td className="py-3.5 text-right space-x-3">
                        <button
                          onClick={() => { setSelectedStudent(s); setShowFeeModal(true); }}
                          className="text-xs font-semibold text-[color:var(--marigold)] hover:underline"
                        >
                          Assign Fee
                        </button>
                        <button
                          onClick={() => openWaiverModal(s)}
                          className="text-xs font-semibold text-[color:var(--banyan)] hover:underline"
                        >
                          Apply Waiver
                        </button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-muted-foreground">No students found. Use "Add & Ingest" tab to load records.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ReceiptCard>
        ) : (
          /* Bulk Import and Manual Creation panel */
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            
            {/* Bulk CSV Drop/Paste Column */}
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <ReceiptCard>
                  <label
                    onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
                    className={`flex h-40 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed transition ${
                      drag ? "border-[color:var(--marigold)] bg-[color:var(--marigold)]/8" : "border-border"
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
                    onClick={() => setCsvText(example)}
                    className="mt-4 text-xs text-muted-foreground underline underline-offset-4 hover:text-white block"
                  >
                    Load sample roster
                  </button>
                </ReceiptCard>

                <ReceiptCard>
                  <label className="mb-2 block text-sm font-medium text-white">Paste raw CSV text</label>
                  <textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    rows={7}
                    placeholder={example}
                    className="w-full rounded-md border border-input bg-background p-2.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[color:var(--marigold)] text-white"
                  />
                </ReceiptCard>
              </div>

              {/* Preview table & commit */}
              {parsedRows.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-serif text-lg font-semibold text-white">Roster Preview ({parsedRows.length} rows)</h3>
                    <span className="font-mono text-xs text-[color:var(--banyan)]">{okCount} ready to commit</span>
                  </div>

                  <ReceiptCard className="p-0 max-h-[300px] overflow-y-auto">
                    <div className="p-4">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-muted-foreground border-b border-border/40 font-mono uppercase pb-2">
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
                              <tr key={i} className={`border-b border-border/20 ${dup ? "bg-[color:var(--alert)]/5" : ""}`}>
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
                  </ReceiptCard>

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

            {/* Manual student add Form Column */}
            <div>
              <ReceiptCard className="p-6 text-left">
                <h3 className="font-serif text-lg font-semibold text-white mb-1">Create Student</h3>
                <p className="text-xs text-muted-foreground mb-4">Add a single student card to registry manually.</p>
                <form onSubmit={handleAddSingle} className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Student Full Name</label>
                    <input
                      type="text"
                      value={mName}
                      onChange={(e) => setMName(e.target.value)}
                      placeholder="e.g. Aarav Sharma"
                      className="w-full rounded border border-input bg-background p-2 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Roll Number</label>
                    <input
                      type="text"
                      value={mRoll}
                      onChange={(e) => setMRoll(e.target.value)}
                      placeholder="e.g. 10A-02"
                      className="w-full rounded border border-input bg-background p-2 text-xs text-white font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Class</label>
                    <input
                      type="text"
                      value={mClass}
                      onChange={(e) => setMClass(e.target.value)}
                      placeholder="e.g. 10-B"
                      className="w-full rounded border border-input bg-background p-2 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Guardian Name</label>
                    <input
                      type="text"
                      value={mGuardian}
                      onChange={(e) => setMGuardian(e.target.value)}
                      placeholder="Priya Sharma"
                      className="w-full rounded border border-input bg-background p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Guardian Phone (with code)</label>
                    <input
                      type="text"
                      value={mPhone}
                      onChange={(e) => setMPhone(e.target.value)}
                      placeholder="+919812345342"
                      className="w-full rounded border border-input bg-background p-2 text-xs text-white font-mono"
                    />
                  </div>

                  {manualError && (
                    <div className="bg-[color:var(--alert)]/10 border border-[color:var(--alert)]/20 text-[color:var(--alert)] text-xs rounded p-2">
                      {manualError}
                    </div>
                  )}

                  {manualSuccess && (
                    <div className="bg-[color:var(--banyan)]/10 border border-[color:var(--banyan)]/20 text-[color:var(--banyan)] text-xs rounded p-2">
                      {manualSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-[color:var(--marigold)] text-black font-semibold py-2 rounded text-xs hover:brightness-95"
                  >
                    Add Student Card
                  </button>
                </form>
              </ReceiptCard>
            </div>
          </div>
        )}

        {/* Assign Fee Dialog Modal */}
        {showFeeModal && selectedStudent && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50 backdrop-blur-sm" onClick={() => { setShowFeeModal(false); setSelectedStudent(null); }}>
            <div className="bg-[#18181B] border border-[#27272A] max-w-sm w-full p-6 rounded-2xl text-left shadow-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-semibold text-white mb-1">Assign Invoice Charge</h3>
              <p className="text-xs text-muted-foreground mb-4">Assign a new fee invoice to {selectedStudent.name}.</p>
              
              <form onSubmit={handleAssignFeeSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase font-semibold mb-1">Fee Type</label>
                  <select
                    value={feeTypeId}
                    onChange={(e) => setFeeTypeId(e.target.value)}
                    className="w-full border border-[#27272A] bg-[#0A0A0C] text-white rounded-lg p-2.5 text-xs focus:outline-none"
                    required
                  >
                    <option value="">-- Choose Type --</option>
                    {feeTypes.map((ft) => (
                      <option key={ft.id} value={ft.id}>{ft.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase font-semibold mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(Number(e.target.value))}
                    className="w-full border border-[#27272A] bg-[#0A0A0C] text-white rounded-lg p-2.5 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border border-[#27272A] bg-[#0A0A0C] text-white rounded-lg p-2.5 text-xs focus:outline-none"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowFeeModal(false); setSelectedStudent(null); }}
                    className="flex-1 border border-[#27272A] text-white/70 py-2 rounded text-xs"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 bg-[color:var(--marigold)] text-black font-semibold py-2 rounded text-xs hover:brightness-95">
                    Assign
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Apply Waiver Dialog Modal */}
        {showWaiverModal && selectedStudent && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50 backdrop-blur-sm" onClick={() => { setShowWaiverModal(false); setSelectedStudent(null); }}>
            <div className="bg-[#18181B] border border-[#27272A] max-w-sm w-full p-6 rounded-2xl text-left shadow-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-semibold text-white mb-1">Apply Scholarship Waiver</h3>
              <p className="text-xs text-muted-foreground mb-4">Apply percentage deduction for {selectedStudent.name}.</p>
              
              {activeAssignments.length > 0 ? (
                <form onSubmit={handleApplyWaiverSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase font-semibold mb-1">Select Active Fee</label>
                    <select
                      value={selectedAssignmentId}
                      onChange={(e) => setSelectedAssignmentId(e.target.value)}
                      className="w-full border border-[#27272A] bg-[#0A0A0C] text-white rounded-lg p-2.5 text-xs focus:outline-none"
                      required
                    >
                      {activeAssignments.map((aa) => (
                        <option key={aa.id} value={aa.id}>
                          {aa.fee_types?.name} (₹{aa.amount} - {aa.status})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase font-semibold mb-1">Scholarship Percent (%)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={waiverPercent}
                      onChange={(e) => setWaiverPercent(Number(e.target.value))}
                      className="w-full border border-[#27272A] bg-[#0A0A0C] text-white rounded-lg p-2.5 text-xs focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase font-semibold mb-1">Reason / Waiver Notes</label>
                    <input
                      type="text"
                      value={waiverReason}
                      onChange={(e) => setWaiverReason(e.target.value)}
                      placeholder="e.g. Merit-based 25% Off"
                      className="w-full border border-[#27272A] bg-[#0A0A0C] text-white rounded-lg p-2.5 text-xs focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => { setShowWaiverModal(false); setSelectedStudent(null); }}
                      className="flex-1 border border-[#27272A] text-white/70 py-2 rounded text-xs"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 bg-[color:var(--banyan)] text-white font-semibold py-2 rounded text-xs hover:brightness-95">
                      Apply Waiver
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-[color:var(--alert)] bg-[color:var(--alert)]/5 p-3 border border-[color:var(--alert)]/10 rounded">
                    This student has no outstanding pending fee invoices to apply a waiver on.
                  </p>
                  <button
                    onClick={() => { setShowWaiverModal(false); setSelectedStudent(null); }}
                    className="w-full border border-border py-2 rounded text-xs font-semibold text-white/80"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
