-- V54 - Gestion des règlements manuels indépendants
-- Module simple de suivi, sans intégration au pilotage, aux chantiers ou à la TVA.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.manual_reglements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_date date DEFAULT CURRENT_DATE,
  client_supplier text DEFAULT '',
  label text DEFAULT '',
  amount numeric(12,2) DEFAULT 0,
  payment_method text DEFAULT 'Virement bancaire',
  status text DEFAULT 'À payer',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.manual_reglements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manual_reglements_select" ON public.manual_reglements;
DROP POLICY IF EXISTS "manual_reglements_insert" ON public.manual_reglements;
DROP POLICY IF EXISTS "manual_reglements_update" ON public.manual_reglements;
DROP POLICY IF EXISTS "manual_reglements_delete" ON public.manual_reglements;

CREATE POLICY "manual_reglements_select"
ON public.manual_reglements FOR SELECT TO authenticated USING (true);

CREATE POLICY "manual_reglements_insert"
ON public.manual_reglements FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "manual_reglements_update"
ON public.manual_reglements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "manual_reglements_delete"
ON public.manual_reglements FOR DELETE TO authenticated USING (true);

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_reglements TO authenticated;
