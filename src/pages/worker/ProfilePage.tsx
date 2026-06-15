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

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'WK';

  return (
    <section className="wp-section">
      <div className="wp-section__heading">
        <h1 className="wp-section__title">Profile</h1>
      </div>

      <div className="wpr-card">
        {/* Avatar */}
        <div className="wpr-avatar">{initials}</div>

        {/* Info rows */}
        <dl className="wpr-info">
          <div className="wpr-info__row">
            <dt className="wpr-info__label">Username</dt>
            <dd className="wpr-info__value" id="profile-username">
              {user?.username ?? '—'}
            </dd>
          </div>
          <div className="wpr-info__row">
            <dt className="wpr-info__label">Role</dt>
            <dd className="wpr-info__value" id="profile-role">
              Worker
            </dd>
          </div>
        </dl>

        {/* Actions */}
        <div className="wpr-actions">
          <button
            id="profile-logout-btn"
            className="wm-btn wm-btn--danger wm-btn--full"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      </div>
    </section>
  );
}
