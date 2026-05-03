

-- PATCH V2.2 : suppression/archivage chantier + demandes liées
alter table public.internal_requests
drop constraint if exists internal_requests_project_id_fkey;

alter table public.internal_requests
add constraint internal_requests_project_id_fkey
foreign key (project_id)
references public.projects(id)
on delete cascade;

grant all on public.projects to anon, authenticated;
grant all on public.chantier_photos to anon, authenticated;
grant all on public.chantier_documents to anon, authenticated;
grant all on public.chantier_notes to anon, authenticated;
grant all on public.internal_requests to anon, authenticated;
