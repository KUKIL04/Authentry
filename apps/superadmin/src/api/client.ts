import axios from 'axios';

// Creates a clean instance for public routes (Login, Refresh) to avoid interceptor loops
export const publicAdminClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3333/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const adminApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3333/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Injects the SuperAdmin JWT
adminApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('superadmin_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Silent Refresh Flow & Safe Redirects
adminApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const currentPath = window.location.pathname;
    const isLoginRequest = originalRequest?.url?.includes('/login');

    // Silent Refresh Logic
    if (!isLoginRequest && error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Marks as retried to prevent infinite loops

      try {
        console.warn('🔄 SuperAdmin token expired. Attempting silent refresh...');
        
        const refreshToken = localStorage.getItem('superadmin_refresh_token');
        if (!refreshToken) throw new Error('No refresh token found');

        // Requests a new access token using the public client
        const refreshResponse = await publicAdminClient.post('/auth/refresh', { refreshToken });

        // Saves the new access token
        const newAccessToken = refreshResponse.data.accessToken;
        localStorage.setItem('superadmin_access_token', newAccessToken);

        // Updates the failed request with the fresh token and replay it
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return adminApiClient(originalRequest);

      } catch (refreshError) {
        // Complete Session Failure
        console.error('🔒 SuperAdmin refresh token invalid or expired. Forcing logout.');
        
        // Wipes SuperAdmin state
        localStorage.removeItem('superadmin_access_token');
        localStorage.removeItem('superadmin_refresh_token');
        localStorage.removeItem('superadmin_user');
        
        // Protects public routes from being redirected continuously
        if (currentPath !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Fallbacks for non-refreshable 401s or 403s (Forbidden/Blacklisted)
    if (!isLoginRequest && (error.response?.status === 401 || error.response?.status === 403)) {
      localStorage.removeItem('superadmin_access_token');
      localStorage.removeItem('superadmin_refresh_token');
      localStorage.removeItem('superadmin_user');
      
      if (currentPath !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);