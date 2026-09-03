// Import all domain functions
import * as TenantQueries from './queries/tenant.queries.js';
import * as UserQueries from './queries/user.queries.js';
import * as AuthQueries from './queries/auth.queries.js';
import * as AppQueries from './queries/app.queries.js';
import * as RbacQueries from './queries/rbac.queries.js';
import * as AuditQueries from './queries/audit.queries.js';
import * as WebhookQueries from './queries/webhook.queries.js';
import * as SuperadminQueries from './queries/superadmin.queries.js';
import * as EntitlementQueries from './queries/entitlement.queries.js';

export class QueryService {
  // ==========================================
  // TENANTS
  // ==========================================
  static createTenant = TenantQueries.createTenant;
  static getTenantById = TenantQueries.getTenantById;
  static getTenantsByEmail = TenantQueries.getTenantsByEmail;
  static getTenantsByUserId = TenantQueries.getTenantsByUserId;
  static getTenantAdmins = TenantQueries.getTenantAdmins;
  static getTenantAppsWithModules = TenantQueries.getTenantAppsWithModules;
  static updateTenantBranding = TenantQueries.updateTenantBranding;
  static getTenantOnboardingContext = TenantQueries.getTenantOnboardingContext;
  static updateTenantOnboardingSchema = TenantQueries.updateTenantOnboardingSchema;
  static getTenantSettings = TenantQueries.getTenantSettings;
  static updateTenantSettings = TenantQueries.updateTenantSettings;
  static listTenantsDetailed = TenantQueries.listTenantsDetailed;
  static getTenantByIdDetailed = TenantQueries.getTenantByIdDetailed;
  static updateTenantStatusOnly = TenantQueries.updateTenantStatusOnly;
  static revokeAllTenantTokens = TenantQueries.revokeAllTenantTokens;

  // ==========================================
  // USERS
  // ==========================================
  static createUser = UserQueries.createUser;
  static getUserProfileData = UserQueries.getUserProfileData;
  static updateUserProfileData = UserQueries.updateUserProfileData;
  static updateUserPlatformDetails = UserQueries.updateUserPlatformDetails;
  static getUsersByTenant = UserQueries.getUsersByTenant;
  static getUserByEmailAndTenant = UserQueries.getUserByEmailAndTenant;
  static getUserByIdAndTenant = UserQueries.getUserByIdAndTenant;
  static updateUserStatus = UserQueries.updateUserStatus;
  static getGlobalUserByEmail = UserQueries.getGlobalUserByEmail;
  static getWorkspaceMembership = UserQueries.getWorkspaceMembership;
  static addWorkspaceMembership = UserQueries.addWorkspaceMembership;
  static updateEmployeeId = UserQueries.updateEmployeeId;
  static listGlobalUsers = UserQueries.listGlobalUsers;
  static getUserEmailById = UserQueries.getUserEmailById;

  // ==========================================
  // AUTHENTICATION & TOKENS
  // ==========================================
  static getRefreshTokenAbsolute = AuthQueries.getRefreshTokenAbsolute;
  static getUserPasswordHashById = AuthQueries.getUserPasswordHashById;
  static saveRefreshToken = AuthQueries.saveRefreshToken;
  static getRefreshToken = AuthQueries.getRefreshToken;
  static revokeRefreshToken = AuthQueries.revokeRefreshToken;
  static cleanupExpiredTokens = AuthQueries.cleanupExpiredTokens;
  static createInvitation = AuthQueries.createInvitation;
  static getInvitationByHash = AuthQueries.getInvitationByHash;
  static getPendingInvitationsByTenant = AuthQueries.getPendingInvitationsByTenant;
  static updateInvitationStatus = AuthQueries.updateInvitationStatus;
  static deleteInvitation = AuthQueries.deleteInvitation;
  static revokeAllUserTokensInWorkspace = AuthQueries.revokeAllUserTokensInWorkspace;
  static getActiveSessions = AuthQueries.getActiveSessions;
  static revokeSession = AuthQueries.revokeSession;
  static updateUserPassword = AuthQueries.updateUserPassword;
  static revokeAllUserTokensGlobally = AuthQueries.revokeAllUserTokensGlobally;
  static getGlobalUserById = AuthQueries.getGlobalUserById;
  static getUserByEmailForAuth = AuthQueries.getUserByEmailForAuth;

