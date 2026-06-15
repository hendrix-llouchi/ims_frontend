import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: '',
  // Sends the HttpOnly JWT cookie on every request.
  withCredentials: true,
  headers: {
    // Ensures the request body is parsed as JSON by Laravel.
    'Content-Type': 'application/json',
    // Tells Laravel to respond with JSON instead of redirecting to a login page.
    Accept: 'application/json',
    // Required by Laravel to return JSON error responses (401, 422) rather
    // than HTML redirects.
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// ── Response interceptor ───────────────────────────────────────────────────────
// When the JWT cookie is missing or expired the backend returns 401.
// Clear localStorage auth state and redirect to /login so the user can
// re-authenticate instead of seeing a generic "Failed to load data" error.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl: string = error?.config?.url ?? '';
    // Don't intercept login endpoint errors — LoginPage handles those itself
    const isLoginRequest = requestUrl.includes('/api/auth/login');
    if (status === 401 && !isLoginRequest) {
      // Remove stored auth so ProtectedRoute will redirect to /login
      localStorage.removeItem('ims_auth_user');
      // Only redirect if we are not already on /login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;

