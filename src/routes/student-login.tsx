import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteNav } from "@/components/vittam/SiteNav";
import { ReceiptCard } from "@/components/vittam/ReceiptCard";
import { requestStudentOTP, loginStudentSession, getStudentSession } from "@/lib/auth";

export const Route = createFileRoute("/student-login")({
  head: () => ({
    meta: [
      { title: "Parent login — Vittam" },
      { name: "description", content: "Sign in to see fee balance, receipts, and pay outstanding dues." },
    ],
  }),
  component: StudentLogin,
});

function StudentLogin() {
  const [step, setStep] = useState<"identify" | "otp">("identify");
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [enteredOTP, setEnteredOTP] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [actualOTP, setActualOTP] = useState("");
  const [error, setError] = useState("");
  const [otpToast, setOtpToast] = useState<{ msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [studentRecord, setStudentRecord] = useState<any>(null);
  const nav = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    const session = getStudentSession();
    if (session) {
      nav({ to: "/student" });
    }
  }, [nav]);

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!name.trim() || !roll.trim()) {
      setError("Please fill in both student name and roll number.");
      setLoading(false);
      return;
    }

    const res = await requestStudentOTP(roll, name);
    setLoading(false);

    if (!res.ok || !res.student) {
      setError(res.error || "Student records do not match.");
      return;
    }

    setStudentRecord(res.student);
    setMaskedPhone(res.maskedContact || "");
    setActualOTP(res.otpCode || "");
    setStep("otp");

    // Display beautiful notification toast showing the simulated SMS code
    setOtpToast({ msg: `💬 SMS to ${res.maskedContact || 'guardian'}: Your VITTAM verification code is ${res.otpCode}` });
  }

  function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (enteredOTP.trim() !== actualOTP) {
      setError("Invalid verification code. Please check the SMS Toast and try again.");
      return;
    }

    if (studentRecord) {
      loginStudentSession(studentRecord);
      setOtpToast(null);
      nav({ to: "/student" });
    }
  }

  return (
    <div className="min-h-screen relative">
      <SiteNav />

      {/* Simulated SMS Toast */}
      {otpToast && (
        <div className="fixed top-6 right-6 bg-[color:var(--marigold)] text-black font-mono font-semibold px-4 py-3 rounded-xl shadow-2xl z-50 border border-white/10 animate-bounce max-w-sm">
          {otpToast.msg}
          <button onClick={() => setOtpToast(null)} className="ml-3 text-black/50 hover:text-black">✕</button>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-6 py-12">
        {/* Overdue notification banner */}
        <div className="mb-8 rounded-lg border border-[color:var(--alert)]/40 bg-[color:var(--alert)]/8 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-[color:var(--alert)]">Fee overdue</p>
              <p className="mt-1 text-sm">
                Need to test? Try student <span className="font-semibold text-white">Aarav Sharma</span> (Roll: <span className="font-semibold text-white font-mono">10A-02</span>) or upload your CSV roster in the Admin Console.
              </p>
            </div>
            <a href="#login" className="text-sm font-medium text-[color:var(--alert)] underline underline-offset-4">
              Sign in to resolve
            </a>
          </div>
        </div>

        <ReceiptCard className="p-8">
          <div id="login">
            <h1 className="font-serif text-3xl font-semibold">Parent sign-in</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Roll number identifies the account. It is not a secret — an OTP goes to the guardian phone
              on record before access is granted.
            </p>

            {step === "identify" ? (
              <form className="mt-6 space-y-4" onSubmit={handleSendOTP}>
                <div>
                  <label className="mb-1 block text-sm font-medium">Student full name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--marigold)]"
                    placeholder="e.g. Aarav Sharma"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Roll number</label>
                  <input
                    value={roll}
                    onChange={(e) => setRoll(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--marigold)]"
                    placeholder="e.g. 10A-02"
                    required
                  />
                </div>

                {error && (
                  <p className="text-xs text-[color:var(--alert)] bg-[color:var(--alert)]/10 border border-[color:var(--alert)]/20 rounded p-2.5">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-[color:var(--marigold)] px-4 py-2.5 text-sm font-medium text-[color:var(--primary-foreground)] hover:brightness-95 disabled:opacity-50"
                >
                  {loading ? "Locating record..." : "Continue"}
                </button>
              </form>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={handleVerifyOTP}>
                <div>
                  <label className="mb-1 block text-sm font-medium">Enter OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={enteredOTP}
                    onChange={(e) => setEnteredOTP(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-lg tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[color:var(--marigold)] text-center"
                    placeholder="••••••"
                    required
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Six-digit code sent to guardian phone ending in {maskedPhone}.
                  </p>
                </div>

                {error && (
                  <p className="text-xs text-[color:var(--alert)] bg-[color:var(--alert)]/10 border border-[color:var(--alert)]/20 rounded p-2.5">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full rounded-md bg-[color:var(--marigold)] px-4 py-2.5 text-sm font-medium text-[color:var(--primary-foreground)] hover:brightness-95"
                >
                  Verify and continue
                </button>
                <button
                  type="button"
                  onClick={() => setStep("identify")}
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  Back
                </button>
              </form>
            )}
          </div>
        </ReceiptCard>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          School admin?{" "}
          <Link to="/login" className="underline underline-offset-4">
            Open the admin console
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
