import { apiClient } from './client';

export const TenantAPI = {
  registerTenant: async (tenantData: any) => {
    const response = await apiClient.post('/tenant/register', tenantData);
    return response.data;
  },

  uploadOnboardingLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);

    const response = await apiClient.post('/tenant/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};