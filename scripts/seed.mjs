// Seed script — run with: node scripts/seed.mjs
// Requires dev server running at http://localhost:3000
// Idempotent: skip-on-duplicate by roll number

const BASE = "http://localhost:3000";

// Realistic Indian school student roster — 20 students across 4 classes
const STUDENTS = [
  { name: "Arjun Mehta",      class: "10-A", roll_no: "10A-01", guardian_name: "Suresh Mehta",      guardian_contact: "9876543210", scholarship_flag: false, transport_flag: true },
  { name: "Priya Sharma",     class: "10-A", roll_no: "10A-02", guardian_name: "Rekha Sharma",      guardian_contact: "9876543211", scholarship_flag: false, transport_flag: false },
  { name: "Rahul Nair",       class: "10-A", roll_no: "10A-03", guardian_name: "Vijay Nair",        guardian_contact: "9876543212", scholarship_flag: true,  transport_flag: false },
  { name: "Sneha Kulkarni",   class: "10-A", roll_no: "10A-04", guardian_name: "Mohan Kulkarni",   guardian_contact: "9876543213", scholarship_flag: false, transport_flag: false },
  { name: "Dev Patel",        class: "10-A", roll_no: "10A-05", guardian_name: "Harish Patel",      guardian_contact: "9876543214", scholarship_flag: false, transport_flag: true },

  { name: "Karan Verma",      class: "9-B",  roll_no: "9B-01",  guardian_name: "Ashok Verma",       guardian_contact: "9876543220", scholarship_flag: false, transport_flag: false },
  { name: "Ananya Iyer",      class: "9-B",  roll_no: "9B-02",  guardian_name: "Lakshmi Iyer",      guardian_contact: "9876543221", scholarship_flag: false, transport_flag: false },
  { name: "Rohan Desai",      class: "9-B",  roll_no: "9B-03",  guardian_name: "Neha Desai",        guardian_contact: "9876543222", scholarship_flag: true,  transport_flag: false },
  { name: "Kavya Menon",      class: "9-B",  roll_no: "9B-04",  guardian_name: "Rajan Menon",       guardian_contact: "9876543223", scholarship_flag: false, transport_flag: true },
  { name: "Aditya Singh",     class: "9-B",  roll_no: "9B-05",  guardian_name: "Gurpreet Singh",    guardian_contact: "9876543224", scholarship_flag: false, transport_flag: false },

  { name: "Ravi Kumar",       class: "11-A", roll_no: "11A-01", guardian_name: "Ramesh Kumar",      guardian_contact: "9876543230", scholarship_flag: false, transport_flag: false },
  { name: "Meera Joshi",      class: "11-A", roll_no: "11A-02", guardian_name: "Sanjay Joshi",      guardian_contact: "9876543231", scholarship_flag: false, transport_flag: false },
  { name: "Akash Pandey",     class: "11-A", roll_no: "11A-03", guardian_name: "Rakesh Pandey",     guardian_contact: "9876543232", scholarship_flag: true,  transport_flag: false },
  { name: "Divya Reddy",      class: "11-A", roll_no: "11A-04", guardian_name: "Suresh Reddy",      guardian_contact: "9876543233", scholarship_flag: false, transport_flag: false },
  { name: "Nikhil Shah",      class: "11-A", roll_no: "11A-05", guardian_name: "Bhavesh Shah",      guardian_contact: "9876543234", scholarship_flag: false, transport_flag: true },

  { name: "Pooja Rajput",     class: "8-C",  roll_no: "8C-01",  guardian_name: "Dinesh Rajput",     guardian_contact: "9876543240", scholarship_flag: false, transport_flag: false },
  { name: "Siddharth Tiwari", class: "8-C",  roll_no: "8C-02",  guardian_name: "Arvind Tiwari",     guardian_contact: "9876543241", scholarship_flag: false, transport_flag: false },
  { name: "Nandini Bhat",     class: "8-C",  roll_no: "8C-03",  guardian_name: "Krishna Bhat",      guardian_contact: "9876543242", scholarship_flag: false, transport_flag: false },
  { name: "Farhan Siddiqui",  class: "8-C",  roll_no: "8C-04",  guardian_name: "Hamid Siddiqui",    guardian_contact: "9876543243", scholarship_flag: false, transport_flag: false },
  { name: "Ishita Ghosh",     class: "8-C",  roll_no: "8C-05",  guardian_name: "Tapan Ghosh",       guardian_contact: "9876543244", scholarship_flag: true,  transport_flag: false },
];

