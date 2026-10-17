-- Run this migration against the intended Supabase project before deploying the code.
-- It revokes the published demo credential and stores only digests of organization keys.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS api_key_hash text;

-- Revoke the previously published demo credential by its digest without repeating it here.
UPDATE public.organizations
SET api_key = NULL, api_key_hash = NULL
WHERE api_key_hash = '4e90e7aa275dfba6395c58feeaeea37aefe130d7c91b0365459b7ce3b2919b8d'
   OR (api_key IS NOT NULL AND encode(extensions.digest(api_key, 'sha256'), 'hex') = '4e90e7aa275dfba6395c58feeaeea37aefe130d7c91b0365459b7ce3b2919b8d');

UPDATE public.organizations
SET api_key_hash = encode(extensions.digest(api_key, 'sha256'), 'hex')
WHERE api_key IS NOT NULL AND api_key_hash IS NULL;

ALTER TABLE public.organizations
  ALTER COLUMN api_key DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_api_key_hash_uidx
  ON public.organizations (api_key_hash)
  WHERE api_key_hash IS NOT NULL;

ALTER TABLE public.audit_reports
  ADD COLUMN IF NOT EXISTS certificate_payload jsonb,
  ADD COLUMN IF NOT EXISTS review_items jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.audit_reports
  ALTER COLUMN compliance_score DROP NOT NULL;

-- Deny direct browser-role access. Backend access requires a server-only service key.
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_consignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hs_classifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.organizations FROM anon, authenticated;
REVOKE ALL ON TABLE public.trade_consignments FROM anon, authenticated;
REVOKE ALL ON TABLE public.audit_reports FROM anon, authenticated;
REVOKE ALL ON TABLE public.document_vault FROM anon, authenticated;
REVOKE ALL ON TABLE public.hs_classifications FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organizations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.trade_consignments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.audit_reports TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.document_vault TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.hs_classifications TO service_role;
