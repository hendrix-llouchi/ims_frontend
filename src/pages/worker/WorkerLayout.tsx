import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axios';

// ─── Nav items ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/worker/my-orders',  label: 'My Orders'  },
  { to: '/worker/all-orders', label: 'All Orders' },
  { to: '/worker/stock',      label: 'Stock'      },
  { to: '/worker/profile',    label: 'Profile'    },
];

// ─── Icons ─────────────────────────────────────────────────────────────────────
function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="6"  x2="21" y2="6"  />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ─── Layout ────────────────────────────────────────────────────────────────────
export default function WorkerLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut]  = useState(false);
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  // ref covers the whole <header> so outside-click closes the panel
  const headerRef = useRef<HTMLElement>(null);

  // Close on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close on click outside the header
  useEffect(() => {
    if (!mobileOpen) return;
    function handleClick(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mobileOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await axiosInstance.post('/api/auth/logout');
    } catch {
      // silently ignore — local state always cleared
    } finally {
      logout();
      navigate('/login', { replace: true });
    }
  }

  // Desktop active-link style: subtle indigo underline
  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'relative px-1 py-0.5 text-sm font-medium transition-colors duration-150',
      'after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-full after:rounded-full after:transition-all after:duration-150',
      isActive
        ? 'text-gray-900 after:bg-indigo-500 after:opacity-100'
        : 'text-gray-500 hover:text-gray-800 after:opacity-0',
    ].join(' ');

  // Mobile active-link style: indigo tinted row
  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex w-full items-center px-4 py-3 text-sm font-medium transition-colors duration-150',
      isActive
        ? 'bg-indigo-50 text-indigo-700'
        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
    ].join(' ');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Top Navigation Bar ──────────────────────────────────────────────────── */}
      <header
        ref={headerRef}
        className="sticky top-0 z-40 bg-white border-b border-gray-200"
      >
        {/* ── Navbar row ──────────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center gap-4">

            {/* Brand */}
            <NavLink
              to="/worker/my-orders"
              className="flex items-center gap-2 shrink-0 select-none"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-white font-bold text-sm">
                I
              </span>
              <span className="text-gray-900 font-semibold tracking-tight text-base">IMS</span>
            </NavLink>

            {/* Desktop nav links (hidden on mobile) */}
            <nav className="hidden md:flex items-center gap-6 ml-6" aria-label="Primary navigation">
              {NAV_ITEMS.map(({ to, label }) => (
                <NavLink key={to} to={to} className={desktopLinkClass}>
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Spacer pushes the right-side items to the far right */}
            <div className="flex-1" />

            {/* Username badge — desktop only */}
            <span className="hidden md:inline-flex items-center gap-1.5 text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-600 text-xs font-semibold uppercase">
                {(user?.username ?? 'W').charAt(0)}
              </span>
              <span className="font-medium text-gray-700">{user?.username ?? 'Worker'}</span>
            </span>

            {/* Logout button — desktop only */}
            <button
              id="worker-logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              className="hidden md:inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogoutIcon />
              {loggingOut ? 'Logging out…' : 'Logout'}
            </button>

            {/* Hamburger toggle — mobile only */}
            <button
              id="worker-menu-toggle"
              className="md:hidden flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-panel"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </button>

          </div>
        </div>

        {/* ── Mobile nav panel — full width, below the navbar row ─────────────── */}
        {mobileOpen && (
          <div
            id="mobile-nav-panel"
            className="md:hidden border-t border-gray-100 bg-white shadow-md animate-[fadeSlideDown_150ms_ease-out_both]"
          >
            {/* User info row */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold uppercase">
                {(user?.username ?? 'W').charAt(0)}
              </span>
              <span className="text-sm font-medium text-gray-800 truncate">
                {user?.username ?? 'Worker'}
              </span>
            </div>

            {/* Nav links */}
            <nav aria-label="Mobile navigation">
              {NAV_ITEMS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={mobileLinkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Logout */}
            <div className="border-t border-gray-100">
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogoutIcon />
                {loggingOut ? 'Logging out…' : 'Logout'}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Page Content ────────────────────────────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

    </div>
  );
}