const today = new Date();
function daysAgo(n)  { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().slice(0,10); }
function daysAhead(n){ const d = new Date(today); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); }

async function post(url, body) {
  const r = await fetch(`${BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function getFeeTypes() {
  const r = await fetch(`${BASE}/api/fees`);
  return r.json();
}

async function getStudents() {
  const r = await fetch(`${BASE}/api/students`);
  return r.json();
}

async function assignFee(student_id, fee_type_id, amount, due_date) {
  const r = await fetch(`${BASE}/api/fee-assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id, fee_type_id, amount, due_date }),
  });
  return r.json();
}

async function logOffline(student_id, fee_assignment_id, amount, method) {
  const r = await fetch(`${BASE}/api/payments/offline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_id, fee_assignment_id, amount, method, deposit_slip_note: "Front desk" }),
  });
  return r.json();
}

async function reconcile(transaction_id, fee_assignment_id) {
  const r = await fetch(`${BASE}/api/payments/offline`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction_id, fee_assignment_id, verified_by: "Vittam Admin" }),
  });
  return r.json();
}

async function applyWaiver(fee_assignment_id, percent, reason) {
  const r = await fetch(`${BASE}/api/waivers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fee_assignment_id, percent, reason }),
  });
  return r.json();
}

async function main() {
  console.log("Fetching fee types...");
  const feeTypes = await getFeeTypes();
  console.log("Fee types:", feeTypes.map(f => `${f.name}(${f.id})`).join(", "));

  const tuition = feeTypes.find(f => f.name?.toLowerCase().includes("tuit") || f.category?.toLowerCase().includes("tuit")) ?? feeTypes[0];
  const transport = feeTypes.find(f => f.name?.toLowerCase().includes("transp") || f.name?.toLowerCase().includes("bus")) ?? feeTypes[1] ?? feeTypes[0];
  const exam = feeTypes.find(f => f.name?.toLowerCase().includes("exam") || f.name?.toLowerCase().includes("library")) ?? feeTypes[2] ?? feeTypes[0];

  console.log("\nUsing fee types:", tuition?.name, transport?.name, exam?.name);

  // Get existing students to avoid duplicates
  const existing = await getStudents();
  const existingRolls = new Set(existing.map(s => s.roll_no));

  console.log(`\nExisting students: ${existing.length}`);
  console.log("Seeding new students...\n");

  const created = [];

  for (const s of STUDENTS) {
    if (existingRolls.has(s.roll_no)) {
      const ex = existing.find(e => e.roll_no === s.roll_no);
      console.log(`  SKIP  ${s.name} (${s.roll_no}) — already exists`);
      created.push(ex);
      continue;
    }
    const r = await post("/api/students", s);
    if (r.id) {
      console.log(`  ✓  Created ${r.name} (${r.roll_no})`);
      created.push(r);
    } else {
      console.log(`  ✗  Failed ${s.name}: ${JSON.stringify(r)}`);
    }
  }

  console.log(`\n\nAssigning fees and payment scenarios...`);

  // Helper: find student by roll_no in created list
  const byRoll = (roll) => created.find(s => s.roll_no === roll);

  if (!tuition) { console.log("No fee types found — create at least one fee type first from /admin/students"); return; }

  // ── SCENARIO A: Fully paid (2 students) ────────────────────────────────
  // 10A-01 (Arjun Mehta) — paid tuition on time
  const arjun = byRoll("10A-01");
  if (arjun) {
    const fa = await assignFee(arjun.id, tuition.id, 12000, daysAhead(15));
    if (fa.id) {
      const txn = await logOffline(arjun.id, fa.id, 12000, "cash");
      if (txn.id) { await reconcile(txn.id, fa.id); console.log("  ✓  Arjun: tuition PAID"); }
    }
    if (transport) {
      const fa2 = await assignFee(arjun.id, transport.id, 2400, daysAhead(15));
      if (fa2.id) {
        const txn2 = await logOffline(arjun.id, fa2.id, 2400, "cash");
        if (txn2.id) { await reconcile(txn2.id, fa2.id); console.log("  ✓  Arjun: transport PAID"); }
      }
    }
  }

  // 9B-05 (Aditya Singh) — paid in full
  const aditya = byRoll("9B-05");
  if (aditya) {
    const fa = await assignFee(aditya.id, tuition.id, 12000, daysAhead(10));
    if (fa.id) {
      const txn = await logOffline(aditya.id, fa.id, 12000, "cheque");
      if (txn.id) { await reconcile(txn.id, fa.id); console.log("  ✓  Aditya: tuition PAID (cheque)"); }
    }
  }

  // ── SCENARIO B: Scholarship waivers applied (3 students) ───────────────
  // 10A-03 (Rahul Nair) — 50% scholarship waiver
  const rahul = byRoll("10A-03");
  if (rahul) {
    const fa = await assignFee(rahul.id, tuition.id, 12000, daysAhead(20));
    if (fa.id) {
      await applyWaiver(fa.id, 50, "Merit scholarship - top 5% district rank");
      console.log("  ✓  Rahul: 50% scholarship waiver applied, ₹6,000 due");
    }
  }

  // 9B-03 (Rohan Desai) — 30% scholarship waiver
  const rohan = byRoll("9B-03");
  if (rohan) {
    const fa = await assignFee(rohan.id, tuition.id, 12000, daysAhead(25));
    if (fa.id) {
      await applyWaiver(fa.id, 30, "Sports scholarship - state level cricket");
      console.log("  ✓  Rohan: 30% scholarship waiver applied, ₹8,400 due");
    }
  }

  // 11A-03 (Akash Pandey) — BPL category full waiver
  const akash = byRoll("11A-03");
  if (akash) {
    const fa = await assignFee(akash.id, tuition.id, 12000, daysAhead(15));
    if (fa.id) {
      await applyWaiver(fa.id, 100, "BPL category - full fee exemption");
      console.log("  ✓  Akash: 100% waiver applied (BPL)");
    }
  }

  // ── SCENARIO C: Severely overdue (risk HIGH) ────────────────────────────
  // 10A-05 (Dev Patel) — 120 days overdue tuition
  const dev = byRoll("10A-05");
  if (dev) {
    const fa = await assignFee(dev.id, tuition.id, 12000, daysAgo(120));
    if (fa.id) console.log("  ✓  Dev Patel: tuition OVERDUE 120 days ₹12,000");
    if (transport) {
      const fa2 = await assignFee(dev.id, transport.id, 2400, daysAgo(90));
      if (fa2.id) console.log("  ✓  Dev Patel: transport OVERDUE 90 days ₹2,400");
    }
  }

  // 9B-01 (Karan Verma) — 75 days overdue
  const karan = byRoll("9B-01");
  if (karan) {
    const fa = await assignFee(karan.id, tuition.id, 12000, daysAgo(75));
    if (fa.id) console.log("  ✓  Karan Verma: tuition OVERDUE 75 days");
    if (exam) {
      const fa2 = await assignFee(karan.id, exam.id, 500, daysAgo(60));
      if (fa2.id) console.log("  ✓  Karan Verma: exam fee OVERDUE 60 days");
    }
  }

  // 11A-05 (Nikhil Shah) — 95 days overdue
  const nikhil = byRoll("11A-05");
  if (nikhil) {
    const fa = await assignFee(nikhil.id, tuition.id, 15000, daysAgo(95)); // class 11 higher tuition
    if (fa.id) console.log("  ✓  Nikhil Shah: tuition OVERDUE 95 days ₹15,000");
    if (transport) {
      const fa2 = await assignFee(nikhil.id, transport.id, 2400, daysAgo(65));
      if (fa2.id) console.log("  ✓  Nikhil Shah: transport OVERDUE 65 days");
    }
  }

  // ── SCENARIO D: Moderately overdue (risk MEDIUM) ────────────────────────
  // 10A-02 (Priya Sharma) — 30 days overdue
  const priya = byRoll("10A-02");
  if (priya) {
    const fa = await assignFee(priya.id, tuition.id, 12000, daysAgo(30));
    if (fa.id) console.log("  ✓  Priya Sharma: tuition OVERDUE 30 days");
  }

  // 9B-04 (Kavya Menon) — 45 days overdue
  const kavya = byRoll("9B-04");
  if (kavya) {
    const fa = await assignFee(kavya.id, tuition.id, 12000, daysAgo(45));
    if (fa.id) console.log("  ✓  Kavya Menon: tuition OVERDUE 45 days");
    if (transport) {
      const fa2 = await assignFee(kavya.id, transport.id, 2400, daysAgo(45));
      if (fa2.id) console.log("  ✓  Kavya Menon: transport OVERDUE 45 days");
    }
  }

  // 8C-04 (Farhan Siddiqui) — 20 days overdue
  const farhan = byRoll("8C-04");
  if (farhan) {
    const fa = await assignFee(farhan.id, tuition.id, 10000, daysAgo(20));
    if (fa.id) console.log("  ✓  Farhan Siddiqui: OVERDUE 20 days");
  }

  // ── SCENARIO E: Upcoming (on-time) ──────────────────────────────────────
  // Remaining students get upcoming fees due in 2-4 weeks
  const upcoming = [
    { roll: "9B-02", amount: 12000, days: 14 },
    { roll: "11A-01", amount: 15000, days: 21 },
    { roll: "11A-02", amount: 15000, days: 28 },
    { roll: "11A-04", amount: 15000, days: 10 },
    { roll: "8C-01", amount: 10000, days: 18 },
    { roll: "8C-02", amount: 10000, days: 22 },
    { roll: "8C-03", amount: 10000, days: 30 },
    { roll: "8C-05", amount: 10000, days: 12 },
    { roll: "10A-04", amount: 12000, days: 7 },
  ];
  for (const u of upcoming) {
    const s = byRoll(u.roll);
    if (s && tuition) {
      const fa = await assignFee(s.id, tuition.id, u.amount, daysAhead(u.days));
      if (fa.id) console.log(`  ✓  ${s.name}: ₹${u.amount} due in ${u.days} days`);
    }
  }

  // ── SCENARIO F: Pending cash payment (awaiting verification) ────────────
  // Meera Joshi — logged cash, not reconciled
  const meera = byRoll("11A-02");
  if (meera && tuition) {
    const fa = await assignFee(meera.id, tuition.id, 15000, daysAgo(10));
    if (fa.id) {
      const txn = await logOffline(meera.id, fa.id, 15000, "cash");
      if (txn.id) console.log("  ✓  Meera Joshi: ₹15,000 cash logged — PENDING VERIFICATION");
    }
  }

  // Pooja Rajput — logged cheque, not reconciled
  const pooja = byRoll("8C-01");
  if (pooja && tuition) {
    const fa = await assignFee(pooja.id, tuition.id, 10000, daysAgo(5));
    if (fa.id) {
      const txn = await logOffline(pooja.id, fa.id, 10000, "cheque");
      if (txn.id) console.log("  ✓  Pooja Rajput: ₹10,000 cheque logged — PENDING VERIFICATION");
    }
  }

  console.log("\n✅ Seed complete! Visit /dashboard to see live data.");
}

main().catch(console.error);
