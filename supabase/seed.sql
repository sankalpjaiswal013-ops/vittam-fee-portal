-- ==========================================================
-- VITTAM seed data — 5 realistic test students with a mix of
-- current and overdue fees. Run in Supabase SQL Editor.
-- ==========================================================

-- Clear any existing test data (safe to re-run)
delete from transactions;
delete from waivers;
delete from penalties;
delete from fee_assignments;
delete from students;

-- ── Students ──────────────────────────────────────────────
insert into students (id, name, roll_no, class, guardian_name, guardian_contact, scholarship_flag, transport_flag) values
  ('11111111-0000-0000-0000-000000000001', 'Arjun Mehta',     '10A-01', '10-A', 'Rakesh Mehta',   '+91 98765 00001', false, true),
  ('11111111-0000-0000-0000-000000000002', 'Priya Sharma',    '10A-02', '10-A', 'Sunita Sharma',  '+91 98765 00002', true,  false),
  ('11111111-0000-0000-0000-000000000003', 'Karan Verma',     '9B-01',  '9-B',  'Mohan Verma',    '+91 98765 00003', false, true),
  ('11111111-0000-0000-0000-000000000004', 'Ananya Iyer',     '9B-02',  '9-B',  'Deepa Iyer',     '+91 98765 00004', false, false),
  ('11111111-0000-0000-0000-000000000005', 'Rohan Desai',     '8C-01',  '8-C',  'Vijay Desai',    '+91 98765 00005', false, false);

-- ── Fee type IDs (from seed in schema.sql — fetch real IDs if they differ) ──
-- We'll use a subquery to get the actual IDs from fee_types
-- Assign fees using subqueries for portability

-- ── Arjun Mehta — Tuition OVERDUE, Transport paid ──────────
insert into fee_assignments (id, student_id, fee_type_id, amount, due_date, status)
select
  '22222222-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',
  id, 25000, '2026-06-30', 'pending'
from fee_types where name = 'Tuition Fee' limit 1;

insert into fee_assignments (id, student_id, fee_type_id, amount, due_date, status)
select
  '22222222-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000001',
  id, 4000, '2026-06-30', 'paid'
from fee_types where name = 'Transport Fee' limit 1;

-- Arjun paid transport
insert into transactions (student_id, fee_assignment_id, amount, method, status, verified_by)
values (
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000002',
  4000, 'cash', 'reconciled', 'Admin'
);

-- ── Priya Sharma — Scholarship student, waivered tuition ────
insert into fee_assignments (id, student_id, fee_type_id, amount, due_date, status)
select
  '22222222-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000002',
  id, 25000, '2026-07-31', 'pending'
from fee_types where name = 'Tuition Fee' limit 1;

insert into waivers (fee_assignment_id, percent, reason)
values ('22222222-0000-0000-0000-000000000003', 50.00, 'Merit scholarship');

-- ── Karan Verma — SEVERELY overdue both fees ────────────────
insert into fee_assignments (id, student_id, fee_type_id, amount, due_date, status)
select
  '22222222-0000-0000-0000-000000000004',
  '11111111-0000-0000-0000-000000000003',
  id, 25000, '2026-04-30', 'overdue'
from fee_types where name = 'Tuition Fee' limit 1;

insert into fee_assignments (id, student_id, fee_type_id, amount, due_date, status)
select
  '22222222-0000-0000-0000-000000000005',
  '11111111-0000-0000-0000-000000000003',
  id, 4000, '2026-04-30', 'overdue'
from fee_types where name = 'Transport Fee' limit 1;

-- ── Ananya Iyer — Partially paid (cash pending) ─────────────
insert into fee_assignments (id, student_id, fee_type_id, amount, due_date, status)
select
  '22222222-0000-0000-0000-000000000006',
  '11111111-0000-0000-0000-000000000004',
  id, 25000, '2026-07-15', 'pending'
from fee_types where name = 'Tuition Fee' limit 1;

-- Cash payment logged but not yet verified
insert into transactions (student_id, fee_assignment_id, amount, method, status, deposit_slip_note)
values (
  '11111111-0000-0000-0000-000000000004',
  '22222222-0000-0000-0000-000000000006',
  25000, 'cash', 'pending', 'Slip #ANY-2026-07'
);

-- ── Rohan Desai — Fully paid via UPI ────────────────────────
insert into fee_assignments (id, student_id, fee_type_id, amount, due_date, status)
select
  '22222222-0000-0000-0000-000000000007',
  '11111111-0000-0000-0000-000000000005',
  id, 25000, '2026-07-31', 'paid'
from fee_types where name = 'Tuition Fee' limit 1;

insert into transactions (student_id, fee_assignment_id, amount, method, status, razorpay_payment_id, razorpay_order_id)
values (
  '11111111-0000-0000-0000-000000000005',
  '22222222-0000-0000-0000-000000000007',
  25000, 'upi', 'reconciled', 'pay_testSEED001', 'order_testSEED001'
);
