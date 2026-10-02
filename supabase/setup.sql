-- Run this in Supabase SQL Editor AFTER reviewing it.
-- It keeps your existing tables and enables authenticated dashboard users to read them.
-- Your service-role Edge Functions continue to bypass RLS.

alter table public.tickets enable row level security;
alter table public.ticket_threads enable row level security;

drop policy if exists "Authenticated users can read tickets" on public.tickets;
create policy "Authenticated users can read tickets"
on public.tickets
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read ticket threads" on public.ticket_threads;
create policy "Authenticated users can read ticket threads"
on public.ticket_threads
for select
to authenticated
using (true);

-- Optional but recommended for live updates.
alter publication supabase_realtime add table public.tickets;
alter publication supabase_realtime add table public.ticket_threads;
