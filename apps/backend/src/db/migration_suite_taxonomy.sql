BEGIN;

-- ==========================================
-- PHASE 1: PURGE OLD STRUCTURE
-- ==========================================
-- We drop these so we can rebuild them with the correct App/Module split
DROP TABLE IF EXISTS webhook_endpoints CASCADE;
DROP TABLE IF EXISTS user_modules CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS tenant_module_allocations CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ==========================================
-- PHASE 2: SUITES (APPS) & FEATURES (MODULES)
-- ==========================================

-- 1. APPS: The 7 physical software suites (e.g., ERP, HRMS)
CREATE TABLE public.apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  production_url TEXT NOT NULL,
  client_id VARCHAR(100) UNIQUE NOT NULL,
  client_secret_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. MODULES: The granular sub-features inside an App (e.g., Payroll, Inventory)
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, 
  description TEXT,
  UNIQUE(app_id, name)
);

-- 3. THE ALLOCATION MATRIX: Licensing an App to a Company
CREATE TABLE public.tenant_app_allocations (
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  allocated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  allocated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (tenant_id, app_id)
);

-- ==========================================
-- PHASE 3: TENANT-DEFINED ROLES & TEMPLATES
-- ==========================================

-- 4. ROLES: Now owned by the Tenant (NULL = System Template)
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, 
  name VARCHAR(255) NOT NULL, 
  description TEXT,
  is_system_template BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(tenant_id, name) -- Ensures no duplicate role names within the same company
);

-- 5. ROLE BUNDLES: Defining what each role can actually do
CREATE TABLE public.role_modules (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  access_level VARCHAR(10) DEFAULT 'READ', -- 'READ' or 'WRITE'
  PRIMARY KEY (role_id, module_id)
);

-- 6. USER ROLES: Scoped to the workspace!
CREATE TABLE public.user_roles (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, tenant_id, role_id)
);

-- 7. USER OVERRIDES: Explicit grants beyond the standard role
CREATE TABLE public.user_module_overrides (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  access_level VARCHAR(10) DEFAULT 'READ',
  assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, tenant_id, module_id)
);

-- ==========================================
-- PHASE 4: WEBHOOKS (Tied to Apps)
-- ==========================================
CREATE TABLE public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  signing_secret VARCHAR(255) NOT NULL, 
  subscribed_events JSONB NOT NULL DEFAULT '[]'::jsonb, 
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_app ON public.webhook_endpoints USING btree (app_id);

-- ==========================================
-- PHASE 5: THE REVOCATION GARBAGE COLLECTOR
-- ==========================================
-- If SuperAdmin revokes an App from a Tenant, we must delete all custom role mappings 
-- and user overrides associated with that App to prevent ghost permissions.

CREATE OR REPLACE FUNCTION cleanup_revoked_app_permissions()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Delete overrides for this tenant and this specific app's modules
    DELETE FROM public.user_module_overrides umo
    USING public.modules m
    WHERE umo.module_id = m.id 
      AND umo.tenant_id = OLD.tenant_id 
      AND m.app_id = OLD.app_id;

    -- 2. Delete role mappings for this tenant and this specific app's modules
    DELETE FROM public.role_modules rm
    USING public.modules m, public.roles r
    WHERE rm.module_id = m.id 
      AND rm.role_id = r.id
      AND r.tenant_id = OLD.tenant_id 
      AND m.app_id = OLD.app_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_revoked_app
AFTER DELETE ON public.tenant_app_allocations
FOR EACH ROW
EXECUTE FUNCTION cleanup_revoked_app_permissions();

COMMIT;