import { cn } from "@/lib/utils";

type Status = "reconciled" | "pending" | "overdue" | "verified" | "rejected";

const styles: Record<Status, string> = {
  reconciled: "bg-[color:var(--banyan)]/12 text-[color:var(--banyan)] border-[color:var(--banyan)]/30",
  verified: "bg-[color:var(--banyan)]/12 text-[color:var(--banyan)] border-[color:var(--banyan)]/30",
  pending: "bg-[color:var(--marigold)]/15 text-[color:var(--marigold)] border-[color:var(--marigold)]/40",
  overdue: "bg-[color:var(--alert)]/12 text-[color:var(--alert)] border-[color:var(--alert)]/30",
  rejected: "bg-[color:var(--alert)]/12 text-[color:var(--alert)] border-[color:var(--alert)]/30",
};

const labels: Record<Status, string> = {
  reconciled: "Reconciled",
  verified: "Verified",
  pending: "Pending verify",
  overdue: "Overdue",
  rejected: "Rejected",
};

export function StatusPill({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status],
        className,
      )}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}

export function MethodPill({ method }: { method: "UPI" | "cash" | "cheque" }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-secondary/60 px-2 py-0.5 font-mono text-xs uppercase tracking-wide">
      {method}
    </span>
  );
}
