-- V49 - Gestion : encours client, paiements partiels liés aux factures et accès facture active uniquement

-- Permet de lier un règlement / acompte à une facture client de chantier
ALTER TABLE public.client_payments
ADD COLUMN IF NOT EXISTS revenue_id uuid NULL REFERENCES public.project_revenues(id) ON DELETE SET NULL;

-- Sécurisation des droits déjà utilisés par Gestion
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_revenues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
