BEGIN;
CREATE TABLE IF NOT EXISTS public.asb_credential_vault (
 user_id uuid PRIMARY KEY REFERENCES public.asb_access(user_id) ON DELETE CASCADE,
 ciphertext text NOT NULL
);
ALTER TABLE public.asb_credential_vault ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.asb_credential_vault FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asb_credential_vault TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT ON public.employees TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asb_access TO service_role;
COMMIT;
