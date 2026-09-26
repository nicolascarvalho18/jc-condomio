-- Core operational schema for direct Supabase access.
-- Non-destructive: creates only missing tables, indexes, policies and helpers.

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  corporate_name text not null,
  trade_name text not null,
  cnpj text,
  email text,
  phone text,
  default_penalty_percent numeric(5,2) not null default 2.00 check (default_penalty_percent >= 0),
  default_interest_percent_monthly numeric(5,2) not null default 1.00 check (default_interest_percent_monthly >= 0),
  default_grace_days integer not null default 0 check (default_grace_days >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.companies (id, corporate_name, trade_name)
select distinct p.company_id, coalesce(nullif(p.company_name, ''), 'Souza Construção'), coalesce(nullif(p.company_name, ''), 'Souza Construção')
from public.profiles p
where p.company_id is not null
on conflict (id) do nothing;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  customer_type text not null default 'INDIVIDUAL' check (customer_type in ('INDIVIDUAL','COMPANY')),
  name text not null,
  document text not null,
  email text,
  phone text,
  address jsonb not null default '{}'::jsonb,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','PAUSED','FINISHED','CANCELLED')),
  status_reason text,
  status_notes text,
  status_date date,
  lgpd_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  unique (company_id, document)
);

create table if not exists public.condominiums (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  name text not null,
  cnpj text,
  type text not null default 'CONDOMINIUM',
  construction_status text not null default 'PLANNING',
  status text not null default 'ACTIVE' check (status in ('ACTIVE','PAUSED','FINISHED','CANCELLED')),
  manager jsonb not null default '{}'::jsonb,
  address jsonb not null default '{}'::jsonb,
  project_details jsonb not null default '{}'::jsonb,
  status_reason text,
  status_notes text,
  status_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  customer_id uuid references public.customers(id),
  condominium_id uuid references public.condominiums(id),
  contract_number text not null,
  contract_type text not null default 'SERVICE',
  description text,
  service_type text,
  service_description text,
  contract_date date not null default current_date,
  total_amount numeric(15,2) not null default 0 check (total_amount >= 0),
  down_payment numeric(15,2) not null default 0 check (down_payment >= 0),
  balance_amount numeric(15,2) not null default 0 check (balance_amount >= 0),
  status text not null default 'ACTIVE' check (status in ('DRAFT','ACTIVE','PAUSED','IN_RENEGOTIATION','FINISHED','CANCELLED')),
  penalty_percent numeric(5,2) not null default 2.00 check (penalty_percent >= 0),
  interest_percent_monthly numeric(5,2) not null default 1.00 check (interest_percent_monthly >= 0),
  grace_days integer not null default 0 check (grace_days >= 0),
  status_reason text,
  status_notes text,
  status_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, contract_number)
);

create table if not exists public.installments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  contract_id uuid not null references public.contracts(id),
  installment_number integer not null,
  total_installments integer not null,
  installment_type text not null default 'MONTHLY',
  due_date date not null,
  business_due_date date not null,
  original_amount numeric(15,2) not null check (original_amount >= 0),
  base_amount numeric(15,2) not null default 0 check (base_amount >= 0),
  penalty_amount numeric(15,2) not null default 0 check (penalty_amount >= 0),
  interest_amount numeric(15,2) not null default 0 check (interest_amount >= 0),
  discount_amount numeric(15,2) not null default 0 check (discount_amount >= 0),
  paid_amount numeric(15,2) not null default 0 check (paid_amount >= 0),
  balance_amount numeric(15,2) not null default 0 check (balance_amount >= 0),
  updated_amount numeric(15,2) not null default 0 check (updated_amount >= 0),
  days_late integer not null default 0 check (days_late >= 0),
  status text not null default 'OPEN' check (status in ('OPEN','DUE_TODAY','OVERDUE','PARTIALLY_PAID','PAID','CANCELLED','RENEGOTIATED')),
  status_reason text,
  status_notes text,
  status_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, installment_number)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  installment_id uuid not null references public.installments(id),
  payment_date date not null default current_date,
  amount_received numeric(15,2) not null check (amount_received > 0),
  penalty_applied numeric(15,2) not null default 0 check (penalty_applied >= 0),
  interest_applied numeric(15,2) not null default 0 check (interest_applied >= 0),
  discount_applied numeric(15,2) not null default 0 check (discount_applied >= 0),
  payment_method text not null,
  transaction_reference text,
  registered_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  action text not null,
  entity_name text not null,
  entity_id text,
  performed_by uuid references auth.users(id),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_company on public.customers(company_id);
create index if not exists idx_condominiums_company on public.condominiums(company_id);
create index if not exists idx_contracts_company on public.contracts(company_id);
create index if not exists idx_installments_company_due on public.installments(company_id, due_date);
create index if not exists idx_payments_company on public.payments(company_id);
create index if not exists idx_audit_logs_company_created on public.audit_logs(company_id, created_at desc);

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid() and active = true limit 1;
$$;

grant execute on function public.current_company_id() to authenticated;

alter table public.companies enable row level security;
alter table public.customers enable row level security;
alter table public.condominiums enable row level security;
alter table public.contracts enable row level security;
alter table public.installments enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

create policy companies_same_company_select on public.companies for select to authenticated using (id = public.current_company_id());
create policy companies_admin_update on public.companies for update to authenticated using (id = public.current_company_id()) with check (id = public.current_company_id());

create policy customers_same_company_all on public.customers for all to authenticated using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy condominiums_same_company_all on public.condominiums for all to authenticated using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy contracts_same_company_all on public.contracts for all to authenticated using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy installments_same_company_all on public.installments for all to authenticated using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy payments_same_company_all on public.payments for all to authenticated using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy audit_logs_same_company_select on public.audit_logs for select to authenticated using (company_id = public.current_company_id());
create policy audit_logs_same_company_insert on public.audit_logs for insert to authenticated with check (company_id = public.current_company_id() and performed_by = auth.uid());

grant select, insert, update, delete on public.customers, public.condominiums, public.contracts, public.installments, public.payments to authenticated;
grant select, update on public.companies to authenticated;
grant select, insert on public.audit_logs to authenticated;

