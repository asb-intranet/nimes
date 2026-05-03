

-- PATCH V2.3 : documents supprimables + affectations salariés fiables
grant all on public.employee_projects to anon, authenticated;
grant all on public.chantier_documents to anon, authenticated;

drop policy if exists "employee_projects open" on public.employee_projects;
create policy "employee_projects open"
on public.employee_projects
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "documents open" on public.chantier_documents;
create policy "documents open"
on public.chantier_documents
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "documents storage delete" on storage.objects;
create policy "documents storage delete"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'documents');

-- Préparation futur planning salarié
create table if not exists employee_planning (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  notes text,
  created_at timestamptz default now()
);

grant all on public.employee_planning to anon, authenticated;
alter table public.employee_planning enable row level security;

drop policy if exists "employee_planning open" on public.employee_planning;
create policy "employee_planning open"
on public.employee_planning
for all
to anon, authenticated
using (true)
with check (true);
