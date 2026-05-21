-- V55 - Module Gestion : Calcul marge devis / chantier
-- À exécuter dans Supabase SQL Editor après déploiement de la V55.

CREATE TABLE IF NOT EXISTS public.margin_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  client text DEFAULT '',
  description text DEFAULT '',
  sale_ht numeric(12,2) DEFAULT 0,
  client_tva_rate numeric(5,2) DEFAULT 10,
  discount numeric(12,2) DEFAULT 0,
  target_margin_rate numeric(5,2) DEFAULT 30,
  expenses jsonb DEFAULT '[]'::jsonb,
  labor jsonb DEFAULT '[]'::jsonb,
  total_expenses_ht numeric(12,2) DEFAULT 0,
  total_labor numeric(12,2) DEFAULT 0,
  total_cost numeric(12,2) DEFAULT 0,
  margin_ht numeric(12,2) DEFAULT 0,
  margin_rate numeric(6,2) DEFAULT 0,
  tva_collected numeric(12,2) DEFAULT 0,
  tva_deductible numeric(12,2) DEFAULT 0,
  tva_balance numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.margin_simulations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "margin_simulations_select" ON public.margin_simulations;
DROP POLICY IF EXISTS "margin_simulations_insert" ON public.margin_simulations;
DROP POLICY IF EXISTS "margin_simulations_update" ON public.margin_simulations;
DROP POLICY IF EXISTS "margin_simulations_delete" ON public.margin_simulations;

CREATE POLICY "margin_simulations_select"
ON public.margin_simulations FOR SELECT TO authenticated USING (true);

CREATE POLICY "margin_simulations_insert"
ON public.margin_simulations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "margin_simulations_update"
ON public.margin_simulations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "margin_simulations_delete"
ON public.margin_simulations FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.margin_simulations TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
