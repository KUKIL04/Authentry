import { publicClient, apiClient } from './client';

export const AuthAPI = {
  // Initial authentication
  login: async (email: string, password: string, redirectUri?: string, targetTenantId?: string, clientId?: string) => {
    const oldRefreshToken = localStorage.getItem('refreshToken') || undefined;
    const response = await publicClient.post('/auth/login', { email, password, redirectUri, targetTenantId, clientId, oldRefreshToken });
    return response.data;
  },

  // Workspace resolution (if user belongs to multiple)
  selectWorkspace: async (tempToken: string, tenantId: string, oldRefreshToken?: string, redirectUri?: string, clientId?: string) => {
    const response = await publicClient.post('/auth/select-workspace', { 
      tempToken, 
      tenantId, 
      oldRefreshToken,
      redirectUri,
      clientId
    });
    return response.data;
  },

  // Fetch workspaces for the authenticated user
  getAvailableWorkspaces: async () => {
    const response = await apiClient.get('/auth/workspaces');
    return response.data;
  },

  register: async (registrationData: any) => {
    const response = await publicClient.post('/auth/register', registrationData);
    return response.data;
  },

  sendOtp: async (target: string, type: 'EMAIL' | 'PHONE') => {
    const response = await publicClient.post('/otp/send', { target, type });
    return response.data;
  },

  verifyOtp: async (target: string, type: 'EMAIL' | 'PHONE', otp: string) => {
    const response = await publicClient.post('/otp/verify', { target, type, otp });
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await publicClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (email: string, otp: string, newPassword: string) => {
    // This endpoint will verify the OTP and update the user's password hash in Postgres
    const response = await publicClient.post('/auth/reset-password', { email, otp, newPassword });
    return response.data;
  },

  verifyCurrentPassword: async (currentPassword: string) => {
    const response = await apiClient.post('/auth/verify-password', { currentPassword });
    return response.data;
  },
  
  changePassword: async (currentPassword: string, newPassword: string) => {
    // We are using apiClient here to automatically attach the Bearer token!
    const response = await apiClient.post('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  },

  checkIdentity: async (email: string) => {
    const response = await publicClient.post('/auth/check-identity', { email });
    return response.data;
  },

  verifyInvite: async (token: string) => {
    const response = await publicClient.get(`/auth/invite/${token}`);
    return response.data;
  },
  
  getTenantBranding: async (tenantId: string) => {
    const response = await publicClient.get(`/auth/tenant/${tenantId}/branding`);
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await publicClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  requestLaunchCode: async (appName: string) => {
    const currentRefreshToken = localStorage.getItem('refreshToken') || undefined;
    const response = await apiClient.post('/auth/launch-token', { appName, currentRefreshToken });
    return response.data;
  },

  logout: async (refreshToken: string) => {
    const response = await publicClient.post('/auth/logout', { refreshToken });
    return response.data;
  },
};