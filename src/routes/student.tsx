import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { SiteNav } from "@/components/vittam/SiteNav";
import { ReceiptCard } from "@/components/vittam/ReceiptCard";
import { StatusPill, MethodPill } from "@/components/vittam/StatusPill";
import { getStudentSession, logoutStudentSession, type StudentSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "Your fee ledger — Vittam" },
      { name: "description", content: "Outstanding balance, payment history, and receipts for the current term." },
    ],
  }),
  component: StudentDashboard,
});

type FeeAssignment = {
  id: string;
  amount: number;
  due_date: string;
  status: string;
  fee_types: { name: string; category: string } | null;
  waivers: { percent: number | null; amount: number | null }[];
};

type Transaction = {
  id: string;
  amount: number;
  method: string;
  status: string;
  deposit_slip_note: string | null;
  created_at: string;
  fee_assignments: { fee_types: { name: string } | null } | null;
};

// Simple INR Formatter
function inr(val: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
}

// English and Hindi Translations for Bilingual Parent View
const translations = {
  en: {
    titleFeePortal: "👨‍👩‍👧 Student & Parent Fee Portal",
    feePortalMode: "fee portal",
    descFeePortal: "Track past spending, review upcoming deadlines, and settle outstanding school fee invoices.",
    totalBilled: "Total Spent So Far",
    totalBilledDesc: "Across {count} settled receipts",
    outstanding: "Outstanding Balance",
    outstandingDesc: "{count} active invoice(s)",
    lateFees: "Late Fees Applied",
    lateFeesDesc: "{count} overdue invoice(s)",
    noLateFeesDesc: "No overdue penalties",
    deadline: "Upcoming Deadline",
    noDeadline: "No pending dues",
    deadlineDesc: "Next installment cut-off",
    deadlinesTitle: "📅 Upcoming Deadlines & Relevant Dates",
    noDeadlines: "No fee assignments found for your account.",
    scholarshipApplied: "✓ Scholarship Discount Applied ({pct}% Off)",
    dueDate: "Due Date",
    statusIndicator: "Status Indicator",
    cleared: "Cleared",
    overdue: "Overdue",
    daysLeft: "{count} days left",
    payDue: "Pay Due Invoice",
    chooseInvoice: "-- Choose an Invoice --",
    payNow: "Pay {amt} Now",
    launchingGateway: "Launching Gateway...",
    logCash: "Log Cash",
    logCheque: "Log Cheque",
    depositSlip: "Deposit slip photo",
    slipRef: "Transaction ID / Slip reference",
    paymentRecorded: "✓ Payment Recorded",
    viewReceipt: "View Receipt",
    settled: "✓ All school invoices are settled!",
    pastTxns: "💳 Past Transactions & Spending",
    pastTxnsDesc: "Complete history of all paid & pending receipts",
    records: "{count} records",
    tblDate: "Date",
    tblMethod: "Method",
    tblAmount: "Amount Spent",
    tblStatus: "Status",
    tblReceipt: "Receipt",
    viewPdfReceipt: "View PDF Receipt",
    noTxns: "No transactions recorded yet.",
    logout: "Log out",
    loadingText: "Loading student ledger data...",
    officialReceipt: "Vittam Official Receipt",
    txnHash: "TXN #{hash}",
    studentName: "Student Name",
    classRoll: "Class · Roll No",
    paymentDate: "Payment Date",
    paymentMethod: "Payment Method",
    spentReceived: "Amount Spent / Received",
    printPdf: "Print PDF",
    close: "Close"
  },
  hi: {
    titleFeePortal: "👨‍👩‍👧 छात्र और अभिभावक शुल्क पोर्टल",
    feePortalMode: "शुल्क पोर्टल",
    descFeePortal: "पिछले खर्च को ट्रैक करें, आगामी समय सीमा की समीक्षा करें और बकाया स्कूल शुल्क चालान का भुगतान करें।",
    totalBilled: "अब तक कुल खर्च",
    totalBilledDesc: "{count} भुगतान किए गए रसीदों में",
    outstanding: "बकाया राशि",
    outstandingDesc: "{count} सक्रिय चालान",
    lateFees: "विलंब शुल्क लागू",
    lateFeesDesc: "{count} विलंबित चालान",
    noLateFeesDesc: "कोई विलंब शुल्क दंड नहीं",
    deadline: "आगामी समय सीमा",
    noDeadline: "कोई बकाया नहीं",
    deadlineDesc: "अगली किस्त की अंतिम तिथि",
    deadlinesTitle: "📅 आगामी समय सीमा और महत्वपूर्ण तिथियां",
    noDeadlines: "आपके खाते के लिए कोई शुल्क आवंटन नहीं मिला।",
    scholarshipApplied: "✓ छात्रवृत्ति छूट लागू की गई ({pct}% छूट)",
    dueDate: "देय तिथि",
    statusIndicator: "स्थिति संकेतक",
    cleared: "भुगतान हो गया",
    overdue: "विलंबित",
    daysLeft: "{count} दिन शेष",
    payDue: "बकाया शुल्क का भुगतान करें",
    chooseInvoice: "-- चालान चुनें --",
    payNow: "अभी {amt} भुगतान करें",
    launchingGateway: "गेटवे शुरू हो रहा है...",
    logCash: "नकद दर्ज करें",
    logCheque: "चेक दर्ज करें",
    depositSlip: "जमा पर्ची की फोटो",
    slipRef: "लेनदेन आईडी / पर्ची संदर्भ",
    paymentRecorded: "✓ भुगतान दर्ज किया गया",
    viewReceipt: "रसीद देखें",
    settled: "✓ सभी स्कूल चालान सुलझा लिए गए हैं!",
    pastTxns: "💳 पिछला लेनदेन और खर्च",
    pastTxnsDesc: "सभी भुगतान किए गए और लंबित रसीदों का इतिहास",
    records: "{count} रिकॉर्ड",
    tblDate: "तिथि",
    tblMethod: "विधि",
    tblAmount: "खर्च की गई राशि",
    tblStatus: "स्थिति",
    tblReceipt: "रसीद",
    viewPdfReceipt: "PDF रसीद देखें",
    noTxns: "अभी तक कोई लेनदेन दर्ज नहीं किया गया है।",
    logout: "लॉग आउट",
    loadingText: "छात्र बहीखाता डेटा लोड हो रहा है...",
    officialReceipt: "वित्तम आधिकारिक रसीद",
    txnHash: "लेनदेन #{hash}",
    studentName: "छात्र का नाम",
    classRoll: "कक्षा · रोल नंबर",
    paymentDate: "भुगतान की तिथि",
    paymentMethod: "भुगतान विधि",
    spentReceived: "खर्च / प्राप्त राशि",
    printPdf: "PDF प्रिंट करें",
    close: "बंद करें"
  }
};

