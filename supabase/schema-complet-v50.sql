-- V50 - Correctif Encours client : création réelle de la table client_payments + droits Supabase

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.client_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NULL REFERENCES public.projects(id) ON DELETE SET NULL,
  revenue_id uuid NULL REFERENCES public.project_revenues(id) ON DELETE SET NULL,
  client text DEFAULT '',
  invoice_number text DEFAULT '',
  amount_ttc numeric(12,2) DEFAULT 0,
  payment_method text DEFAULT 'Virement bancaire',
  payment_date date DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.client_payments ADD COLUMN IF NOT EXISTS project_id uuid NULL REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.client_payments ADD COLUMN IF NOT EXISTS revenue_id uuid NULL REFERENCES public.project_revenues(id) ON DELETE SET NULL;
ALTER TABLE public.client_payments ADD COLUMN IF NOT EXISTS client text DEFAULT '';
ALTER TABLE public.client_payments ADD COLUMN IF NOT EXISTS invoice_number text DEFAULT '';
ALTER TABLE public.client_payments ADD COLUMN IF NOT EXISTS amount_ttc numeric(12,2) DEFAULT 0;
ALTER TABLE public.client_payments ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'Virement bancaire';
ALTER TABLE public.client_payments ADD COLUMN IF NOT EXISTS payment_date date DEFAULT CURRENT_DATE;
ALTER TABLE public.client_payments ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
ALTER TABLE public.client_payments ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.client_payments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_payments_select" ON public.client_payments;
DROP POLICY IF EXISTS "client_payments_insert" ON public.client_payments;
DROP POLICY IF EXISTS "client_payments_update" ON public.client_payments;
DROP POLICY IF EXISTS "client_payments_delete" ON public.client_payments;

CREATE POLICY "client_payments_select" ON public.client_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "client_payments_insert" ON public.client_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "client_payments_update" ON public.client_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "client_payments_delete" ON public.client_payments FOR DELETE TO authenticated USING (true);

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_revenues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;

CREATE INDEX IF NOT EXISTS idx_client_payments_project_id ON public.client_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_revenue_id ON public.client_payments(revenue_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_payment_date ON public.client_payments(payment_date);
