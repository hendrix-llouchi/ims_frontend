import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import { useState } from 'react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await axiosInstance.post('/api/auth/logout');
    } catch {
      // silently ignore
    } finally {
      logout();
      navigate('/login', { replace: true });
    }
  }

  // Get initials from user's full name, falling back to username or 'WK'
  const getInitials = () => {
    if (user?.name) {
      const parts = user.name.trim().split(/\s+/);
      if (parts.length > 0) {
        const first = parts[0].charAt(0);
        const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
        return (first + last).toUpperCase();
      }
    }
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return 'WK';
  };

  return (
    <section className="py-6 max-w-4xl mx-auto" aria-labelledby="profile-heading">
      <div className="mb-8 flex items-center justify-between border-b border-gray-100 pb-4">
        <h1 id="profile-heading" className="text-2xl font-bold tracking-tight text-gray-900">
          My Profile
        </h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-xs max-w-2xl mx-auto">
        {/* Profile Avatar Header */}
        <div className="flex flex-col items-center text-center pb-6 border-b border-gray-100 mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-white text-2xl font-bold uppercase shadow-xs">
            {getInitials()}
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">{user?.name || 'Warehouse Worker'}</h2>
          <p className="text-sm text-gray-500">@{user?.username || 'worker'}</p>
        </div>

        {/* Info Rows Grid */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6" id="profile-details-list">
          {/* Full Name */}
          <div>
            <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
              Full Name
            </dt>
            <dd className="text-sm font-semibold text-gray-900" id="profile-name">
              {user?.name || 'Not provided'}
            </dd>
          </div>

          {/* Username */}
          <div>
            <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
              Username
            </dt>
            <dd className="text-sm font-semibold text-gray-900" id="profile-username">
              {user?.username || 'Not provided'}
            </dd>
          </div>

          {/* Role */}
          <div>
            <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
              Role
            </dt>
            <dd className="text-sm font-semibold text-gray-900" id="profile-role">
              Warehouse Worker
            </dd>
          </div>

          {/* Email */}
          <div>
            <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
              Email
            </dt>
            <dd className="text-sm font-semibold text-gray-900" id="profile-email">
              {user?.email || 'Not provided'}
            </dd>
          </div>

          {/* Phone Number */}
          <div>
            <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
              Phone Number
            </dt>
            <dd className="text-sm font-semibold text-gray-900" id="profile-phone">
              {user?.phone_number || 'Not provided'}
            </dd>
          </div>

          {/* Location */}
          <div>
            <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
              Location
            </dt>
            <dd className="text-sm font-semibold text-gray-900" id="profile-location">
              {user?.location || 'Not provided'}
            </dd>
          </div>

          {/* Emergency Contact */}
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
              Emergency Contact
            </dt>
            <dd className="text-sm font-semibold text-gray-900" id="profile-emergency-contact">
              {user?.emergency_contact || 'Not provided'}
            </dd>
          </div>
        </dl>

        {/* Action Buttons */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
          <button
            id="profile-change-password-btn"
            onClick={() => navigate('/change-password')}
            className="flex-1 py-2.5 px-4 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg text-sm transition-colors duration-200 text-center cursor-pointer"
          >
            Change Password
          </button>
          
          <button
            id="profile-logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex-1 py-2.5 px-4 bg-white hover:bg-gray-50 text-red-600 font-medium rounded-lg text-sm border border-gray-200 transition-colors duration-200 text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      </div>
    </section>
  );
}
