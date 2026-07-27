import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteNav } from "@/components/vittam/SiteNav";
import { ReceiptCard } from "@/components/vittam/ReceiptCard";
import { StatusPill } from "@/components/vittam/StatusPill";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/verify")({
  head: () => ({
    meta: [
      { title: "Verify offline payments — Vittam admin" },
      { name: "description", content: "Review uploaded deposit slips and reconcile cash or cheque payments." },
    ],
  }),
  component: VerifySlips,
});

type PendingTransaction = {
  id: string;
  amount: number;
  method: string;
  status: string;
  deposit_slip_note: string | null;
  slip_url: string | null;
  created_at: string;
  fee_assignments: { id: string; amount: number; fee_types: { name: string } | null } | null;
  students: { name: string; roll_no: string; class: string } | null;
};

function inr(val: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
}

// Generate fallback SVG thumbnail if no deposit slip URL was uploaded
function fallbackSlipSvg(ref: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 380'><rect width='300' height='380' fill='#1A1A1E'/><rect x='16' y='16' width='268' height='40' fill='#F0A202' opacity='0.85'/><text x='28' y='42' font-family='monospace' font-size='14' fill='#000000'>${ref}</text><g stroke='#ffffff' stroke-opacity='0.15'><line x1='24' y1='88' x2='276' y2='88'/><line x1='24' y1='120' x2='276' y2='120'/><line x1='24' y1='152' x2='276' y2='152'/><line x1='24' y1='184' x2='276' y2='184'/><line x1='24' y1='216' x2='276' y2='216'/></g><rect x='24' y='260' width='120' height='60' fill='none' stroke='#ffffff' stroke-opacity='0.2' stroke-dasharray='4 4'/><text x='36' y='296' font-family='monospace' font-size='11' fill='#ffffff' opacity='0.4'>NO PHOTO</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function VerifySlips() {
  const { admin, loading: authLoading } = useRequireAdmin();
  
  const [slips, setSlips] = useState<PendingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PendingTransaction | null>(null);
  const [verifier, setVerifier] = useState("");
  const [reconciling, setReconciling] = useState(false);

  const loadPendingSlips = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id, amount, method, status, deposit_slip_note, slip_url, created_at,
          fee_assignments(id, amount, fee_types(name)),
          students(name, roll_no, class)
        `)
        .eq("status", "pending")
        .in("method", ["cash", "cheque"])
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error);
      } else {
        setSlips(data as any || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (admin) {
      loadPendingSlips();
    }
  }, [admin]);

  async function handleReconcile(txn: PendingTransaction) {
    if (!verifier.trim()) return;
    setReconciling(true);

    try {
      // 1. Update transaction to reconciled
      const { error: txnError } = await supabase
        .from("transactions")
        .update({ status: "reconciled", verified_by: verifier })
        .eq("id", txn.id);

      if (txnError) throw txnError;

      // 2. Update fee assignment to paid
      if (txn.fee_assignments?.id) {
        const { error: feeError } = await supabase
          .from("fee_assignments")
          .update({ status: "paid" })
          .eq("id", txn.fee_assignments.id);
        
        if (feeError) throw feeError;
      }

      setSelected(null);
      setVerifier("");
      loadPendingSlips();
    } catch (err: any) {
      alert("Failed to reconcile: " + err.message);
    } finally {
      setReconciling(false);
    }
  }

  async function handleReject(txn: PendingTransaction) {
    if (!confirm("Are you sure you want to reject this offline slip?")) return;
    setReconciling(true);

    try {
      const { error } = await supabase
        .from("transactions")
        .update({ status: "failed", deposit_slip_note: `Rejected by verifier: ${txn.deposit_slip_note || ''}` })
        .eq("id", txn.id);

      if (error) throw error;

      setSelected(null);
      loadPendingSlips();
    } catch (err: any) {
      alert("Failed to reject: " + err.message);
    } finally {
      setReconciling(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <SiteNav />
        <main className="mx-auto max-w-6xl px-6 py-20 text-center font-mono text-sm text-muted-foreground animate-pulse">
          Loading pending slips...
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-serif text-3xl font-semibold">Verify offline payments</h1>
          <p className="text-sm text-muted-foreground">
            {slips.length} pending reconciliation review
          </p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {slips.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className="group text-left focus:outline-none"
            >
              <ReceiptCard className="p-4 border border-border hover:border-marigold/30 transition">
                <div className="overflow-hidden rounded-md border border-border bg-[#0A0A0C]">
                  <img
                    src={s.slip_url || fallbackSlipSvg(s.id.slice(0, 8).toUpperCase())}
                    alt={`Deposit slip`}
                    className="h-40 w-full object-cover transition group-hover:scale-[1.02]"
                  />
                </div>
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-serif text-base font-semibold leading-tight text-white">{s.students?.name || "Student"}</p>
                    <p className="font-mono text-xs text-muted-foreground mt-1">
                      {s.students?.roll_no} · {new Date(s.created_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <p className="font-mono text-sm font-semibold text-white">{inr(s.amount)}</p>
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">{s.method}</span>
                  <StatusPill status={s.status} />
                </div>
              </ReceiptCard>
            </button>
          ))}
        </div>

        {slips.length === 0 && (
          <p className="mt-16 text-center text-sm text-muted-foreground">
            No slips awaiting verification. New uploads will appear here in real-time.
          </p>
        )}
      </main>

      {/* Lightbox Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="w-full max-w-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-glass p-6 border border-border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-serif text-xl font-semibold text-white">{selected.students?.name}</p>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">
                    Roll {selected.students?.roll_no} · Class {selected.students?.class}
                  </p>
                </div>
                <p className="font-serif text-2xl font-semibold text-[color:var(--marigold)]">{inr(selected.amount)}</p>
              </div>

              <div className="mt-5 grid gap-6 sm:grid-cols-[1fr_1fr]">
                <div className="border border-border rounded-lg bg-[#0A0A0C] overflow-hidden flex items-center justify-center min-h-[220px]">
                  <img
                    src={selected.slip_url || fallbackSlipSvg(selected.id.slice(0, 8).toUpperCase())}
                    alt={`Deposit slip details`}
                    className="w-full h-auto max-h-[300px] object-contain"
                  />
                </div>
                <div className="flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">Slip Note</p>
                    <p className="mt-1 text-xs text-white bg-secondary/35 border border-border/40 p-2.5 rounded-lg leading-relaxed">
                      {selected.deposit_slip_note || "No note provided."}
                    </p>

                    <div className="mt-4">
                      <label className="mb-1 block text-[10px] font-mono uppercase text-muted-foreground font-semibold">Verifier Signature</label>
                      <input
                        value={verifier}
                        onChange={(e) => setVerifier(e.target.value)}
                        placeholder="e.g. M. Sen, Senior Accountant"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[color:var(--marigold)] text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    <button
                      disabled={!verifier.trim() || reconciling}
                      onClick={() => handleReconcile(selected)}
                      className="w-full rounded-md bg-[color:var(--banyan)] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      {reconciling ? "Processing..." : "Reconcile Payment"}
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(selected)}
                        disabled={reconciling}
                        className="flex-1 rounded-md border border-[color:var(--alert)]/50 hover:bg-[color:var(--alert)]/5 px-4 py-2 text-xs font-medium text-[color:var(--alert)] transition"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => setSelected(null)}
                        className="flex-1 rounded-md border border-border px-4 py-2 text-xs font-medium hover:bg-secondary transition"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  {!verifier.trim() && (
                    <p className="mt-2 text-[10px] text-muted-foreground text-center">
                      Verifier signature is required for audit trail logs.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
