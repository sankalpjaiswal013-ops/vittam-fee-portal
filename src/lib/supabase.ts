import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof window !== "undefined" && (window as any).env?.NEXT_PUBLIC_SUPABASE_URL) ||
  import.meta.env.VITE_SUPABASE_URL ||
  "https://kzwsjrjactdebraeijwv.supabase.co";

const supabaseAnonKey = 
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  (typeof window !== "undefined" && (window as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6d3NqcmphY3RkZWJyYWVpand2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODEzOTksImV4cCI6MjEwMDU1NzM5OX0.Kuf7ydiQ3YuekO6BO2dgmgbUxXWn5WCF1u2ImNPMhbA";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
