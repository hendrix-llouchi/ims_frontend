import { useEffect, useState, useCallback } from 'react';
import { fetchManagerFlags } from '../../api/manager/managerApi';
import type { ManagerFlag, WorkerFlagStatus } from '../../types/workerApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const getStatusBadge = (status: WorkerFlagStatus) => {
  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset bg-gray-50 text-gray-600 ring-gray-500/20 uppercase tracking-wide">
          Awaiting Owner Review
        </span>
      );
    case 'dismissed':
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset bg-amber-50 text-amber-700 ring-amber-600/20 uppercase tracking-wide">
          Dismissed
        </span>
      );
    case 'warning_issued':
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset bg-rose-50 text-rose-700 ring-rose-600/20 uppercase tracking-wide">
          Warning Issued
        </span>
      );
    default:
      return null;
  }
};

export default function FlagsPage() {
  // States
  const [flags, setFlags] = useState<ManagerFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch handler
  const loadFlagsData = useCallback(async (targetPage = page) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchManagerFlags(targetPage);
      setFlags(res.data);
      setPage(res.current_page);
      setTotalPages(res.last_page);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      const errMsg =
        axiosError.response?.data?.message || 'Failed to load flags. Please try again.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFlagsData(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadFlagsData]);

  // Skeleton builder
  const renderSkeletonRows = () => {
    return Array.from({ length: 5 }).map((_, idx) => (
      <tr key={idx} className="animate-pulse">
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gray-200 rounded-full shrink-0"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-28"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-6 bg-gray-200 rounded-full w-36"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-28"></div>
        </td>
      </tr>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Flags</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor the review outcome of worker flags you have submitted to the owner.
        </p>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-xs">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 111.085 1.085l-.04.02m0 0a.75.75 0 01-1.085-1.085l.04-.02m0 0a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </span>
        <div className="text-sm leading-relaxed text-indigo-900">
          <span className="font-semibold text-indigo-950">Notice: </span>
          Flags are reviewed by the Owner. You will see the outcome here once a decision has been made.
        </div>
      </div>

      {/* Main Content Area */}
      {error ? (
        // Error State
        <div className="border border-red-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-red-50/30 max-w-lg mx-auto">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 text-lg mb-4">
            ⚠️
          </span>
          <h3 className="text-base font-bold text-gray-900">Failed to load flags</h3>
          <p className="text-xs text-red-700 mt-1 mb-4">{error}</p>
          <button
            onClick={() => loadFlagsData(page)}
            className="inline-flex items-center justify-center rounded-xl bg-white border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-all cursor-pointer shadow-xs"
          >
            Retry
          </button>
        </div>
      ) : !isLoading && flags.length === 0 ? (
        // Empty State
        <div className="border border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-white max-w-lg mx-auto shadow-xs">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-lg mb-4">
            🚩
          </span>
          <h3 className="text-base font-bold text-gray-900">No flags found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            You have not flagged any workers yet.
          </p>
        </div>
      ) : (
        // Populated state table
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
                      Reason for Flagging
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Date Flagged
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Reviewed At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading
                    ? renderSkeletonRows()
                    : flags.map((flag) => {
                        const workerName = flag.worker?.name || `Worker #${flag.worker_id}`;
                        const initials = getInitials(workerName);
                        const colorClass = getAvatarColor(workerName);

                        return (
                          <tr key={flag.id} className="hover:bg-gray-50/40 transition-colors">
                            {/* Worker Info */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-sm ${colorClass}`}
                                >
                                  {initials}
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-gray-900">{workerName}</div>
                                </div>
                              </div>
                            </td>

                            {/* Reason */}
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-700 max-w-md break-words">
                                {flag.reason}
                              </div>
                            </td>

                            {/* Date Flagged */}
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-600">
                                {formatDate(flag.created_at)}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4">
                              {getStatusBadge(flag.status)}
                            </td>

                            {/* Reviewed At */}
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-600">
                                {flag.status !== 'pending'
                                  ? formatDate(flag.reviewed_at)
                                  : 'Not yet reviewed'}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {!isLoading && totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/30 py-4 px-6">
                <button
                  onClick={() => loadFlagsData(page - 1)}
                  disabled={page <= 1 || isLoading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                >
                  Previous
                </button>
                <span className="text-xs font-semibold text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => loadFlagsData(page + 1)}
                  disabled={page >= totalPages || isLoading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
