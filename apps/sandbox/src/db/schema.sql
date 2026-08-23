-- Sandbox Database: sandbox_audit_db (Port 5435)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------
-- 1. LOCAL IDENTITY PROJECTION (Multi-Tenant Aware)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS local_employees (
    id UUID NOT NULL,            -- IDP Global User UUID
    tenant_id UUID NOT NULL,     -- The Workspace/Tenant UUID
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL,    -- ACTIVE, SUSPENDED
    roles JSONB DEFAULT '[]'::jsonb NOT NULL,          -- Cache assigned global roles
    entitlements JSONB DEFAULT '{}'::jsonb NOT NULL,   -- Cache hierarchical entitlement matrix
    is_tenant_admin BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- ✅ A user can exist in multiple tenants, so the PK must be composite!
    PRIMARY KEY (id, tenant_id)
);

-- ----------------------------------------------------
-- 2. CLIENT AUDIT LEDGER (Multi-Tenant Aware)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS client_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    actor_id UUID,
    actor_email VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Composite Foreign Key linking to the specific tenant's employee record
    FOREIGN KEY (actor_id, tenant_id) REFERENCES local_employees(id, tenant_id) ON DELETE SET NULL
);

-- ----------------------------------------------------
-- 3. DOMAIN: PROCUREMENT MODULE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- ✅ SKUs/Emails are only unique PER tenant, not globally!
    UNIQUE (tenant_id, contact_email)
);

-- ----------------------------------------------------
-- 4. DOMAIN: WAREHOUSE MODULE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 0 NOT NULL,
    location VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE (tenant_id, sku)
);

-- ----------------------------------------------------
-- 5. DOMAIN: LOGISTICS MODULE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    tracking_number VARCHAR(100) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' NOT NULL, -- PENDING, IN_TRANSIT, DELIVERED
    handler_id UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE (tenant_id, tracking_number),
    FOREIGN KEY (handler_id, tenant_id) REFERENCES local_employees(id, tenant_id) ON DELETE SET NULL
);