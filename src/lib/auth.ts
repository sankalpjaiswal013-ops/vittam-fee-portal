import { supabase } from "./supabase";

export type StudentSession = {
  id: string;
  name: string;
  roll_no: string;
  class: string;
  guardian_name: string | null;
  guardian_contact: string | null;
};

// 1. Parent/Student Login Flow via OTP
export async function requestStudentOTP(rollNo: string, name: string) {
  try {
    const cleanRoll = rollNo.trim().toUpperCase();
    const cleanName = name.trim().toLowerCase();

    // Query student from Supabase
    const { data: student, error } = await supabase
      .from("students")
      .select("*")
      .ilike("roll_no", cleanRoll)
      .single();

    if (error || !student) {
      // If student is not in DB, check if it's the demo student Aarav Sharma
      if (cleanRoll === "10A-02" || cleanName.includes("aarav")) {
        const mockStudent: StudentSession = {
          id: "demo-aarav-id",
          name: "Aarav Sharma",
          roll_no: "10A-02",
          class: "10-A",
          guardian_name: "Priya Sharma",
          guardian_contact: "+919812345342"
        };
        return {
          ok: true,
          student: mockStudent,
          maskedContact: "+91 *******5342",
          otpCode: "123456"
        };
      }
      return { ok: false, error: `No student found with Roll Number "${cleanRoll}". Please check your roll number or add the student via Admin Console.` };
    }

    // Flexible name matching (handles case, extra spaces, first name / last name matches)
    const nameInDb = student.name.toLowerCase().trim();
    const isExactMatch = nameInDb === cleanName;
    const isPartialMatch = nameInDb.includes(cleanName) || cleanName.includes(nameInDb);
    const isFirstNameMatch = nameInDb.split(/\s+/)[0] === cleanName.split(/\s+/)[0];

    if (!isExactMatch && !isPartialMatch && !isFirstNameMatch) {
      return { 
        ok: false, 
        error: `Name mismatch: Roll number ${cleanRoll} is registered to "${student.name}". Please enter "${student.name}" or update contact records in Admin Console.` 
      };
    }

    // Mask phone number (e.g. +91 ******0002)
    const phone = student.guardian_contact || "";
    let maskedContact = " guardian phone ";
    if (phone.length > 4) {
      maskedContact = phone.slice(0, 3) + "*".repeat(Math.max(0, phone.length - 7)) + phone.slice(-4);
    }

    // Generate random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    return {
      ok: true,
      student: student as StudentSession,
      maskedContact,
      otpCode
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "An unexpected error occurred during login." };
  }
}

export function loginStudentSession(student: StudentSession) {
  if (typeof window !== "undefined") {
    localStorage.setItem("vittam_student", JSON.stringify(student));
  }
}

export function getStudentSession(): StudentSession | null {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("vittam_student");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function logoutStudentSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("vittam_student");
  }
}

// 2. Admin Staff Authentication Flow
export async function getAdminSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function logoutAdmin() {
  await supabase.auth.signOut();
}
