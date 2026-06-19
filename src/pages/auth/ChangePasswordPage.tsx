import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import axiosInstance from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import type { ChangePasswordPayload } from '../../types/auth';
import PasswordRequirements, { isPasswordValid } from '../../components/PasswordRequirements';

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, clearTemporaryPasswordFlag } = useAuth();
  const navigate = useNavigate();

  // ---------- validation ----------

  const validate = (): boolean => {
    if (!newPassword) {
      setFieldError('New password is required.');
      return false;
    }
    if (!isPasswordValid(newPassword)) {
      setFieldError('Password does not meet all requirements.');
      return false;
    }
    setFieldError('');
    return true;
  };

  // ---------- submit ----------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const payload: ChangePasswordPayload = {
        username: user!.username,
        new_password: newPassword,
      };
      await axiosInstance.post('/api/auth/change-password', payload);

      clearTemporaryPasswordFlag();

      const role = user?.role;
      navigate(role ? `/${role}/dashboard` : '/login', { replace: true });
    } catch (error) {
      if (error instanceof AxiosError) {
        if (!error.response) {
          setErrorMsg('Check your connection and try again.');
        } else {
          switch (error.response.status) {
            case 401:
              navigate('/login', { replace: true });
              break;
            case 422: {
              const data = error.response.data as {
                message?: string;
                errors?: Record<string, string[]>;
              };
              const firstError =
                Object.values(data.errors ?? {})[0]?.[0] ??
                data.message ??
                'Validation failed. Please check your input.';
              setErrorMsg(firstError);
              break;
            }
            case 500:
            default:
              setErrorMsg('Something went wrong. Please try again.');
          }
        }
      } else {
        setErrorMsg('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- render ----------

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-8 sm:p-10 border border-gray-100">

        {/* Heading */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
            Set New Password
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Your account uses a temporary password.
            <br />
            Please set a permanent password to continue.
          </p>
        </div>

        {/* Top-level API error */}
        {errorMsg && (
          <div
            role="alert"
            className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* New Password */}
          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              New Password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (fieldError) setFieldError('');
                }}
                disabled={isSubmitting}
                autoComplete="new-password"
                aria-describedby={fieldError ? 'new-password-error' : undefined}
                aria-invalid={!!fieldError}
                className={`w-full px-4 py-3 pr-12 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 ${
                  fieldError
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-gray-300 focus:ring-gray-900'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={isSubmitting}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none disabled:opacity-50 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
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
            {fieldError && (
              <p id="new-password-error" className="mt-1.5 text-xs text-red-600">
                {fieldError}
              </p>
            )}
            <PasswordRequirements password={newPassword} />
          </div>

          {/* Submit */}
          <button
            id="change-password-submit"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex justify-center items-center mt-2"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving…
              </>
            ) : (
              'Set Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
