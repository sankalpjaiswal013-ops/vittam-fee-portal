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

function IngestStudents() {
  // Enforce staff/admin login check
  const { admin, loading: authLoading } = useRequireAdmin();

  // Active view tab inside IngestStudents: "roster" (list + assign actions), "import" (bulk + manual creation), or "document-converter"
  const [activeSubTab, setActiveSubTab] = useState<"roster" | "import" | "document-converter">("roster");

  // Document Converter states
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string>("");
  const [converterRows, setConverterRows] = useState<Row[]>([]);
  const [scanning, setScanning] = useState(false);

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
        guardian_contact: r.guardian_contact
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
            <button
              onClick={() => setActiveSubTab("document-converter")}
              className={`px-4 py-1.5 text-xs font-semibold rounded ${activeSubTab === "document-converter" ? "bg-[#27272A] text-white" : "text-muted-foreground hover:text-white"}`}
            >
              📄 Doc to CSV Converter
            </button>
          </div>
        </div>

        {activeSubTab === "roster" && (
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
        )}

        {activeSubTab === "import" && (
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

        {activeSubTab === "document-converter" && (
          <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr] text-left animate-fade-in">
            {/* Left side: Upload & Preview */}
            <div className="space-y-6">
              <ReceiptCard className="p-6">
                <h3 className="font-serif text-lg font-semibold text-white mb-1">Upload Roster Document</h3>
                <p className="text-xs text-muted-foreground mb-4">Upload an image, scan, roster copy, or receipt of student records.</p>
                
                {!docFile ? (
                  <label className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border hover:border-[color:var(--marigold)] transition">
                    <input
                      type="file"
                      accept="image/*,application/pdf,text/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setDocFile(file);
                          if (file.type.startsWith("image/")) {
                            setDocPreviewUrl(URL.createObjectURL(file));
                          } else {
                            setDocPreviewUrl("");
                          }
                        }
                      }}
                      className="hidden"
                    />
                    <span className="text-3xl mb-2">📁</span>
                    <p className="font-serif text-sm text-white">Select document file</p>
                    <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, PDF, TXT</p>
                  </label>
                ) : (
                  <div className="space-y-4">
                    <div className="relative rounded-lg border border-border overflow-hidden bg-black/40 flex items-center justify-center p-2 min-h-[220px]">
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
                            // Prepopulate with mock scanned results for hackathon demo
                            setConverterRows([
                              { name: "Devendra Singh", roll_no: "10B-05", class: "10-B", guardian_name: "Gajendra Singh", guardian_contact: "+919876543210", email: "devendra@gmail.com", branch: "Jaipur" },
                              { name: "Anjali Sharma", roll_no: "9A-04", class: "9-A", guardian_name: "Sunil Sharma", guardian_contact: "+919922883344", email: "anjali@yahoo.com", branch: "Dharamsala" },
                              { name: "Rahul Verma", roll_no: "8C-12", class: "8-C", guardian_name: "Meena Verma", guardian_contact: "+919811223344", email: "rahul@gmail.com", branch: "Jaipur" }
                            ]);
                          }, 2000);
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
                        }}
                        className="border border-[#27272A] text-white/70 px-3 py-2 rounded text-xs hover:bg-[#27272A]"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </ReceiptCard>
            </div>

            {/* Right side: Editable table */}
            <div className="space-y-6">
              <ReceiptCard className="p-6">
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
                      <tr className="text-muted-foreground border-b border-border/40 font-mono uppercase pb-2">
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
                        <tr key={index} className="border-b border-border/20">
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
                  <div className="mt-6 flex justify-end gap-3 border-t border-border/40 pt-4">
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
                      className="border border-[#27272A] text-white px-4 py-2 rounded text-xs font-semibold hover:bg-[#27272A]"
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
                        setActiveSubTab("import");
                        alert("⚡ Loaded roster into bulk import queue! Review preview table and click Commit to save.");
                      }}
                      className="bg-[color:var(--marigold)] text-black px-4 py-2 rounded text-xs font-semibold hover:brightness-95"
                    >
                      ⚡ Load to Import Queue
                    </button>
                  </div>
                )}
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
