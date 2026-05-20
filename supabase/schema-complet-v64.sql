-- V64 - Gestion : règlements clients hors intranet
-- À exécuter dans Supabase si la colonne status n'existe pas encore.

CREATE TABLE IF NOT EXISTS public.client_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NULL REFERENCES public.projects(id) ON DELETE SET NULL,
  revenue_id uuid NULL REFERENCES public.project_revenues(id) ON DELETE SET NULL,
  payment_date date,
  client text NOT NULL DEFAULT '',
  invoice_number text DEFAULT '',
  amount_ttc numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'Virement bancaire',
  status text DEFAULT 'payee',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.client_payments ADD COLUMN IF NOT EXISTS status text DEFAULT 'payee';
ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_payments_select" ON public.client_payments;
DROP POLICY IF EXISTS "client_payments_insert" ON public.client_payments;
DROP POLICY IF EXISTS "client_payments_update" ON public.client_payments;
DROP POLICY IF EXISTS "client_payments_delete" ON public.client_payments;

CREATE POLICY "client_payments_select" ON public.client_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "client_payments_insert" ON public.client_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "client_payments_update" ON public.client_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "client_payments_delete" ON public.client_payments FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_payments TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
