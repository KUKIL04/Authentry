import { adminApiClient } from './client';

export const SuperAdminAPI = {
  
  // ==========================================
  // 1. GLOBAL SOFTWARE SUITES (APPS)
  // ==========================================
  Apps: {
    list: async () => {
      const response = await adminApiClient.get('/platform/apps');
      return response.data;
    },
    register: async (data: { name: string; description?: string; productionUrl: string }) => {
      const response = await adminApiClient.post('/platform/apps', data);
      return response.data;
    },
    getCredentials: async (appId: string) => {
      const response = await adminApiClient.get(`/platform/apps/${appId}/credentials`);
      return response.data;
    },
    rotateCredentials: async (appId: string) => {
      const response = await adminApiClient.post(`/platform/apps/${appId}/credentials/rotate`);
      return response.data;
    },
    registerWebhook: async (data: { appId: string; url: string; events?: string[] }) => {
      const response = await adminApiClient.post('/platform/apps/webhooks', data);
      return response.data;
    },
    getWebhooks: async (appId: string) => {
      const response = await adminApiClient.get(`/platform/apps/${appId}/webhooks`);
      return response.data;
    },
    deleteWebhook: async (webhookId: string) => {
      const response = await adminApiClient.delete(`/platform/apps/webhooks/${webhookId}`);
      return response.data;
    }
  },

  // ==========================================
  // 2. APP FEATURES (GRANULAR MODULES)
  // ==========================================
  Modules: {
    listByApp: async (appId: string) => {
      const response = await adminApiClient.get(`/platform/apps/${appId}/modules`);
      return response.data;
    },
    create: async (appId: string, data: { name: string; description?: string }) => {
      const response = await adminApiClient.post(`/platform/apps/${appId}/modules`, data);
      return response.data;
    }
  },

  // ==========================================
  // 3. APP ROLE TEMPLATES
  // ==========================================
  RoleTemplates: {
    list: async () => {
      const response = await adminApiClient.get('/platform/role-templates');
      return response.data;
    },
    create: async (data: { name: string; description?: string; bundles: any[] }) => {
      const response = await adminApiClient.post('/platform/role-templates', data);
      return response.data;
    },
    update: async (roleId: string, data: { name: string; description?: string; bundles: any[] }) => {
      const response = await adminApiClient.put(`/platform/role-templates/${roleId}`, data);
      return response.data;
    },
    delete: async (roleId: string) => {
      const response = await adminApiClient.delete(`/platform/role-templates/${roleId}`);
      return response.data;
    }
  },

  // ==========================================
  // 4. TENANT MANAGEMENT & LICENSING
  // ==========================================
  Tenants: {
    list: async () => {
      const response = await adminApiClient.get('/platform/tenants');
      return response.data;
    },
    get: async (tenantId: string) => {
      const response = await adminApiClient.get(`/platform/tenants/${tenantId}`);
      return response.data;
    },
    updateStatus: async (tenantId: string, status: 'ACTIVE' | 'FROZEN') => {
      const response = await adminApiClient.put(`/platform/tenants/${tenantId}/status`, { status });
      return response.data;
    },
    // The Entitlement Matrix Allocations
    allocateApp: async (tenantId: string, appId: string) => {
      const response = await adminApiClient.post('/platform/allocations', { tenantId, appId });
      return response.data;
    },
    revokeApp: async (tenantId: string, appId: string) => {
      const response = await adminApiClient.delete(`/platform/tenants/${tenantId}/allocations/${appId}`);
      return response.data;
    }
  },

  // ==========================================
  // 5. PLATFORM BILLING & ENTITLEMENTS
  // ==========================================
  Billing: {
    getFeatureMatrix: async () => {
      const response = await adminApiClient.get('/platform/features'); 
      return response.data;
    },
    createPlan: async (data: { code: string; name: string; monthlyPriceUsd: number; maxMau: number | null; maxApiRequests: number | null; tierRank: number }) => {
      const response = await adminApiClient.post('/platform/plans', data);
      return response.data;
    },
    updatePlan: async (planCode: string, data: { monthlyPriceUsd: number; maxMau: number | null; maxApiRequests: number | null }) => {
      const response = await adminApiClient.put(`/platform/plans/${planCode}`, data);
      return response.data;
    },
    updateFeatureFlag: async (featureKey: string, minPlanCode: string) => {
      const response = await adminApiClient.put(`/platform/features/${featureKey}`, { minPlanCode });
      return response.data;
    }
  },

  // ==========================================
  // 6. GLOBAL SGC SYNC & INFRASTRUCTURE
  // ==========================================
  Infrastructure: {
    getSyncStatus: async () => {
      const response = await adminApiClient.get('/platform/sync/status');
      return response.data;
    },
    triggerGlobalSGC: async () => {
      const response = await adminApiClient.post('/platform/sync/trigger');
      return response.data;
    }
  },

  // ==========================================
  // 7. GLOBAL IDENTITIES
  // ==========================================
  Users: {
    list: async () => {
      const response = await adminApiClient.get('/platform/users');
      return response.data;
    },
    blacklist: async (userId: string, isBlacklisted: boolean) => {
      const response = await adminApiClient.put(`/platform/users/${userId}/blacklist`, { isBlacklisted });
      return response.data;
    }
  },

  // ==========================================
  // 8. TELEMETRY & AUDITS
  // ==========================================
  Telemetry: {
    getStats: async () => {
      const response = await adminApiClient.get('/platform/stats');
      return response.data;
    },
    getSystemLogs: async () => {
      const response = await adminApiClient.get('/platform/telemetry');
      return response.data;
    },
    flushBuffer: async () => {
      const response = await adminApiClient.post('/platform/telemetry/flush');
      return response.data;
    },
    getAuditLogs: async () => {
      const response = await adminApiClient.get('/platform/audits');
      return response.data;
    }
  }
};