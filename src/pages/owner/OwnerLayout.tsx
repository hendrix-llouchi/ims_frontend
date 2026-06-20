import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axios';

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
function UsersIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ─── Sidebar Nav Items ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/owner/users', label: 'User Management', icon: UsersIcon },
];

export default function OwnerLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile sidebar drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await axiosInstance.post('/api/auth/logout');
    } catch {
      // ignore server errors and proceed with clearing local auth state
    } finally {
      logout();
      navigate('/login', { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* ─── Mobile Header Bar (Sticky) ────────────────────────────────────────── */}
      <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-gray-200 sticky top-0 z-20 shadow-xs">
        <NavLink to="/owner/users" className="flex items-center gap-2 select-none">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-extrabold text-xs">
            I
          </span>
          <span className="text-gray-900 font-bold tracking-tight text-sm">IMS</span>
        </NavLink>

        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <HamburgerIcon />
        </button>
      </header>

      {/* ─── Mobile Backdrop Overlay ────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-gray-600/40 backdrop-blur-xs z-30 md:hidden transition-opacity duration-300 ease-in-out"
          aria-hidden="true"
        />
      )}

      {/* ─── Navigation Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={[
          'fixed inset-y-0 left-0 flex flex-col justify-between bg-white border-r border-gray-200/80 z-40 transition-all duration-300 ease-in-out',
          collapsed ? 'md:w-16 w-60' : 'w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Top Branding & Navigation */}
        <div className="flex flex-col flex-1 pt-6 overflow-y-auto">
          {/* Logo / Branding / Close Header */}
          <div
            className={[
              'flex items-center px-4 mb-6 transition-all duration-300',
              collapsed ? 'md:flex-col md:gap-4 md:justify-center justify-between' : 'justify-between',
            ].join(' ')}
          >
            {/* Desktop Brand Logo */}
            <NavLink
              to="/owner/users"
              className={[
                'items-center gap-2.5 select-none shrink-0 group',
                collapsed ? 'md:hidden flex' : 'flex',
              ].join(' ')}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-extrabold text-sm shadow-sm transition-transform group-hover:scale-105">
                I
              </span>
              <span className="text-gray-900 font-bold tracking-tight text-lg">
                IMS<span className="text-indigo-600 font-extrabold">.</span>
              </span>
            </NavLink>

            {/* Collapsed Brand Indicator (Desktop only) */}
            {collapsed && (
              <span className="hidden md:flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-extrabold text-sm shadow-xs select-none">
                I
              </span>
            )}

            {/* Desktop Toggle Button */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex p-1.5 rounded-lg border border-gray-200/80 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg border border-gray-200/80 bg-white text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 space-y-1" aria-label="Sidebar navigation">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    'relative flex items-center rounded-xl text-sm font-semibold transition-all duration-300 select-none group',
                    collapsed ? 'md:justify-center md:p-2.5 p-3 gap-3 md:gap-0' : 'gap-3 px-4 py-2.5',
                    isActive
                      ? 'bg-indigo-50/75 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active vertical bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-md bg-indigo-600" />
                    )}
                    <span
                      className={[
                        'transition-colors shrink-0',
                        isActive
                          ? 'text-indigo-600'
                          : 'text-gray-400 group-hover:text-gray-500',
                      ].join(' ')}
                    >
                      <Icon />
                    </span>
                    <span
                      className={[
                        'transition-all duration-300 ease-in-out truncate whitespace-nowrap overflow-hidden',
                        collapsed
                          ? 'md:max-w-0 md:opacity-0 md:pointer-events-none max-w-[200px] opacity-100'
                          : 'max-w-[200px] opacity-100',
                      ].join(' ')}
                    >
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Profile & Logout Section */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex flex-col gap-2">
          {/* Profile Card */}
          <div
            className={[
              'flex items-center rounded-xl bg-white border border-gray-100 shadow-xs transition-all duration-300',
              collapsed ? 'md:p-1.5 p-3 md:justify-center' : 'px-3 py-2.5',
            ].join(' ')}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100/50 text-indigo-700 text-sm font-bold uppercase shadow-xs">
              {(user?.name || user?.username || 'O').charAt(0)}
            </span>
            <div
              className={[
                'min-w-0 transition-all duration-300 ease-in-out',
                collapsed
                  ? 'md:max-w-0 md:opacity-0 md:overflow-hidden md:pointer-events-none md:ml-0 ml-3 max-w-[200px] opacity-100'
                  : 'max-w-[200px] opacity-100 ml-3',
              ].join(' ')}
            >
              <span className="block text-sm font-bold text-gray-900 truncate">
                {user?.name || user?.username || 'Owner'}
              </span>
              <span className="block text-xs font-semibold text-indigo-600/90 uppercase tracking-wider mt-0.5">
                {user?.role || 'Owner'}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            id="owner-logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
            className={[
              'flex items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-600 shadow-xs transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-200/60 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
              collapsed ? 'md:p-2.5 p-3 md:w-auto w-full md:gap-0 gap-2' : 'gap-2 px-4 py-2.5 w-full',
            ].join(' ')}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogoutIcon />
            <span
              className={[
                'transition-all duration-300 ease-in-out truncate overflow-hidden whitespace-nowrap',
                collapsed
                  ? 'md:max-w-0 md:opacity-0 md:pointer-events-none md:ml-0 ml-1 max-w-[200px] opacity-100'
                  : 'max-w-[200px] opacity-100 ml-1',
              ].join(' ')}
            >
              {loggingOut ? 'Logging out…' : 'Logout'}
            </span>
          </button>
        </div>
      </aside>

      {/* ─── Main Content Wrapper ───────────────────────────────────────────────── */}
      <div
        className={[
          'flex-1 min-h-screen flex flex-col transition-all duration-300 ease-in-out',
          collapsed ? 'md:pl-16 pl-0' : 'md:pl-60 pl-0',
        ].join(' ')}
      >
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
