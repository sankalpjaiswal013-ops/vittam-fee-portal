import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import Script from "next/script"; // Wait, in Vite, we can just use normal scripts or load it dynamically
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

function StudentDashboard() {
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [assignments, setAssignments] = useState<FeeAssignment[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const [viewMode, setViewMode] = useState<"student" | "parent">("student");

  // Payment states
  const [selectedFeeId, setSelectedFeeId] = useState("");
  const [payAmount, setPayAmount] = useState(0);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipNote, setSlipNote] = useState("");
  const [payStatus, setPayStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [payMsg, setPayMsg] = useState("");
  const [recentTxnId, setRecentTxnId] = useState<string | null>(null);

  const nav = useNavigate();

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
      setPayMsg("UPI payment initiated. Awaiting admin verification.");
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
        setPayMsg(method === "cash" ? "Awaiting physical cash verification." : "Cheque deposit logged successfully.");
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
          Loading student ledger data...
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
                {viewMode === "student" ? "🎓 Student Ledger & Spending" : "👨‍👩‍👧 Parent Fee Portal"}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[color:var(--marigold)]/10 text-[color:var(--marigold)] border border-[color:var(--marigold)]/30 uppercase tracking-widest font-mono">
                {viewMode} mode
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {viewMode === "student" 
                ? "Track your past spending, upcoming deadlines, late fees, and receipt history."
                : "Manage fee payments, view official receipts, and monitor outstanding dues."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Selector Button */}
            <div className="flex bg-secondary/80 rounded-lg p-1 border border-border">
              <button
                onClick={() => setViewMode("student")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  viewMode === "student" ? "bg-[color:var(--marigold)] text-[#1a130a]" : "text-muted-foreground hover:text-white"
                }`}
              >
                🎓 Student View
              </button>
              <button
                onClick={() => setViewMode("parent")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  viewMode === "parent" ? "bg-[color:var(--marigold)] text-[#1a130a]" : "text-muted-foreground hover:text-white"
                }`}
              >
                👨‍👩‍👧 Parent View
              </button>
            </div>

            <button
              onClick={logout}
              className="rounded border border-[color:var(--alert)]/30 text-[color:var(--alert)] px-3 py-1.5 text-xs font-semibold hover:bg-[color:var(--alert)]/5 transition"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Info Grid: Total Spent, Outstanding Balance, Late Fees, and Deadlines */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <ReceiptCard>
            <p className="font-mono text-xs uppercase tracking-widest text-[color:var(--banyan)]">Total Spent So Far</p>
            <p className="mt-3 font-serif text-3xl font-semibold text-[color:var(--banyan)]">{inr(totalSpent)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Across {txns.filter(t => t.status === "reconciled").length} settled receipts</p>
          </ReceiptCard>

          <ReceiptCard>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Outstanding Balance</p>
            <p className="mt-3 font-serif text-3xl font-semibold">{inr(totalOutstanding)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{assignments.filter(fa => fa.status !== "paid").length} active invoice(s)</p>
          </ReceiptCard>

          <ReceiptCard>
            <p className="font-mono text-xs uppercase tracking-widest text-[color:var(--alert)]">Late Fees Applied</p>
            <p className="mt-3 font-serif text-3xl font-semibold text-[color:var(--alert)]">{inr(lateFeeTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{overdueCount > 0 ? `${overdueCount} overdue invoice(s)` : "No overdue penalties"}</p>
          </ReceiptCard>

          <ReceiptCard>
            <p className="font-mono text-xs uppercase tracking-widest text-[color:var(--marigold)]">Upcoming Deadline</p>
            <p className="mt-3 font-serif text-xl font-semibold text-[color:var(--marigold)]">
              {assignments.find(fa => fa.status !== "paid")?.due_date 
                ? new Date(assignments.find(fa => fa.status !== "paid")!.due_date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })
                : "No pending dues"
              }
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Next installment cut-off</p>
          </ReceiptCard>
        </div>

        {/* Upcoming Payment Deadlines and Relevant Dates Section */}
        <div className="mt-10">
          <h2 className="font-serif text-xl font-semibold mb-4">📅 Upcoming Deadlines & Relevant Dates</h2>
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
                        ✓ Scholarship Discount Applied ({fa.waivers[0].percent}% Off)
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/40 text-xs grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-mono">Due Date</span>
                      <span className="font-mono font-medium">{dueDate.toLocaleDateString("en-IN")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-mono">Status Indicator</span>
                      <span className={`font-mono font-semibold ${isOverdue ? "text-[color:var(--alert)]" : "text-[color:var(--banyan)]"}`}>
                        {fa.status === "paid" ? "Cleared" : isOverdue ? "Overdue" : `${daysLeft} days left`}
                      </span>
                    </div>
                  </div>
                </ReceiptCard>
              );
            })}
            {assignments.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                No fee assignments found for your account.
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
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Pay Due Invoice</p>
                <div>
                  <select
                    value={selectedFeeId}
                    onChange={(e) => { setSelectedFeeId(e.target.value); setPayStatus("idle"); }}
                    className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[color:var(--marigold)] text-foreground"
                  >
                    <option value="">-- Choose an Invoice --</option>
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
                      {payStatus === "loading" && payMsg.includes("Order") ? "Launching Gateway..." : `Pay ${inr(payAmount)} Now`}
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => logOfflinePayment("cash")}
                        disabled={payStatus === "loading"}
                        className="flex-1 rounded-md border border-border py-2 text-xs font-semibold hover:bg-secondary/40 transition"
                      >
                        Log Cash
                      </button>
                      <button
                        onClick={() => logOfflinePayment("cheque")}
                        disabled={payStatus === "loading"}
                        className="flex-1 rounded-md border border-border py-2 text-xs font-semibold hover:bg-secondary/40 transition"
                      >
                        Log Cheque
                      </button>
                    </div>

                    {/* Offline slip attachment uploads */}
                    <div className="bg-secondary/20 border border-border/40 rounded-lg p-3 space-y-2 text-left">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Deposit slip photo</p>
                      <input
                        type="text"
                        value={slipNote}
                        onChange={(e) => setSlipNote(e.target.value)}
                        placeholder="Transaction ID / Slip reference"
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
                  <div className="bg-[color:var(--banyan)]/10 border border-[color:var(--banyan)]/20 text-[color:var(--banyan)] text-xs rounded p-3">
                    <p className="font-semibold">✓ Payment Recorded</p>
                    <p className="mt-1 opacity-80">{payMsg}</p>
                    {recentTxnId && (
                      <button
                        onClick={() => {
                          const matchedTxn = txns.find(t => t.id === recentTxnId);
                          if (matchedTxn) setReceipt(matchedTxn);
                        }}
                        className="mt-2 block underline text-xs font-bold"
                      >
                        View Receipt
                      </button>
                    )}
                  </div>
                )}

                {payStatus === "error" && (
                  <div className="bg-[color:var(--alert)]/10 border border-[color:var(--alert)]/20 text-[color:var(--alert)] text-xs rounded p-3">
                    {payMsg}
                  </div>
                )}
              </div>
            ) : (
              <div className="border-t border-border/60 pt-4 text-xs font-medium text-[color:var(--banyan)]">
                ✓ All school invoices are settled!
              </div>
            )}
          </ReceiptCard>

          {/* Past Transactions Ledger */}
          <ReceiptCard className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-serif text-lg font-semibold">💳 Past Transactions & Spending</p>
                <p className="text-xs text-muted-foreground">Complete history of all paid & pending receipts</p>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{txns.length} records</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Date</th>
                    <th className="pb-3 pr-4 font-medium">Method</th>
                    <th className="pb-3 pr-4 font-medium">Amount Spent</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Receipt</th>
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
                          View PDF Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                  {txns.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                        No transactions recorded yet.
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
                  <p className="font-serif text-lg font-semibold text-foreground">Vittam Official Receipt</p>
                  <p className="font-mono text-xs text-muted-foreground">TXN #{receipt.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="mt-6 space-y-3 border-y border-dashed border-border/80 py-6 text-left">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Student Name</span>
                    <span className="font-semibold text-white print:text-black">{student?.name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Class · Roll No</span>
                    <span className="font-mono font-semibold text-white print:text-black">{student?.class} · {student?.roll_no}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Payment Date</span>
                    <span className="font-mono text-white print:text-black">{new Date(receipt.created_at).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Payment Method</span>
                    <span className="font-mono text-white print:text-black">{receipt.method.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-semibold text-white print:text-black">{receipt.status.toUpperCase()}</span>
                  </div>
                </div>
                <div className="mt-6 flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Amount Spent / Received</span>
                  <span className="font-serif text-3xl font-semibold text-[color:var(--marigold)]">{inr(receipt.amount)}</span>
                </div>
                <div className="mt-8 flex gap-2 print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 rounded-md bg-[color:var(--marigold)] px-4 py-2 text-sm font-medium text-[color:var(--primary-foreground)] hover:brightness-95"
                  >
                    Print PDF
                  </button>
                  <button onClick={() => setReceipt(null)} className="rounded-md border border-border px-4 py-2 text-sm text-white/80 hover:text-white">
                    Close
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
