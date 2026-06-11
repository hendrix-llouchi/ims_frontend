import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8000',
  // Sends the HttpOnly session/JWT cookie on every cross-origin request.
  withCredentials: true,
  headers: {
    // Ensures the request body is parsed as JSON by Laravel.
    'Content-Type': 'application/json',
    // Tells Laravel to respond with JSON instead of redirecting to a login page.
    Accept: 'application/json',
    // Required by Laravel Sanctum / CSRF middleware to identify this as an
    // XHR request so it returns JSON error responses (401, 422) rather than
    // HTML redirects.
    'X-Requested-With': 'XMLHttpRequest',
  },
});

export default axiosInstance;
