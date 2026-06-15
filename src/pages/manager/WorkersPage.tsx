import { useEffect, useState, useCallback } from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import {
  fetchManagerWorkers,
  fetchWorkersStatus,
  flagWorker,
} from '../../api/manager/managerApi';
import type { ManagerWorker } from '../../types/workerApi';

interface MergedWorker extends ManagerWorker {
  availability?: 'Available' | 'Busy';
}

function getInitials(name: string) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    'bg-indigo-50 text-indigo-700',
    'bg-emerald-50 text-emerald-700',
    'bg-amber-50 text-amber-700',
    'bg-sky-50 text-sky-700',
    'bg-rose-50 text-rose-700',
    'bg-violet-50 text-violet-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default function WorkersPage() {
  const { addNotification } = useNotificationStore();

  // Workers state
  const [workers, setWorkers] = useState<MergedWorker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal / Flag state
  const [flaggingWorker, setFlaggingWorker] = useState<MergedWorker | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [recentlyFlaggedIds, setRecentlyFlaggedIds] = useState<number[]>([]);

  // Fetch profiles and availability status
  const loadWorkersData = useCallback(
    async (targetPage = page) => {
      setIsLoading(true);
      setError(null);
      try {
        const [workersData, statusData] = await Promise.all([
          fetchManagerWorkers(targetPage),
          fetchWorkersStatus(),
        ]);

        const statusMap = new Map<number, 'Available' | 'Busy'>();
        statusData.workers.forEach((w) => {
          statusMap.set(w.id, w.status);
        });

        const merged: MergedWorker[] = workersData.data.map((worker) => {
          const status = statusMap.get(worker.id);
          return {
            ...worker,
            availability: status || 'Busy',
          };
        });

        setWorkers(merged);
        setPage(workersData.current_page);
        setTotalPages(workersData.last_page);
      } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        const errMsg =
          axiosError.response?.data?.message || 'Failed to load workers. Please try again.';
        setError(errMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [page],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadWorkersData(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadWorkersData]);

  // Flag submit handler
  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flaggingWorker) return;

    const trimmedReason = flagReason.trim();
    if (!trimmedReason) {
      setFlagError('Reason is required.');
      return;
    }

    setIsSubmittingFlag(true);
    setFlagError(null);

    try {
      const flaggedId = flaggingWorker.id;
      await flagWorker(flaggedId, trimmedReason);
      addNotification({
        id: Math.random().toString(36).substring(7),
        message: `${flaggingWorker.name} has been successfully flagged.`,
        type: 'success',
        createdAt: new Date(),
      });
      setFlaggingWorker(null);
      setFlagReason('');
      
      // Update recently flagged state for visual button feedback
      setRecentlyFlaggedIds((prev) => [...prev, flaggedId]);
      setTimeout(() => {
        setRecentlyFlaggedIds((prev) => prev.filter((id) => id !== flaggedId));
      }, 3000);

      loadWorkersData(page);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      const errMsg =
        axiosError.response?.data?.message || 'Failed to flag worker. Please try again.';
      setFlagError(errMsg);
    } finally {
      setIsSubmittingFlag(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Workers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage warehouse personnel availability, profiles, and flags.
          </p>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        // Loading State: Skeleton Table Rows
        <div className="border border-gray-200 rounded-2xl bg-white shadow-xs overflow-hidden">
          <div className="animate-pulse">
            <div className="bg-gray-50/50 border-b border-gray-100 h-12 w-full flex items-center px-6">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="border-b border-gray-100 h-16 w-full flex items-center px-6 gap-4"
              >
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-4 bg-gray-200 rounded w-28"></div>
                <div className="h-4 bg-gray-200 rounded w-48"></div>
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                <div className="h-8 bg-gray-200 rounded-lg w-24"></div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        // Error State
        <div className="border border-red-200 rounded-2xl p-6 bg-red-50 text-center">
          <span className="text-lg mb-2 block">⚠️</span>
          <h3 className="text-sm font-bold text-red-900">Failed to Load Workers</h3>
          <p className="text-xs text-red-700 mt-1 mb-4">{error}</p>
          <button
            onClick={() => loadWorkersData(page)}
            className="inline-flex items-center justify-center rounded-xl bg-white border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : workers.length === 0 ? (
        // Empty State
        <div className="border border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-white">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-lg mb-4">
            👥
          </span>
          <h3 className="text-base font-bold text-gray-900">No workers in the system yet</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            Worker accounts will show up here once they are registered.
          </p>
        </div>
      ) : (
        // Populated State: Table Layout
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-2xl bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Worker
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Username
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Email Address
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Availability
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {workers.map((worker) => {
                    const initials = getInitials(worker.name);
                    const colorClass = getAvatarColor(worker.name);
                    const isAvailable = worker.availability === 'Available';

                    return (
                      <tr
                        key={worker.id}
                        className="hover:bg-gray-50/40 transition-colors"
                      >
                        {/* Avatar & Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-sm ${colorClass}`}
                            >
                              {initials}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">
                                {worker.name}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                Age: {worker.age || 'N/A'} • {worker.location || 'No Location'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Username */}
                        <td className="px-6 py-4 text-sm font-semibold text-gray-700">
                          @{worker.username}
                        </td>

                        {/* Email */}
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {worker.email}
                        </td>

                        {/* Availability badge */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset ${
                              isAvailable
                                ? 'bg-green-50 text-green-700 ring-green-600/20'
                                : 'bg-orange-50 text-orange-700 ring-orange-600/20'
                            }`}
                          >
                            {worker.availability}
                          </span>
                        </td>

                        {/* Flag Worker button */}
                        <td className="px-6 py-4 text-right">
                          <button
                            disabled={recentlyFlaggedIds.includes(worker.id)}
                            onClick={() => setFlaggingWorker(worker)}
                            className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                              recentlyFlaggedIds.includes(worker.id)
                                ? 'border-green-200 bg-green-50 text-green-700 cursor-not-allowed'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-red-200 hover:text-red-600 hover:bg-red-50/20'
                            }`}
                          >
                            {recentlyFlaggedIds.includes(worker.id) ? 'Flagged ✓' : '🚩 Flag Worker'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-4 px-1">
            <button
              onClick={() => loadWorkersData(page - 1)}
              disabled={page <= 1 || isLoading}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>
            <span className="text-xs font-semibold text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => loadWorkersData(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ─── Modal: Flag Worker ────────────────────────────────────────────────── */}
      {flaggingWorker !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden p-6 animate-[scaleIn_0.2s_ease-out]">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Flag Worker: {flaggingWorker.name}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              File a flag report against this worker. Please specify the reason below.
            </p>

            {flagError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {flagError}
              </div>
            )}

            <form onSubmit={handleFlagSubmit} className="space-y-4">
              <div>
                <textarea
                  id="flag-reason-textarea"
                  rows={4}
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  placeholder="Describe the reason for flagging this worker..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all resize-none"
                  disabled={isSubmittingFlag}
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setFlaggingWorker(null);
                    setFlagReason('');
                    setFlagError(null);
                  }}
                  disabled={isSubmittingFlag}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-flag-worker"
                  disabled={isSubmittingFlag || !flagReason.trim()}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmittingFlag ? 'Submitting...' : 'Flag Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
