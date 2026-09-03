import { apiClient } from './client';

export const AdminAPI = {
  // Generate a secure invite link for a new employee
  inviteUser: async (email: string, expireHours: number = 24, employeeId?: string) => {
    const response = await apiClient.post('/admin/invite', { email, expireHours, employeeId });
    return response.data;
  },

  // Fetch active, unused invitation links
  getPendingInvitations: async () => {
    const response = await apiClient.get('/admin/invitations');
    return response.data;
  },

  // Manually revoke an active invitation link
  revokeInvitation: async (inviteId: string) => {
    const response = await apiClient.delete(`/admin/invitations/${inviteId}`);
    return response.data;
  },

  // Unlock a user from the Waiting Room and assign them modules
  grantAccess: async (targetUserId: string, moduleIds: string[] = [], roleIds: string[] = []) => {
    const response = await apiClient.post('/admin/grant-access', { targetUserId, moduleIds, roleIds });
    return response.data;
  },

  updateEmployeeId: async (userId: string, employeeId: string) => {
    const response = await apiClient.put(`/admin/users/${userId}/employee-id`, { employeeId });
    return response.data;
  },

  getApps: async () => {
    const response = await apiClient.get('/admin/apps');
    return response.data;
  },

  getUsers: async () => {
    const response = await apiClient.get('/admin/users');
    return response.data;
  },

  updateUserStatus: async (userId: string, status: 'ACTIVE' | 'SUSPENDED') => {
    const response = await apiClient.put(`/admin/users/${userId}/status`, { status });
    return response.data;
  },

  getAuditLogs: async () => {
    const response = await apiClient.get('/admin/audits');
    return response.data;
  },

  getRoles: async () => {
    const response = await apiClient.get('/admin/roles');
    return response.data;
  },

  createRole: async (data: { name: string; description: string; bundles: { moduleId: string; accessLevel: string }[] }) => {
    const response = await apiClient.post('/admin/roles', data);
    return response.data;
  },

  updateRole: async (roleId: string, data: { name: string; description: string; bundles: { moduleId: string; accessLevel: string }[] }) => {
    const response = await apiClient.put(`/admin/roles/${roleId}`, data);
    return response.data;
  },

  deleteRole: async (roleId: string) => {
    const response = await apiClient.delete(`/admin/roles/${roleId}`);
    return response.data;
  },

  getPermissions: async () => {
    const response = await apiClient.get('/admin/permissions');
    return response.data;
  },

  // Fetch all users who have access to a specific module
  getModuleUsers: async (moduleId: string) => {
    const response = await apiClient.get(`/admin/modules/${moduleId}/users`);
    return response.data;
  },
  
  // Revoke a specific user's access to a specific module
  revokeModuleAccess: async (userId: string, moduleId: string) => {
    const response = await apiClient.delete(`/admin/users/${userId}/modules/${moduleId}`);
    return response.data;
  },

  getActiveSessions: async () => {
    const response = await apiClient.get('/admin/sessions');
    return response.data;
  },
  
  revokeSession: async (tokenId: string) => {
    const response = await apiClient.delete(`/admin/sessions/${tokenId}`);
    return response.data;
  },

  triggerPasswordReset: async (userId: string) => {
    const response = await apiClient.post(`/admin/users/${userId}/reset-password`);
    return response.data;
  },

  clearSecurityLockout: async (userId: string) => {
    const response = await apiClient.post(`/admin/users/${userId}/clear-lockout`);
    return response.data;
  },

  getSettings: async () => {
    const response = await apiClient.get('/admin/settings');
    return response.data;
  },

  getOnboardingSchema: async () => {
    const response = await apiClient.get('/admin/settings/onboarding');
    return response.data;
  },

  updateOnboardingSchema: async (schema: any[], enforce: boolean) => {
    const response = await apiClient.put('/admin/settings/onboarding', { schema, enforce });
    return response.data;
  },
  
  updateSettings: async (data: { name: string; logoUrl: string; themeColor: string }) => {
    const response = await apiClient.put('/admin/settings', data);
    return response.data;
  },

  uploadLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);

    const response = await apiClient.post('/admin/settings/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // -- Module Access Map --
  grantBulkModuleAccess: async (moduleId: string, userIds: string[], accessLevel: 'READ' | 'WRITE' = 'READ') => {
    const response = await apiClient.post('/admin/modules/bulk-grant', { moduleId, userIds, accessLevel });
    return response.data;
  },
  
  updateModuleAccessLevel: async (moduleId: string, userId: string, accessLevel: 'READ' | 'WRITE') => {
    const response = await apiClient.put(`/admin/modules/${moduleId}/users/${userId}/access`, { accessLevel });
    return response.data;
  },

  // -- Role Assignments --
  getRoleUsers: async (roleId: string) => {
    const response = await apiClient.get(`/admin/roles/${roleId}/users`);
    return response.data;
  },

  grantBulkRoleAccess: async (roleId: string, userIds: string[]) => {
    const response = await apiClient.post('/admin/roles/bulk-grant', { roleId, userIds });
    return response.data;
  },

  revokeRoleAccess: async (userId: string, roleId: string) => {
    const response = await apiClient.delete(`/admin/users/${userId}/roles/${roleId}`);
    return response.data;
  },

  // -- Billing & Subscriptions --
  getBillingStatus: async () => {
    const response = await apiClient.get('/admin/billing/status');
    return response.data;
  },

  getAvailablePlans: async () => {
    const response = await apiClient.get('/admin/billing/plans');
    return response.data;
  },

  upgradePlan: async (planCode: string) => {
    // This serves as the mock checkout endpoint
    const response = await apiClient.post('/admin/billing/upgrade', { planCode });
    return response.data;
  },

  bulkImportUsers: async (users: { email: string; firstName?: string; lastName?: string; customProfileData?: any; employeeId?: string; roleIds?: string[] }[]) => {
    const response = await apiClient.post('/admin/users/bulk-import', { users });
    return response.data;
  },

  syncUser: async (userId: string) => {
    const response = await apiClient.post(`/admin/users/${userId}/sync`);
    return response.data;
  },

  syncWorkspace: async () => {
    const response = await apiClient.post('/admin/sync-workspace');
    return response.data;
  },
};