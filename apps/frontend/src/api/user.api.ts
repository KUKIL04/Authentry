import { apiClient } from './client';

export const UserAPI = {
  getProfile: async () => {
    const response = await apiClient.get('/user/me');
    return response.data;
  },
  getMyModules: async () => {
    const response = await apiClient.get('/user/modules');
    return response.data;
  },
  getOnboardingSchema: async () => {
    const response = await apiClient.get('/user/onboarding-schema');
    return response.data;
  },
  updatePlatformProfile: async (data: { firstName: string; middleName?: string; lastName: string; mobileNo?: string }) => {
    const response = await apiClient.put('/user/platform-profile', data);
    return response.data;
  },
  completeProfile: async (customProfileData: any) => {
    const response = await apiClient.post('/user/complete-profile', { customProfileData });
    return response.data; 
  }
};