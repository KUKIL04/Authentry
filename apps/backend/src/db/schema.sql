-- ==========================================
-- ENTERPRISE IDP DATABASE SCHEMA (Consolidated & Modernized)
-- Features: Global Identity, Tenant Isolation, Tiered Apps & Modules, RBAC Overrides
-- ==========================================

-- Enable UUID generation support in PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ENUMS & DOMAIN TYPES
-- ==========================================
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('UNVERIFIED', 'PENDING', 'ACTIVE', 'SUSPENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invite_status AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tenant_status AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'FROZEN', 'DELETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- 2. ENTITLEMENT ENGINE
-- ==========================================
CREATE TABLE IF NOT EXISTS plan_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,       
  monthly_price_usd NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
  max_mau INT,
  max_api_requests BIGINT,
  tier_rank INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  min_plan_code VARCHAR(50) NOT NULL REFERENCES plan_definitions(code) ON UPDATE CASCADE,
  is_globally_enabled BOOLEAN DEFAULT TRUE NOT NULL, 
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ==========================================
-- 3. CORE PLATFORM ARCHITECTURE
-- ==========================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status tenant_status DEFAULT 'ACTIVE' NOT NULL, 
  company_name VARCHAR(255) NOT NULL,
  logo_url TEXT,                      
  theme_color VARCHAR(50) DEFAULT '#000000',
  
  -- Compliance & Identity
  legal_name VARCHAR(255),
  tax_id VARCHAR(100),
  registration_number VARCHAR(100),
  industry VARCHAR(100),
  org_size VARCHAR(50),
  
  -- Address Info
  address_street TEXT,
  address_city VARCHAR(100),
  address_state VARCHAR(100),
  address_pincode VARCHAR(20),

  -- Profile Config
  onboarding_schema JSONB DEFAULT '[]'::jsonb,
  enforce_profile_completion BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Global Uniqueness Coordinates
  email VARCHAR(255) NOT NULL UNIQUE,
  mobile_no VARCHAR(20) NOT NULL UNIQUE,
  
  -- Name Split
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  country_code VARCHAR(10) NOT NULL DEFAULT '91',
  
  password_hash TEXT NOT NULL, 

  -- Global Platform Flags
  is_superadmin BOOLEAN DEFAULT FALSE NOT NULL,
  is_blacklisted BOOLEAN DEFAULT FALSE NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_memberships (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status user_status DEFAULT 'UNVERIFIED' NOT NULL,
  is_tenant_admin BOOLEAN DEFAULT FALSE NOT NULL,
  custom_profile_data JSONB DEFAULT '{}'::jsonb,
  employee_id VARCHAR(100),
  joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  PRIMARY KEY (user_id, tenant_id),
  UNIQUE (tenant_id, employee_id)
);

-- ==========================================
-- 4. METERING & BILLING ENGINE
-- ==========================================
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Billing Tier Information
  plan_code VARCHAR(50) REFERENCES plan_definitions(code) DEFAULT 'FREE_TIER',
  
  -- Subscription Management
  payment_provider VARCHAR(50) DEFAULT 'MOCK',
  external_customer_id VARCHAR(255),
  external_subscription_id VARCHAR(255),
  subscription_status VARCHAR(50) DEFAULT 'ACTIVE',
  auto_renew BOOLEAN DEFAULT TRUE,
  
  -- The current billing window
  current_cycle_start TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  current_cycle_end TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 month'),
  
  -- Live Metering Counters
  mau_count INT DEFAULT 0 NOT NULL,         
  api_request_count BIGINT DEFAULT 0 NOT NULL, 
  lifetime_api_calls BIGINT DEFAULT 0 NOT NULL,
  
  -- Configurable Quotas (Null means unlimited)
  max_mau INT DEFAULT 100, 
  max_api_requests BIGINT DEFAULT 10000,
  
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(tenant_id)
);

-- ==========================================
-- 5. TOKEN LIFECYCLE MANAGEMENT
-- ==========================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE, 
  is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE, 
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status invite_status DEFAULT 'PENDING' NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  custom_profile_data JSONB DEFAULT '{}'::jsonb,
  employee_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ==========================================
