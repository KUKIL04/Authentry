import axios from 'axios';

// Creates a clean instance for public routes (Login, Refresh) to avoid interceptor loops
export const publicAdminClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3333/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const adminApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3333/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

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
        
        await publicAdminClient.post('/auth/refresh');

        return adminApiClient(originalRequest);

      } catch (refreshError) {
        // Complete Session Failure
        console.error('🔒 SuperAdmin refresh token invalid or expired. Forcing logout.');
        
        // Wipes SuperAdmin state
        localStorage.removeItem('superadmin_profile');
        
        // Protects public routes from being redirected continuously
        if (currentPath !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Fallbacks for non-refreshable 401s or 403s (Forbidden/Blacklisted)
    if (!isLoginRequest && (error.response?.status === 401 || error.response?.status === 403)) {
      localStorage.removeItem('superadmin_profile');
      
      if (currentPath !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);