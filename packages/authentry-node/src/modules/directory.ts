import { HttpClient } from '../httpClient.js';

export class DirectoryModule {
  constructor(private http: HttpClient) {}

  // Instantly lock out an employee from the client application
  async suspendUser(userId: string, targetTenantId: string) {
    const response = await this.http.client.put(`/s2s/directory/users/${userId}/suspend`, {
      tenantId: targetTenantId
  });
    return response.data;
  }

  /**
   * Fetch complete user profile and assigned RBAC modules/roles via S2S API
   */
  async getUser(userId: string, targetTenantId: string) {
    const response = await this.http.client.get(`/s2s/directory/users/${userId}`, {
      params: { tenantId: targetTenantId }
    });
    return response.data.user;
  }

  // --- SGC Sync (State Generation & Consolidation) ---
  
  /**
   * Emergency Manual Override: Forces the auth service to push the absolute latest
   * state of a user to your registered webhook, bypassing any dead-letter queues.
   */
  async syncUser(userId: string, targetTenantId: string) {
    const response = await this.http.client.post(`/s2s/directory/users/${userId}/sync`, {
      tenantId: targetTenantId
    });    
    return response.data;
  }
}