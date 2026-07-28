-- ==========================================================
-- VITTAM — Smart School FinTech schema
-- Run this in Supabase SQL Editor (Project > SQL Editor > New query)
-- ==========================================================

create extension if not exists "uuid-ossp";

-- Students
create table students (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  roll_no text unique not null,
  class text not null,
  guardian_name text,
  guardian_contact text,
  scholarship_flag boolean default false,
  transport_flag boolean default false,
  created_at timestamptz default now()
);

-- Fee type catalog (Tuition, Transport, Late Fee, etc.) — Person A owns this
create table fee_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null,               -- e.g. "Tuition Fee", "Transport Fee"
  category text not null,           -- tuition | transport | late | other
  default_amount numeric(10,2) not null,
  recurring boolean default false,  -- true = charged every term
  created_at timestamptz default now()
);

-- Fee assigned to a specific student (an invoice line)
create table fee_assignments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  fee_type_id uuid references fee_types(id),
  amount numeric(10,2) not null,
  due_date date not null,
  status text default 'pending',    -- pending | partial | paid | overdue
  created_at timestamptz default now()
);

-- Waivers (scholarship / discretionary discounts) — Person A owns this
create table waivers (
  id uuid primary key default uuid_generate_v4(),
  fee_assignment_id uuid references fee_assignments(id) on delete cascade,
  percent numeric(5,2),             -- e.g. 15.00 for 15%
  amount numeric(10,2),             -- flat amount alternative to percent
  reason text,
  created_at timestamptz default now()
);

-- Penalties (late fees etc.) — auto-applied by the fee engine
create table penalties (
  id uuid primary key default uuid_generate_v4(),
  fee_assignment_id uuid references fee_assignments(id) on delete cascade,
  amount numeric(10,2) not null,
  reason text,
  applied_at timestamptz default now()
);

-- Transactions — every payment attempt, digital or offline. Person B owns this.
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id),
  fee_assignment_id uuid references fee_assignments(id),
  amount numeric(10,2) not null,
  method text not null,             -- upi | cash | cheque
  status text default 'pending',    -- pending | verified | reconciled | failed
  razorpay_payment_id text,         -- set for UPI/digital payments
  razorpay_order_id text,
  deposit_slip_note text,           -- for cash/cheque: reference/slip number
  verified_by text,                 -- admin name who manually verified cash/cheque
  slip_url text,                    -- uploaded slip or receipt photo URL
  created_at timestamptz default now()
);

-- Helpful view: outstanding balance per student, used by the dashboard
create or replace view student_balances as
select
  s.id as student_id,
  s.name,
  s.roll_no,
  s.class,
  s.guardian_contact,
  s.scholarship_flag,
  s.transport_flag,
  coalesce(sum(fa.amount), 0) as total_billed,
  coalesce(sum(case when t.status = 'reconciled' then t.amount else 0 end), 0) as total_paid,
  coalesce(sum(fa.amount), 0) - coalesce(sum(case when t.status = 'reconciled' then t.amount else 0 end), 0) as balance_due,
  max(fa.due_date) as latest_due_date,
  coalesce((
    select count(distinct t2.id)
    from transactions t2
    join fee_assignments fa2 on t2.fee_assignment_id = fa2.id
    where fa2.student_id = s.id
      and t2.status = 'reconciled'
      and t2.created_at::date > fa2.due_date
  ), 0) as past_late_payments
from students s
left join fee_assignments fa on fa.student_id = s.id
left join transactions t on t.fee_assignment_id = fa.id
group by s.id, s.name, s.roll_no, s.class, s.guardian_contact, s.scholarship_flag, s.transport_flag;

-- Seed a few fee types to start with
insert into fee_types (name, category, default_amount, recurring) values
  ('Tuition Fee', 'tuition', 25000, true),
  ('Transport Fee', 'transport', 4000, true),
  ('Late Fee', 'late', 500, false);

-- Function to automatically calculate late-fee penalties (₹50 per week overdue)
create or replace function apply_overdue_penalties()
returns void language plpgsql as $$
declare
  rec record;
  days_late int;
  penalty_amt numeric(10,2);
begin
  -- Loop through unpaid fee assignments that are past due_date
  for rec in 
    select id, student_id, amount, due_date 
    from fee_assignments 
    where status in ('pending', 'overdue') and due_date < current_date
  loop
    days_late := current_date - rec.due_date;
    -- Penalty heuristic: ₹50 per week overdue
    penalty_amt := (days_late / 7) * 50.00;
    
    if penalty_amt > 0 then
      -- Check if a penalty row already exists
      if exists (select 1 from penalties where fee_assignment_id = rec.id) then
        update penalties set amount = penalty_amt where fee_assignment_id = rec.id;
      else
        insert into penalties (fee_assignment_id, amount, reason)
        values (rec.id, penalty_amt, 'Automated Overdue Penalty');
      end if;

      -- Mark the assignment as overdue
      update fee_assignments 
      set status = 'overdue' 
      where id = rec.id;
    end if;
  end loop;
end;
$$;

-- Create slips storage bucket if it does not exist
insert into storage.buckets (id, name, public)
values ('slips', 'slips', true)
on conflict (id) do nothing;

-- Create policies to allow public upload/view of slips safely
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public upload slips'
  ) then
    create policy "Public upload slips" on storage.objects for insert with check (bucket_id = 'slips');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public read slips'
  ) then
    create policy "Public read slips" on storage.objects for select using (bucket_id = 'slips');
  end if;
end
$$;
