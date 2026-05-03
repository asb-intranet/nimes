-- PATCH RAPIDE À LANCER DANS SUPABASE SQL EDITOR

alter table public.projects add column if not exists color text default '#0f172a';
alter table public.projects add column if not exists description text;
alter table public.projects add column if not exists client text;
alter table public.projects add column if not exists address text;
alter table public.projects add column if not exists status text default 'en_cours';

grant usage on schema public to anon, authenticated;
grant all on public.projects to anon, authenticated;
grant all on public.chantier_photos to anon, authenticated;

drop policy if exists "projects open" on public.projects;
create policy "projects open"
on public.projects
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "photos open" on public.chantier_photos;
create policy "photos open"
on public.chantier_photos
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "photos storage delete" on storage.objects;
create policy "photos storage delete"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'photos');
