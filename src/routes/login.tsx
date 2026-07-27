import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteNav } from "@/components/vittam/SiteNav";
import { ReceiptCard } from "@/components/vittam/ReceiptCard";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Staff Login — Vittam admin" },
      { name: "description", content: "Login with your email and password to access the Vittam admin console." },
    ],
  }),
  component: StaffLogin,
});

function StaffLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nav = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        nav({ to: "/dashboard" });
      }
    });
  }, [nav]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      nav({ to: "/dashboard" });
    }
  }

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-md px-6 py-20">
        <ReceiptCard className="p-8">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-foreground">Staff Login</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to manage student records, assign fees, and reconcile deposit receipts.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="mb-1 block text-sm font-medium">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--marigold)]"
                  placeholder="admin@school.edu"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--marigold)]"
                  placeholder="••••••••"
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
                {loading ? "Signing in..." : "Sign in to console"}
              </button>
            </form>
          </div>
        </ReceiptCard>
        
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Not staff?{" "}
          <Link to="/student-login" className="underline underline-offset-4">
            Go to Parent Portal
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
