-- ============================================================
-- MoneyMilo V4.1 — Adaptive household & business money profiles
-- Run AFTER phase-2-1-1.sql. Idempotent.
-- ============================================================

create table if not exists financial_entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  entity_type text not null default 'person', -- person | household | business
  scope text not null default 'household',    -- household | business
  relationship text,                         -- self | partner | household_member | owner
  is_primary boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_financial_entities_user on financial_entities(user_id, scope);

alter table financial_entities enable row level security;
drop policy if exists "own rows" on financial_entities;
create policy "own rows" on financial_entities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table user_profiles
  add column if not exists profile_scope text default 'individual',
  add column if not exists business_mode text default 'none';

alter table income_sources
  add column if not exists entity_id uuid references financial_entities(id) on delete set null,
  add column if not exists scope text default 'household',
  add column if not exists income_kind text,
  add column if not exists amount_basis text default 'take_home',
  add column if not exists variability text default 'fixed';

alter table income_records
  add column if not exists entity_id uuid references financial_entities(id) on delete set null,
  add column if not exists scope text default 'household';

alter table expenses
  add column if not exists entity_id uuid references financial_entities(id) on delete set null,
  add column if not exists scope text default 'household',
  add column if not exists frequency text default 'monthly',
  add column if not exists essentiality text default 'required';

alter table liabilities
  add column if not exists entity_id uuid references financial_entities(id) on delete set null,
  add column if not exists scope text default 'household';

update income_sources set scope = 'household' where scope is null;
update income_records set scope = 'household' where scope is null;
update expenses set scope = 'household' where scope is null;
update liabilities set scope = 'household' where scope is null;

create index if not exists idx_income_sources_scope on income_sources(user_id, scope);
create index if not exists idx_income_records_scope on income_records(user_id, month, scope);
create index if not exists idx_expenses_scope on expenses(user_id, month, scope);
create index if not exists idx_liabilities_scope on liabilities(user_id, scope);
