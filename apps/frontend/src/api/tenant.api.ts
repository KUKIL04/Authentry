import { apiClient } from './client';

export const TenantAPI = {
  registerTenant: async (tenantData: any) => {
    const response = await apiClient.post('/tenant/register', tenantData);
    return response.data;
  },

  uploadOnboardingLogo: async (file: File, oldLogoUrl?: string) => {
    const formData = new FormData();
    formData.append('logo', file);

    if (oldLogoUrl) {
      formData.append('oldLogoUrl', oldLogoUrl);
    }
    
    const response = await apiClient.post('/tenant/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};