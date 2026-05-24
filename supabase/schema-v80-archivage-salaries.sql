-- V80 - Archivage salarié sécurisé + gel historique planning
-- À lancer une seule fois dans Supabase SQL Editor.

alter table if exists public.employees
  add column if not exists active boolean default true,
  add column if not exists archived boolean default false,
  add column if not exists archived_at timestamptz;

update public.employees
set active = coalesce(active, true),
    archived = coalesce(archived, false)
where active is null or archived is null;

alter table if exists public.employee_planning
  add column if not exists employee_name_snapshot text,
  add column if not exists employee_daily_cost_snapshot numeric default 0;

-- Remplit les anciennes lignes planning avec le nom et coût actuels pour éviter
-- que l'archivage ou les futures modifications salarié cassent les historiques.
update public.employee_planning ep
set employee_name_snapshot = coalesce(ep.employee_name_snapshot, trim(coalesce(e.firstname,'') || ' ' || coalesce(e.lastname,''))),
    employee_daily_cost_snapshot = coalesce(ep.employee_daily_cost_snapshot, e.daily_cost, 0)
from public.employees e
where ep.employee_id = e.id;
