import axios from 'axios';

// Clean instance for public routes (Login, Refresh, Logout) to avoid interceptor loops
export const publicAdminClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const adminApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Single-flight lock: ensures concurrent 401s share ONE refresh request
let adminRefreshPromise: Promise<any> | null = null;

// Response Interceptor: Silent Refresh Flow & Safe Redirects
adminApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const currentPath = window.location.pathname;
    const isAuthRoute = originalRequest?.url?.includes('/auth/');

    // Silent Refresh Logic
    if (!isAuthRoute && error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (!adminRefreshPromise) {
          console.warn('🔄 SuperAdmin token expired. Attempting silent refresh...');
          adminRefreshPromise = publicAdminClient.post('/auth/refresh').finally(() => {
            adminRefreshPromise = null;
          });
        }

        await adminRefreshPromise;
        return adminApiClient(originalRequest);

      } catch (refreshError) {
        console.error('🔒 SuperAdmin refresh token invalid or expired. Forcing logout.');
        localStorage.removeItem('superadmin_profile');
        
        if (currentPath !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Fallbacks for non-refreshable 401s or 403s (Forbidden/Blacklisted)
    if (!isAuthRoute && (error.response?.status === 401 || error.response?.status === 403)) {
      localStorage.removeItem('superadmin_profile');
      
      if (currentPath !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);