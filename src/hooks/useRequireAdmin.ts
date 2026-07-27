import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

export function useRequireAdmin() {
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<any>(null);
  const nav = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        nav({ to: "/login" });
      } else {
        setAdmin(session.user);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        nav({ to: "/login" });
      } else if (session) {
        setAdmin(session.user);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [nav]);

  return { admin, loading };
}
