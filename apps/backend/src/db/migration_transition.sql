BEGIN;

-- ==========================================
-- PHASE 1: PRUNING REDUNDANT SAAS INFRASTRUCTURE
-- ==========================================

-- 1. Drop API Keys (Replaced by Module M2M Credentials)
DROP TABLE IF EXISTS api_keys CASCADE;

-- 2. Drop Granular Permissions (Shifted to downstream ABAC / Standard Roles)
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;

-- 3. Strip Custom Domain from Tenants 
ALTER TABLE public.tenants 
DROP CONSTRAINT IF EXISTS tenants_custom_domain_key,
DROP COLUMN IF EXISTS custom_domain;


-- ==========================================
-- PHASE 2: ELEVATING MODULES TO GLOBAL ASSETS
-- ==========================================

-- Note: Truncating because old tenant-scoped modules cannot be mapped to global suites
TRUNCATE TABLE public.modules CASCADE;

ALTER TABLE public.modules 
DROP CONSTRAINT IF EXISTS modules_tenant_id_name_key,
DROP CONSTRAINT IF EXISTS modules_tenant_id_fkey,
DROP COLUMN IF EXISTS tenant_id;

-- Add strict OAuth & M2M connection parameters
ALTER TABLE public.modules 
ADD COLUMN production_url TEXT NOT NULL,
ADD COLUMN client_id VARCHAR(100) UNIQUE NOT NULL,
ADD COLUMN client_secret_hash TEXT NOT NULL,
ADD CONSTRAINT modules_name_key UNIQUE (name);


-- ==========================================
-- PHASE 3: THE ENTITLEMENT MATRIX (ALLOCATION)
-- ==========================================

CREATE TABLE public.tenant_module_allocations (
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    allocated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    allocated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (tenant_id, module_id)
);


-- ==========================================
-- PHASE 4: STANDARDIZING GLOBAL ROLES
-- ==========================================

TRUNCATE TABLE public.roles CASCADE;

ALTER TABLE public.roles 
DROP CONSTRAINT IF EXISTS roles_tenant_id_name_key,
DROP CONSTRAINT IF EXISTS roles_tenant_id_fkey,
DROP COLUMN IF EXISTS tenant_id;

ALTER TABLE public.roles 
ADD CONSTRAINT roles_name_key UNIQUE (name);


-- ==========================================
-- PHASE 5: RE-ROUTING SYSTEM WEBHOOKS
-- ==========================================

TRUNCATE TABLE public.webhook_endpoints CASCADE;

ALTER TABLE public.webhook_endpoints 
DROP CONSTRAINT IF EXISTS webhook_endpoints_tenant_id_fkey,
DROP COLUMN IF EXISTS tenant_id;

-- Webhooks are now explicitly owned by the 11 software modules
ALTER TABLE public.webhook_endpoints 
ADD COLUMN module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE;

-- Optimization index for the Event Dispatcher Service
DROP INDEX IF EXISTS idx_webhook_endpoints_tenant;
CREATE INDEX idx_webhook_endpoints_module ON public.webhook_endpoints USING btree (module_id);

COMMIT;