function StudentDashboard() {
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [assignments, setAssignments] = useState<FeeAssignment[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const [lang, setLang] = useState<"en" | "hi">("en");

  // Payment states
  const [selectedFeeId, setSelectedFeeId] = useState("");
  const [payAmount, setPayAmount] = useState(0);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipNote, setSlipNote] = useState("");
  const [payStatus, setPayStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [payMsg, setPayMsg] = useState("");
  const [recentTxnId, setRecentTxnId] = useState<string | null>(null);

  const nav = useNavigate();

  const t = (key: keyof typeof translations.en) => translations[lang][key];

  // Load Razorpay Script dynamically for Vite
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Verify auth session
  useEffect(() => {
    const session = getStudentSession();
    if (!session) {
      nav({ to: "/student-login" });
    } else {
      setStudent(session);
    }
  }, [nav]);

  const loadStudentData = useCallback(async () => {
    if (!student?.id) return;
    setLoading(true);
    try {
      const [feesRes, txnsRes] = await Promise.all([
        supabase
          .from("fee_assignments")
          .select("id, amount, due_date, status, fee_types(name, category), waivers(percent, amount)")
          .eq("student_id", student.id),
        supabase
          .from("transactions")
          .select(`
            id, amount, method, status, deposit_slip_note, created_at,
            fee_assignments(fee_types(name))
          `)
          .eq("student_id", student.id)
          .order("created_at", { ascending: false })
      ]);

      if (feesRes.data) setAssignments(feesRes.data as any);
      if (txnsRes.data) setTxns(txnsRes.data as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [student]);

  useEffect(() => {
    if (student) {
      loadStudentData();
    }
  }, [student, loadStudentData]);

  // Compute effective due amount on assignment
  function getEffectiveAmount(fa: FeeAssignment): number {
    const base = Number(fa.amount);
    let discount = 0;
    for (const w of fa.waivers ?? []) {
      if (w.percent) discount += base * (Number(w.percent) / 100);
      else if (w.amount) discount += Number(w.amount);
    }
    return Math.max(0, Math.round(base - discount));
  }

  // Update payment amount when selected invoice changes
  useEffect(() => {
    const match = assignments.find(f => f.id === selectedFeeId);
    if (match) {
      setPayAmount(getEffectiveAmount(match));
    } else {
      setPayAmount(0);
    }
  }, [selectedFeeId, assignments]);

  const totalOutstanding = assignments
    .filter(fa => fa.status !== "paid")
    .reduce((sum, fa) => sum + getEffectiveAmount(fa), 0);

  // Spent so far = sum of reconciled transactions
  const totalSpent = txns
    .filter(t => t.status === "reconciled")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const overdueCount = assignments.filter(fa => fa.status === "overdue").length;
  const lateFeeTotal = overdueCount * 150;

  // Razorpay Checkout (Simulated client-side for Vite/TanStack Start SPA prototype)
  async function payWithUPI() {
    if (!student || !selectedFeeId) return;
    setPayStatus("loading");
    setPayMsg("Initializing UPI checkout...");

    try {
      const mockPaymentId = "pay_" + Math.random().toString(36).substring(2, 15);
      const mockOrderId = "order_" + Math.random().toString(36).substring(2, 15);

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          student_id: student.id,
          fee_assignment_id: selectedFeeId,
          amount: payAmount,
          method: "upi",
          status: "pending",
          razorpay_payment_id: mockPaymentId,
          razorpay_order_id: mockOrderId,
          deposit_slip_note: slipNote || "UPI payment checkout",
          slip_url: null
        })
        .select()
        .single();

      if (error) {
        setPayStatus("error");
        setPayMsg("UPI Logging Error: " + error.message);
        return;
      }

      setPayStatus("success");
      setPayMsg(lang === "hi" ? "UPI भुगतान शुरू किया गया। व्यवस्थापक सत्यापन की प्रतीक्षा है।" : "UPI payment initiated. Awaiting admin verification.");
      setRecentTxnId(data.id);
      setSelectedFeeId("");
      setSlipFile(null);
      setSlipNote("");
      loadStudentData();
    } catch (e: any) {
      setPayStatus("error");
      setPayMsg(e.message || "Failed to process UPI checkout.");
    }
  }

  // Offline Cash/Cheque Logger (Direct Supabase insertion)
  async function logOfflinePayment(method: "cash" | "cheque") {
    if (!student || !selectedFeeId) return;
    setPayStatus("loading");
    setPayMsg("Logging offline receipt...");

    try {
      let slipUrl = "";
      if (slipFile) {
        setPayMsg("Uploading slip photo...");
        const fileExt = slipFile.name.split(".").pop();
        const fileName = `${student.id}-${selectedFeeId}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("slips")
          .upload(fileName, slipFile);
        
        if (uploadError) {
          setPayStatus("error");
          setPayMsg("Upload failed: " + uploadError.message);
          return;
        }
        
        const { data: { publicUrl } } = supabase.storage.from("slips").getPublicUrl(fileName);
        slipUrl = publicUrl;
      }

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          student_id: student.id,
          fee_assignment_id: selectedFeeId,
          amount: payAmount,
          method,
          deposit_slip_note: slipNote || `Logged as ${method} offline`,
          slip_url: slipUrl || null,
          status: "pending"
        })
        .select()
        .single();

      if (error) {
        setPayStatus("error");
        setPayMsg("Offline Log Error: " + error.message);
      } else if (data) {
        setPayStatus("success");
        setPayMsg(method === "cash"
          ? (lang === "hi" ? "भौतिक नकद सत्यापन की प्रतीक्षा है।" : "Awaiting physical cash verification.")
          : (lang === "hi" ? "चेक जमा सफलतापूर्वक दर्ज किया गया।" : "Cheque deposit logged successfully.")
        );
        setRecentTxnId(data.id);
        setSelectedFeeId("");
        setSlipFile(null);
        setSlipNote("");
        loadStudentData();
      } else {
        setPayStatus("error");
        setPayMsg("Failed to log offline receipt.");
      }
    } catch (e: any) {
      setPayStatus("error");
      setPayMsg(e.message || "Offline log error.");
    }
  }

  function logout() {
    logoutStudentSession();
    nav({ to: "/student-login" });
  }

  if (loading || !student) {
    return (
      <div className="min-h-screen">
        <SiteNav />
        <main className="mx-auto max-w-6xl px-6 py-20 text-center font-mono text-sm text-muted-foreground animate-pulse">
          {t("loadingText")}
        </main>
      </div>
    );
  }

  const initials = student.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-3xl font-semibold">
                {t("titleFeePortal")}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[color:var(--marigold)]/10 text-[color:var(--marigold)] border border-[color:var(--marigold)]/30 uppercase tracking-widest font-mono">
                {t("feePortalMode")}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("descFeePortal")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Bilingual Switcher */}
            <div className="flex bg-secondary/30 rounded-lg p-1 border border-border/40 gap-1">
              <button
                onClick={() => setLang("en")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  lang === "en" ? "bg-[color:var(--marigold)] text-[#1a130a]" : "text-muted-foreground hover:text-white"
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLang("hi")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  lang === "hi" ? "bg-[color:var(--marigold)] text-[#1a130a]" : "text-muted-foreground hover:text-white"
                }`}
              >
                हिंदी (Hindi)
              </button>
            </div>

            <button
              onClick={logout}
              className="rounded border border-[color:var(--alert)]/30 text-[color:var(--alert)] px-3 py-1.5 text-xs font-semibold hover:bg-[color:var(--alert)]/5 transition"
            >
              {t("logout")}
            </button>
          </div>
        </div>

        {/* Info Grid: Total Spent, Outstanding Balance, Late Fees, and Deadlines */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <ReceiptCard>
            <p className="font-mono text-xs uppercase tracking-widest text-[color:var(--banyan)]">{t("totalBilled")}</p>
            <p className="mt-3 font-serif text-3xl font-semibold text-[color:var(--banyan)]">{inr(totalSpent)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("totalBilledDesc").replace("{count}", String(txns.filter(t => t.status === "reconciled").length))}</p>
          </ReceiptCard>

          <ReceiptCard>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{t("outstanding")}</p>
            <p className="mt-3 font-serif text-3xl font-semibold">{inr(totalOutstanding)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("outstandingDesc").replace("{count}", String(assignments.filter(fa => fa.status !== "paid").length))}</p>
          </ReceiptCard>

          <ReceiptCard>
            <p className="font-mono text-xs uppercase tracking-widest text-[color:var(--alert)]">{t("lateFees")}</p>
            <p className="mt-3 font-serif text-3xl font-semibold text-[color:var(--alert)]">{inr(lateFeeTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {overdueCount > 0 
                ? t("lateFeesDesc").replace("{count}", String(overdueCount)) 
                : t("noLateFeesDesc")
              }
            </p>
          </ReceiptCard>

          <ReceiptCard>
            <p className="font-mono text-xs uppercase tracking-widest text-[color:var(--marigold)]">{t("deadline")}</p>
            <p className="mt-3 font-serif text-xl font-semibold text-[color:var(--marigold)]">
              {assignments.find(fa => fa.status !== "paid")?.due_date 
                ? new Date(assignments.find(fa => fa.status !== "paid")!.due_date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })
                : t("noDeadline")
              }
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("deadlineDesc")}</p>
          </ReceiptCard>
        </div>

        {/* Upcoming Payment Deadlines and Relevant Dates Section */}
        <div className="mt-10">
          <h2 className="font-serif text-xl font-semibold mb-4">{t("deadlinesTitle")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((fa) => {
              const dueDate = new Date(fa.due_date);
              const isOverdue = fa.status === "overdue" || (fa.status === "pending" && dueDate < new Date());
              const daysLeft = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));

              return (
                <ReceiptCard key={fa.id} className="flex flex-col justify-between border-l-4 border-l-[color:var(--marigold)]">
                  <div>
                    <div className="flex justify-between items-start">
                      <p className="font-serif text-base font-semibold">{fa.fee_types?.name || "School Fee"}</p>
                      <StatusPill status={fa.status} />
                    </div>
                    <p className="font-mono text-lg font-bold mt-2">{inr(getEffectiveAmount(fa))}</p>
                    {fa.waivers && fa.waivers.length > 0 && (
                      <p className="text-[10px] text-[color:var(--banyan)] font-semibold mt-0.5">
                        {t("scholarshipApplied").replace("{pct}", String(fa.waivers[0].percent))}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/40 text-xs grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-mono">{t("dueDate")}</span>
                      <span className="font-mono font-medium">{dueDate.toLocaleDateString("en-IN")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-mono">{t("statusIndicator")}</span>
                      <span className={`font-mono font-semibold ${isOverdue ? "text-[color:var(--alert)]" : "text-[color:var(--banyan)]"}`}>
                        {fa.status === "paid" 
                          ? t("cleared") 
                          : isOverdue 
                            ? t("overdue") 
                            : t("daysLeft").replace("{count}", String(daysLeft))
                        }
                      </span>
                    </div>
                  </div>
                </ReceiptCard>
              );
            })}
            {assignments.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                {t("noDeadlines")}
              </div>
            )}
          </div>
        </div>

        {/* Profile, Checkout & Transaction Ledger */}
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          
          {/* Profile & Pay Action */}
          <ReceiptCard className="lg:col-span-1 space-y-6">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-[color:var(--marigold)]/20 font-serif text-xl font-semibold text-[color:var(--marigold)]">
                {initials}
              </div>
              <div>
                <p className="font-serif text-xl font-semibold leading-tight">{student.name}</p>
                <p className="font-mono text-xs text-muted-foreground">Class {student.class} · Roll {student.roll_no}</p>
              </div>
            </div>

            {/* Invoices dropdown selector */}
            {assignments.filter(fa => fa.status !== "paid").length > 0 ? (
              <div className="border-t border-border/60 pt-4 space-y-4">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{t("payDue")}</p>
                <div>
                  <select
                    value={selectedFeeId}
                    onChange={(e) => { setSelectedFeeId(e.target.value); setPayStatus("idle"); }}
                    className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[color:var(--marigold)] text-foreground"
                  >
                    <option value="">{t("chooseInvoice")}</option>
                    {assignments.filter(fa => fa.status !== "paid").map((fa) => {
                      const eff = getEffectiveAmount(fa);
                      return (
                        <option key={fa.id} value={fa.id}>
                          {fa.fee_types?.name} ({inr(eff)})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedFeeId && (
                  <div className="space-y-4">
                    <button
                      onClick={payWithUPI}
                      disabled={payStatus === "loading"}
                      className="w-full rounded-md bg-[color:var(--marigold)] px-4 py-2.5 text-sm font-medium text-[color:var(--primary-foreground)] hover:brightness-95 disabled:opacity-50"
                    >
                      {payStatus === "loading" && payMsg.includes("Order") ? t("launchingGateway") : t("payNow").replace("{amt}", inr(payAmount))}
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => logOfflinePayment("cash")}
                        disabled={payStatus === "loading"}
                        className="flex-1 rounded-md border border-border py-2 text-xs font-semibold hover:bg-secondary/40 transition"
                      >
                        {t("logCash")}
                      </button>
                      <button
                        onClick={() => logOfflinePayment("cheque")}
                        disabled={payStatus === "loading"}
                        className="flex-1 rounded-md border border-border py-2 text-xs font-semibold hover:bg-secondary/40 transition"
                      >
                        {t("logCheque")}
                      </button>
                    </div>

                    {/* Offline slip attachment uploads */}
                    <div className="bg-secondary/20 border border-border/40 rounded-lg p-3 space-y-2 text-left">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{t("depositSlip")}</p>
                      <input
                        type="text"
                        value={slipNote}
                        onChange={(e) => setSlipNote(e.target.value)}
                        placeholder={t("slipRef")}
                        className="w-full rounded border border-input bg-background p-1.5 text-[11px] focus:outline-none"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)}
                        className="w-full text-[10px] text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-[color:var(--marigold)]/10 file:text-[color:var(--marigold)]"
                      />
                    </div>
                  </div>
                )}

                {payStatus === "success" && (
                  <div className="bg-[color:var(--banyan)]/10 border border-[color:var(--banyan)]/20 text-[color:var(--banyan)] text-xs rounded p-3 text-left">
                    <p className="font-semibold">{t("paymentRecorded")}</p>
                    <p className="mt-1 opacity-80">{payMsg}</p>
                    {recentTxnId && (
                      <button
                        onClick={() => {
                          const matchedTxn = txns.find(t => t.id === recentTxnId);
                          if (matchedTxn) setReceipt(matchedTxn);
                        }}
                        className="mt-2 block underline text-xs font-bold"
                      >
                        {t("viewReceipt")}
                      </button>
                    )}
                  </div>
                )}

                {payStatus === "error" && (
                  <div className="bg-[color:var(--alert)]/10 border border-[color:var(--alert)]/20 text-[color:var(--alert)] text-xs rounded p-3 text-left">
                    {payMsg}
                  </div>
                )}
              </div>
            ) : (
              <div className="border-t border-border/60 pt-4 text-xs font-medium text-[color:var(--banyan)] text-left">
                {t("settled")}
              </div>
            )}
          </ReceiptCard>

          {/* Past Transactions Ledger */}
          <ReceiptCard className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-serif text-lg font-semibold">{t("pastTxns")}</p>
                <p className="text-xs text-muted-foreground">{t("pastTxnsDesc")}</p>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{t("records").replace("{count}", String(txns.length))}</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">{t("tblDate")}</th>
                    <th className="pb-3 pr-4 font-medium">{t("tblMethod")}</th>
                    <th className="pb-3 pr-4 font-medium">{t("tblAmount")}</th>
                    <th className="pb-3 pr-4 font-medium">{t("tblStatus")}</th>
                    <th className="pb-3 font-medium text-right">{t("tblReceipt")}</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t) => (
                    <tr key={t.id} className="border-t border-border/60">
                      <td className="py-3 pr-4 font-mono text-xs">
                        {new Date(t.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 pr-4">
                        <MethodPill method={t.method} />
                      </td>
                      <td className="py-3 pr-4 font-mono font-semibold">{inr(t.amount)}</td>
                      <td className="py-3 pr-4">
                        <StatusPill status={t.status} />
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setReceipt(t)}
                          className="text-xs font-medium text-[color:var(--marigold)] hover:underline"
                        >
                          {translations[lang].viewPdfReceipt}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {txns.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                        {t("noTxns")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ReceiptCard>
        </div>
      </main>

      {/* PDF Receipt Modal */}
      {receipt && (
        <>
          <style>{`@media print{body *{visibility:hidden}#vittam-receipt,#vittam-receipt *{visibility:visible}#vittam-receipt{position:absolute;left:0;top:0;width:100%}}`}</style>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:bg-transparent print:p-0" onClick={() => setReceipt(null)}>
            <div id="vittam-receipt" className="w-full max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="receipt-glass p-8 print:bg-white print:backdrop-blur-none border border-border/80">
                <div className="flex items-center justify-between">
                  <p className="font-serif text-lg font-semibold text-foreground">{t("officialReceipt")}</p>
                  <p className="font-mono text-xs text-muted-foreground">{t("txnHash").replace("{hash}", receipt.id.slice(0, 8).toUpperCase())}</p>
                </div>
                <div className="mt-6 space-y-3 border-y border-dashed border-border/80 py-6 text-left">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("studentName")}</span>
                    <span className="font-semibold text-white print:text-black">{student?.name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("classRoll")}</span>
                    <span className="font-mono font-semibold text-white print:text-black">{student?.class} · {student?.roll_no}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("paymentDate")}</span>
                    <span className="font-mono text-white print:text-black">{new Date(receipt.created_at).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("paymentMethod")}</span>
                    <span className="font-mono text-white print:text-black">{receipt.method.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("tblStatus")}</span>
                    <span className="font-semibold text-white print:text-black">{receipt.status.toUpperCase()}</span>
                  </div>
                </div>
                <div className="mt-6 flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">{t("spentReceived")}</span>
                  <span className="font-serif text-3xl font-semibold text-[color:var(--marigold)]">{inr(receipt.amount)}</span>
                </div>
                <div className="mt-8 flex gap-2 print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 rounded-md bg-[color:var(--marigold)] px-4 py-2 text-sm font-medium text-[color:var(--primary-foreground)] hover:brightness-95"
                  >
                    {t("printPdf")}
                  </button>
                  <button onClick={() => setReceipt(null)} className="rounded-md border border-border px-4 py-2 text-sm text-white/80 hover:text-white">
                    {t("close")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