-- 6. SUITES (APPS) & FEATURES (MODULES)
-- ==========================================
CREATE TABLE IF NOT EXISTS apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  production_url TEXT NOT NULL,
  client_id VARCHAR(100) UNIQUE NOT NULL,
  client_secret_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, 
  description TEXT,
  UNIQUE(app_id, name)
);

CREATE TABLE IF NOT EXISTS tenant_app_allocations (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  allocated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  allocated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (tenant_id, app_id)
);

-- ==========================================
-- 7. TENANT-DEFINED ROLES & TEMPLATES
-- ==========================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, 
  name VARCHAR(255) NOT NULL, 
  description TEXT,
  is_system_template BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS role_modules (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  access_level VARCHAR(10) DEFAULT 'READ',
  PRIMARY KEY (role_id, module_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, tenant_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_module_overrides (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  access_level VARCHAR(10) DEFAULT 'READ',
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, tenant_id, module_id)
);

-- ==========================================
-- 8. PLATFORM SECURITY & AUDIT
-- ==========================================
CREATE TABLE IF NOT EXISTS platform_ip_bans (
  ip_address VARCHAR(45) PRIMARY KEY, 
  reason TEXT NOT NULL,               
  banned_by UUID REFERENCES users(id) ON DELETE SET NULL, 
  expires_at TIMESTAMPTZ,             
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,     
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, 
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS superadmin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL, 
  target_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL, 
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,     
  action VARCHAR(100) NOT NULL, 
  ip_address VARCHAR(45),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ==========================================
-- 9. WEBHOOK & EVENT DELIVERY ENGINE
-- ==========================================
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  signing_secret VARCHAR(255) NOT NULL, 
  subscribed_events JSONB NOT NULL DEFAULT '[]'::jsonb, 
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' NOT NULL, 
  http_status_code INT,
  attempts INT DEFAULT 0 NOT NULL,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    device_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 10. TRIGGERS & FUNCTIONS
-- ==========================================
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

DROP TRIGGER IF EXISTS trigger_cleanup_revoked_app ON public.tenant_app_allocations;

CREATE TRIGGER trigger_cleanup_revoked_app
AFTER DELETE ON public.tenant_app_allocations
FOR EACH ROW
EXECUTE FUNCTION cleanup_revoked_app_permissions();

-- ==========================================
-- 11. OPTIMIZATION INDEXES
-- ==========================================
-- Workspace & Relational Lookups
CREATE INDEX IF NOT EXISTS idx_workspace_memberships_tenant ON workspace_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id);

-- Tokens & Auth
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_invitations_hash ON invitations(token_hash);

-- Webhook Dispatching 
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_app ON webhook_endpoints USING btree (app_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_delivery_logs(status, next_retry_at);

-- Security Flags
CREATE INDEX IF NOT EXISTS idx_users_superadmin ON users(is_superadmin) WHERE is_superadmin = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_blacklisted ON users(is_blacklisted) WHERE is_blacklisted = TRUE;

-- Push Notifications
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

-- ==========================================
-- 12. SEED DEFAULT PLANS & FEATURE FLAGS
-- ==========================================
INSERT INTO plan_definitions (code, name, monthly_price_usd, max_mau, max_api_requests, tier_rank)
VALUES 
  ('FREE_TIER', 'Free Workspace', 0.00, 100, 1000, 0),
  ('PREMIUM_TIER', 'Premium Workspace', 49.00, 1000, 10000, 10),
  ('ENTERPRISE', 'Enterprise Workspace', 199.00, NULL, NULL, 20)
ON CONFLICT (code) DO NOTHING;

INSERT INTO feature_flags (feature_key, description, min_plan_code)
VALUES 
  ('unlimitedMau', 'Unlimited Active Users', 'PREMIUM_TIER'),
  ('unlimitedApi', 'Unlimited API Calls', 'PREMIUM_TIER'),
  ('customTheme', 'White-label Custom Branding', 'PREMIUM_TIER'),
  ('advancedRbac', 'Custom RBAC Engine', 'PREMIUM_TIER')
ON CONFLICT (feature_key) DO NOTHING;