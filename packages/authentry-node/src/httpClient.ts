import axios, { AxiosInstance } from 'axios';

export class HttpClient {
  public client: AxiosInstance;

  constructor(clientId: string, clientSecret: string, baseUrl: string) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'Content-Type': 'application/json',
      },
    });
  }
}