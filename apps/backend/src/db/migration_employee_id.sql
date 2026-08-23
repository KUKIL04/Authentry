-- 1. Add to the active memberships table
ALTER TABLE workspace_memberships ADD COLUMN employee_id VARCHAR(100);

-- 2. THE ENTERPRISE MAGIC: Prevent HR from duplicating IDs within their workspace
ALTER TABLE workspace_memberships ADD CONSTRAINT unique_tenant_employee_id UNIQUE (tenant_id, employee_id);

-- 3. Add to the invitations table (so HR can assign it before the user even registers)
ALTER TABLE invitations ADD COLUMN employee_id VARCHAR(100);