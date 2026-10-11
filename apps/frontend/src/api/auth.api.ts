import { publicClient, apiClient } from './client';

export const AuthAPI = {
  // Initial authentication
  login: async (email: string, password: string, redirectUri?: string, targetTenantId?: string, clientId?: string) => {
    const response = await publicClient.post('/auth/login', { 
      email, 
      password, 
      redirectUri, 
      targetTenantId, 
      clientId 
    });
    return response.data;
  },

  // Workspace resolution (if user belongs to multiple)
  selectWorkspace: async (tempToken: string, tenantId: string, redirectUri?: string, clientId?: string) => {
    const response = await publicClient.post('/auth/select-workspace', { 
      tempToken, 
      tenantId, 
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
  
  changePassword: async (povToken: string, newPassword: string) => {
    // We are using apiClient here to automatically attach the Bearer token!
    const response = await apiClient.post('/auth/change-password', { povToken, newPassword });
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

  refreshToken: async () => {
    const response = await publicClient.post('/auth/refresh');
    return response.data;
  },

  requestLaunchCode: async (appName: string) => {
    const response = await apiClient.post('/auth/launch-token', { appName });
    return response.data;
  },

  logout: async (endpoint?: string) => {
    const response = await publicClient.post('/auth/logout', { endpoint });
    return response.data;
  },

  // --- NUMBER-MATCH MFA METHODS ---
  getMfaStatus: async (attemptId: string) => {
    const response = await publicClient.get(`/auth/mfa/status/${attemptId}`);
    return response.data;
  },

  getActiveMfaChallenge: async () => {
    const response = await apiClient.get('/auth/mfa/active');
    return response.data;
  },

  resolveMfaChallenge: async (attemptId: string, selectedCode?: string, decision: 'NUMBER_PICK' | 'DENY' = 'NUMBER_PICK') => {
    const response = await apiClient.post('/auth/mfa/resolve', { attemptId, selectedCode, decision });
    return response.data;
  },

  resendMfaPush: async (attemptId: string) => {
    const response = await publicClient.post('/auth/mfa/resend-push', { attemptId });
    return response.data;
  },

  sendMfaEmailFallback: async (attemptId: string) => {
    const response = await publicClient.post('/auth/mfa/email-fallback/send', { attemptId });
    return response.data;
  },

  verifyMfaEmailFallback: async (attemptId: string, otp: string) => {
    const response = await publicClient.post('/auth/mfa/email-fallback/verify', { attemptId, otp });
    return response.data;
  },
};