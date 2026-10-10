import axios from 'axios';

// A centralized Axios instance for authenticated requests
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Single-flight lock: ensures concurrent 401s share ONE refresh request
let refreshPromise: Promise<any> | null = null;

// Response Interceptor: Silent Refresh Flow & Safe Redirects
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const currentPath = window.location.pathname;

    // Prevents intercepting auth-related routes to avoid infinite loops
    const isAuthRoute = originalRequest?.url?.includes('/auth/');

    // Silent Refresh Logic
    if (!isAuthRoute && error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark as retried to prevent infinite loops

      try {
        if (!refreshPromise) {
          console.warn('🔄 Access token expired. Attempting silent refresh...');
          
          refreshPromise = publicClient.post('/auth/refresh').finally(() => {
            refreshPromise = null;
          });
        }  
        await refreshPromise;
        return apiClient(originalRequest);
      } catch (refreshError: any) {
        // Complete Session Failure
        console.error('🔒 Refresh token invalid or expired. Forcing logout.');
        localStorage.removeItem('user');
        localStorage.removeItem('tenantSettings');
        
        const errorMessage = refreshError.response?.data?.error || 'Your session has expired. Please log in again.';

        // Protect public routes from being redirected
        if (currentPath !== '/login' && !currentPath.startsWith('/register')) {
          window.location.href = `/login?error=${encodeURIComponent(errorMessage)}`;
        }
        return Promise.reject(refreshError);
      }
    }

    // Fallback for non-refreshable 401s
    if (!isAuthRoute && (error.response?.status === 401 || error.response?.status === 403)) {
      localStorage.removeItem('user');
      localStorage.removeItem('tenantSettings');

      const errorMessage = error.response?.data?.error || 'Session securely terminated.';

      if (currentPath !== '/login' && !currentPath.startsWith('/register')) {
        window.location.href = `/login?error=${encodeURIComponent(errorMessage)}`;
      }
    }

    return Promise.reject(error);
  }
);

// A clean instance for public routes (Login, Register, Invites, Logout)
export const publicClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});