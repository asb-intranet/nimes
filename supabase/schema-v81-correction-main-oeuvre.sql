-- V81 - Correction main d'œuvre à 0 dans Gestion
-- À lancer une fois dans Supabase SQL Editor après la V80.
-- Cause : en V80, employee_daily_cost_snapshot pouvait être créé avec une valeur 0,
-- donc les anciennes lignes planning étaient considérées comme figées à 0 €.

alter table if exists public.employee_planning
  add column if not exists employee_name_snapshot text,
  add column if not exists employee_daily_cost_snapshot numeric;

-- Recalcule seulement les lignes vides ou à 0 à partir du coût salarié actuel.
-- Les lignes déjà figées avec un vrai coût (>0) ne sont pas modifiées.
update public.employee_planning ep
set employee_name_snapshot = coalesce(nullif(trim(ep.employee_name_snapshot), ''), trim(coalesce(e.firstname,'') || ' ' || coalesce(e.lastname,''))),
    employee_daily_cost_snapshot = e.daily_cost
from public.employees e
where ep.employee_id = e.id
  and coalesce(ep.employee_daily_cost_snapshot, 0) = 0
  and coalesce(e.daily_cost, 0) > 0;

-- Contrôle rapide : cette requête doit idéalement retourner 0 ligne pour les plannings rattachés à un salarié avec coût.
-- select ep.id, ep.employee_id, ep.start_date, ep.end_date, ep.employee_daily_cost_snapshot, e.daily_cost
-- from public.employee_planning ep
-- join public.employees e on e.id = ep.employee_id
-- where coalesce(ep.employee_daily_cost_snapshot, 0) = 0 and coalesce(e.daily_cost, 0) > 0;
