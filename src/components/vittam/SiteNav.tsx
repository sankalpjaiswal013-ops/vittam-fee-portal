import { Link } from "@tanstack/react-router";

export function SiteNav() {
  return (
    <header className="border-b border-border/60 backdrop-blur-md bg-background/70 sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-block h-6 w-6 rounded-sm bg-[color:var(--marigold)]" />
          <span className="font-serif text-xl font-semibold">Vittam</span>
        </Link>
        <nav className="hidden gap-3 text-sm text-muted-foreground sm:flex items-center">
          <Link
            to="/student-login"
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary text-foreground transition-all flex items-center gap-1"
          >
            <span>🎓</span> Student & Parent Portal
          </Link>
          <Link
            to="/admin/"
            className="ml-1 inline-flex items-center gap-1.5 rounded-md bg-[color:var(--marigold)] px-3 py-1.5 text-xs font-semibold text-[#1a130a] hover:brightness-95 transition-all"
          >
            <span>⚙</span> Admin Console
          </Link>
        </nav>
      </div>
    </header>
  );
}