  // ==========================================
  // MODULES & ALLOCATIONS
  // ==========================================
  static createApp = AppQueries.createApp;
  static getAppByName = AppQueries.getAppByName;
  static getAllApps = AppQueries.getAllApps;
  static createAppModule = AppQueries.createAppModule;
  static getModulesByApp = AppQueries.getModulesByApp;
  static allocateAppToTenant = AppQueries.allocateAppToTenant;
  static verifyAppAllocation = AppQueries.verifyAppAllocation;
  static revokeAppFromTenant = AppQueries.revokeAppFromTenant;
  static getAppsByTenant = AppQueries.getAppsByTenant;
  static assignUserModuleOverride = AppQueries.assignUserModuleOverride;
  static getModuleUsers = AppQueries.getModuleUsers;
  static removeUserModuleOverride = AppQueries.removeUserModuleOverride;
  static rotateAppCredentials = AppQueries.rotateAppCredentials;
  static getAppCredentials = AppQueries.getAppCredentials;
  static getAllocatedTenantsForClient = AppQueries.getAllocatedTenantsForClient;
  // ==========================================
  // RBAC & CONTEXT
  // ==========================================
  static createRole = RbacQueries.createRole;
  static getRolesByTenant = RbacQueries.getRolesByTenant;
  static updateRole = RbacQueries.updateRole;
  static  clearRoleBundles = RbacQueries.clearRoleBundles;
  static deleteRole = RbacQueries.deleteRole;
  static cloneSystemRolesToTenant = RbacQueries.cloneSystemRolesToTenant;
  static bundleRoleModule = RbacQueries.bundleRoleModule;
  static assignUserRole = RbacQueries.assignUserRole;
  static assignBulkUserRoles = RbacQueries.assignBulkUserRoles;
  static revokeUserRole = RbacQueries.revokeUserRole;
  static getRoleUsers = RbacQueries.getRoleUsers;
  static getUserAccessContext = RbacQueries.getUserAccessContext;
  static getSystemRoleTemplates = RbacQueries.getSystemRoleTemplates;
  static updateSystemRoleTemplate = RbacQueries.updateSystemRoleTemplate;
  static deleteSystemRoleTemplate = RbacQueries.deleteSystemRoleTemplate;

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  static logEvent = AuditQueries.logEvent;
  static getAuditLogs = AuditQueries.getAuditLogs;
  static getAuditLogsSince = AuditQueries.getAuditLogsSince;

  // ==========================================
  // WEBHOOKS
  // ==========================================
  static createAppWebhook = WebhookQueries.createAppWebhook;
  static getActiveWebhooksForTenantEvent = WebhookQueries.getActiveWebhooksForTenantEvent;
  static createDeliveryLog = WebhookQueries.createDeliveryLog;
  static getWebhookEndpointCredentials = WebhookQueries.getWebhookEndpointCredentials;
  static updateDeliveryLogSuccess = WebhookQueries.updateDeliveryLogSuccess;
  static updateDeliveryLogFailure = WebhookQueries.updateDeliveryLogFailure;
  static getWebhooksByApp = WebhookQueries.getWebhooksByApp;
  static deleteWebhookEndpoint = WebhookQueries.deleteWebhookEndpoint;
  static getGlobalWebhookFailures = WebhookQueries.getGlobalWebhookFailures;
  static getGlobalUnsyncedUsers = WebhookQueries.getGlobalUnsyncedUsers;
  static getGlobalFailedWebhookDeliveries = WebhookQueries.getGlobalFailedWebhookDeliveries;
  static resetDeliveryLog = WebhookQueries.resetDeliveryLog;
  static pruneWebhookLedger = WebhookQueries.pruneWebhookLedger;
  static flushDeadLetterQueue = WebhookQueries.flushDeadLetterQueue;
  static getEndpointsBySubscription = WebhookQueries.getEndpointsBySubscription;
  static getAllActiveWorkspaceMemberships = WebhookQueries.getAllActiveWorkspaceMemberships;
  
  // ==========================================
  // SUPERADMIN
  // ==========================================
  static getPlatformStats = SuperadminQueries.getPlatformStats;
  static getSuperAdminAuditLogs = SuperadminQueries.getSuperAdminAuditLogs;
  static logSuperAdminEvent = SuperadminQueries.logSuperAdminEvent;

  // ==========================================
  // ENTITLEMENTS & BILLING
  // ==========================================
  static checkTenantEntitlement = EntitlementQueries.checkTenantEntitlement;
  static getTenantMauQuota = EntitlementQueries.getTenantMauQuota;
  static getTenantApiQuota = EntitlementQueries.getTenantApiQuota;
}