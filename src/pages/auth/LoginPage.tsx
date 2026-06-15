import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import type { LoginRequest, LoginResponse } from '../../types/auth';
import { AxiosError } from 'axios';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, user } = useAuth();
  const navigate = useNavigate();
  // Track whether a login was just performed so the effect skips the initial mount.
  const justLoggedIn = useRef(false);

  useEffect(() => {
    if (!justLoggedIn.current) return; // Ignore stale localStorage user on mount
    if (user) {
      justLoggedIn.current = false;
      if (user.is_temporary_password) {
        navigate('/change-password', { replace: true });
      } else {
        navigate(`/${user.role}/dashboard`, { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username || !password) {
      setErrorMsg('Please enter your username and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: LoginRequest = { username, password };
      const response = await axiosInstance.post<LoginResponse>('/api/auth/login', payload);
      
      const { role, is_temporary_password } = response.data;
      justLoggedIn.current = true;
      login(role, username, is_temporary_password);
      // Navigation is handled by the useEffect watching `user`
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Login error — status:', error.response?.status, 'data:', error.response?.data, 'msg:', error.message);
        if (!error.response) {
          setErrorMsg(`Network error: ${error.message}`);
        } else {
          switch (error.response.status) {
            case 401:
              setErrorMsg('Invalid credentials.');
              break;
            case 403:
              setErrorMsg('Your account has been deactivated. Contact your administrator.');
              break;
            case 423:
              setErrorMsg('Account temporarily locked. Try again in 15 minutes.');
              break;
            case 500:
              setErrorMsg('Server error. Please try again later.');
              break;
            default:
              setErrorMsg(`Error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
          }
        }
      } else {
        console.error('Unexpected login error:', error);
        setErrorMsg(`Unexpected error: ${String(error)}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-8 sm:p-10 border border-gray-100">
        <h1 className="text-3xl font-semibold text-gray-900 text-center mb-10 tracking-tight">Sign In</h1>
        
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none disabled:opacity-50 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex justify-center items-center mt-8"
          >
            {isSubmitting ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Login'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
