export type Txn = {
  id: string;
  date: string; // ISO
  method: "UPI" | "cash" | "cheque";
  amount: number;
  status: "reconciled" | "pending";
  ref?: string;
};

export type Student = {
  id: string;
  name: string;
  rollNo: string;
  class: string;
  guardianName: string;
  guardianContact: string;
  outstanding: number;
  lateFee: number;
  daysOverdue: number;
  txns: Txn[];
};

export const currentStudent: Student = {
  id: "s-001",
  name: "Aarav Sharma",
  rollNo: "8B-14",
  class: "Class 8-B",
  guardianName: "Priya Sharma",
  guardianContact: "+91 98•••••342",
  outstanding: 12450,
  lateFee: 250,
  daysOverdue: 9,
  txns: [
    { id: "t1", date: "2026-06-10", method: "UPI", amount: 5000, status: "reconciled", ref: "UPI/823917" },
    { id: "t2", date: "2026-05-04", method: "cash", amount: 3000, status: "reconciled", ref: "RCPT-4412" },
    { id: "t3", date: "2026-04-02", method: "cheque", amount: 8000, status: "pending", ref: "CHQ-118203" },
    { id: "t4", date: "2026-03-01", method: "UPI", amount: 5000, status: "reconciled", ref: "UPI/781022" },
  ],
};

export const defaulters: Array<{
  id: string;
  name: string;
  rollNo: string;
  class: string;
  balance: number;
  daysOverdue: number;
  guardian: string;
  phone: string;
}> = [
  { id: "d1", name: "Aarav Sharma", rollNo: "8B-14", class: "8-B", balance: 12450, daysOverdue: 9, guardian: "Priya Sharma", phone: "919812345342" },
  { id: "d2", name: "Isha Patel", rollNo: "9A-03", class: "9-A", balance: 18800, daysOverdue: 21, guardian: "Rakesh Patel", phone: "919900011122" },
  { id: "d3", name: "Kabir Menon", rollNo: "7C-22", class: "7-C", balance: 6400, daysOverdue: 4, guardian: "Anita Menon", phone: "919845567780" },
  { id: "d4", name: "Zara Khan", rollNo: "10B-11", class: "10-B", balance: 24200, daysOverdue: 31, guardian: "Faisal Khan", phone: "919845112233" },
  { id: "d5", name: "Vihaan Rao", rollNo: "6A-08", class: "6-A", balance: 3200, daysOverdue: 2, guardian: "Meena Rao", phone: "919900556677" },
];

export function riskScore(balance: number, daysOverdue: number) {
  return Math.round((balance / 1000) * Math.max(1, daysOverdue) * 0.5);
}

export const depositSlips = [
  { id: "sl1", ref: "DEP-2401-88", student: "Isha Patel", rollNo: "9A-03", amount: 18800, uploadedAt: "2026-07-24", note: "Union Bank challan, morning deposit" },
  { id: "sl2", ref: "DEP-2401-89", student: "Rohan Iyer", rollNo: "8A-19", amount: 7500, uploadedAt: "2026-07-24", note: "HDFC branch — cash" },
  { id: "sl3", ref: "DEP-2401-90", student: "Meher Kaur", rollNo: "10A-04", amount: 22000, uploadedAt: "2026-07-25", note: "ICICI cheque deposit slip" },
  { id: "sl4", ref: "DEP-2401-91", student: "Aditya Nair", rollNo: "7B-12", amount: 5400, uploadedAt: "2026-07-25", note: "SBI cash counter" },
  { id: "sl5", ref: "DEP-2401-92", student: "Ananya Ghosh", rollNo: "9B-07", amount: 12000, uploadedAt: "2026-07-26", note: "Axis Bank challan" },
  { id: "sl6", ref: "DEP-2401-93", student: "Devraj Singh", rollNo: "6B-21", amount: 3200, uploadedAt: "2026-07-26", note: "Kotak — cheque no. 118221" },
];

export function inr(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}
