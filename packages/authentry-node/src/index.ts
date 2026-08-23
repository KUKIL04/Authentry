import { HttpClient } from './httpClient.js';
import { AuthModule } from './modules/auth.js';
import { DirectoryModule } from './modules/directory.js';
import { WebhookModule } from './modules/webhooks.js';

export interface AuthEntryConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  webhookSecret?: string;
}

export class AuthEntry {
  private http: HttpClient;
  public auth: AuthModule;
  public directory: DirectoryModule;
  public webhooks?: WebhookModule

  constructor(config: AuthEntryConfig) {
    if (!config.clientId || !config.clientSecret) {
      throw new Error("AuthEntry Initialization Error: Missing M2M Credentials.");
    }

    const apiUrl = config.baseUrl || 'http://localhost:3000/api/v1'; // Default to local for dev
    const issuerUrl = apiUrl.replace('/api/v1', ''); // Used for JWKS discovery
    
    this.http = new HttpClient(config.clientId, config.clientSecret, apiUrl);
    
    // Initialize Namespaces
    this.auth = new AuthModule(this.http, issuerUrl);
    this.directory = new DirectoryModule(this.http);

    // Initialize webhooks only if they pass the secret
    if (config.webhookSecret) {
      this.webhooks = new WebhookModule(config.webhookSecret);
    }
  }
}