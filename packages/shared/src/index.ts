// packages/shared/src/index.ts

// 1. Core Enums (Must match schema.sql exactly)
export type UserStatus = 'UNVERIFIED' | 'PENDING' | 'ACTIVE' | 'SUSPENDED';
export type TenantStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'FROZEN' | 'DELETED';
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED';

export type PlanTier = 'FREE_TIER' | 'PREMIUM_TIER';

// 2. Branding & UI
export interface TenantBranding {
  companyName: string;
  logoUrl: string | null;
  themeColor: string;
}

// 3. Subscription Tier Configuration Specs
export interface TierLimits {
  maxMau: number;
  maxApiRequests: number;
  customDomainAllowed: boolean;
  customRolesAllowed: boolean;
  auditRetentionDays: number;
}

export const TIER_CONFIG: Record<PlanTier, TierLimits> = {
  FREE_TIER: {
    maxMau: 100,
    maxApiRequests: 10000,
    customDomainAllowed: false,
    customRolesAllowed: false, // Standard Admin & Member only
    auditRetentionDays: 7,
  },
  PREMIUM_TIER: {
    maxMau: 10000,
    maxApiRequests: 1000000,
    customDomainAllowed: true,
    customRolesAllowed: true, // Allows defining custom roles & permissions
    auditRetentionDays: 90,
  },
};

// 4. Standardized RBAC Matrix
export const SYSTEM_ROLES = {
  TENANT_ADMIN: 'Tenant Admin',
  TENANT_MEMBER: 'Tenant Member',
} as const;

export const DEFAULT_ADMIN_PERMISSIONS = [
  'tenant:read',
  'tenant:write',
  'users:manage',
  'keys:manage',
  'audit:read',
];

export const DEFAULT_MEMBER_PERMISSIONS = [
  'modules:read',
  'profile:manage',
];

// 5. Global Identity Models
export interface UserIdentitySummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSuperAdmin: boolean;
  isBlacklisted: boolean;
  workspaceCount: number;
  totalApiCallsMade: number;
}