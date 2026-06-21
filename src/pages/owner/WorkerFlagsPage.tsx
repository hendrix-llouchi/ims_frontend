import React, { useEffect, useState, useCallback } from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import {
  fetchOwnerFlags,
  dismissOwnerFlag,
  warnOwnerFlag,
} from '../../api/owner/ownerApi';
import type { ManagerFlag } from '../../types/workerApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    'bg-indigo-50 text-indigo-700 border-indigo-100',
    'bg-emerald-50 text-emerald-700 border-emerald-100',
    'bg-amber-50 text-amber-700 border-amber-100',
    'bg-sky-50 text-sky-700 border-sky-100',
    'bg-rose-50 text-rose-700 border-rose-100',
    'bg-violet-50 text-violet-700 border-violet-100',
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

function parseErrorMessage(err: any): string {
  const status = err?.response?.status;
  const data = err?.response?.data;
  
  if (status === 403) {
    return "You don't have permission to perform this action.";
  }
  if (status === 404) {
    return "This flag no longer exists.";
  }
  if (status === 500) {
    return "Something went wrong. Please try again.";
  }
  if (err?.code === 'ERR_NETWORK' || (!status && err?.message?.includes('Network Error'))) {
    return "Unable to connect. Check your connection and try again.";
  }
  return data?.message || "Something went wrong. Please try again.";
}

export default function WorkerFlagsPage() {
  const { addNotification } = useNotificationStore();

  // Flags listing state
  const [flags, setFlags] = useState<ManagerFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFlags, setTotalFlags] = useState(0);

  // Modal states
  const [selectedFlag, setSelectedFlag] = useState<ManagerFlag | null>(null);
  const [modalView, setModalView] = useState<'detail' | 'confirm_dismiss' | 'issue_warning'>('detail');
  const [warningNotes, setWarningNotes] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Load flags data
  const loadFlagsData = useCallback(async (targetPage = page) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchOwnerFlags(targetPage);
      // Filter just in case the backend returns reviewed flags
      const pendingFlags = response.data.filter((f) => f.status === 'pending');
      
      // Order flags newest first (created_at descending)
      pendingFlags.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setFlags(pendingFlags);
      setPage(response.current_page);
      setTotalPages(response.last_page);
      setTotalFlags(response.total);
    } catch (err: any) {
      setError(parseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  // Initial load
  useEffect(() => {
    loadFlagsData(1);
  }, []);

  // Open modal
  const handleOpenReviewModal = (flag: ManagerFlag) => {
    setSelectedFlag(flag);
    setModalView('detail');
    setWarningNotes('');
    setActionError(null);
    setFieldErrors({});
    setIsSubmittingAction(false);
  };

  // Close modal
  const handleCloseModal = () => {
    if (isSubmittingAction) return;
    setSelectedFlag(null);
  };

  // Confirm Dismiss Action
  const handleConfirmDismiss = async () => {
    if (!selectedFlag) return;
    setIsSubmittingAction(true);
    setActionError(null);
    try {
      await dismissOwnerFlag(selectedFlag.id);
      
      addNotification({
        id: Math.random().toString(36).substring(7),
        message: 'Flag dismissed.',
        type: 'success',
        createdAt: new Date(),
      });
      
      setSelectedFlag(null);
      loadFlagsData(page);
    } catch (err: any) {
      setActionError(parseErrorMessage(err));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Submit Warning Action
  const handleConfirmWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlag || !warningNotes.trim()) return;
    setIsSubmittingAction(true);
    setActionError(null);
    setFieldErrors({});
    try {
      await warnOwnerFlag(selectedFlag.id, warningNotes.trim());
      
      const workerName = selectedFlag.worker?.name || `Worker #${selectedFlag.worker_id}`;
      addNotification({
        id: Math.random().toString(36).substring(7),
        message: `Warning issued to ${workerName}.`,
        type: 'success',
        createdAt: new Date(),
      });
      
      setSelectedFlag(null);
      loadFlagsData(page);
    } catch (err: any) {
      if (err?.response?.status === 422) {
        const validationErrors = err.response.data?.errors;
        if (validationErrors?.notes) {
          setFieldErrors({ notes: validationErrors.notes.join(' ') });
        } else {
          setFieldErrors({ notes: err.response.data?.message || 'Validation failed.' });
        }
      } else {
        setActionError(parseErrorMessage(err));
      }
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Render skeletons for loading feed
  const renderCardSkeletons = () => {
    return Array.from({ length: 4 }).map((_, idx) => (
      <div
        key={idx}
        className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs animate-pulse"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gray-200 rounded-full shrink-0"></div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-3 bg-gray-205 rounded w-32"></div>
            </div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-3 bg-gray-205 rounded w-full"></div>
          <div className="h-3 bg-gray-205 rounded w-4/5"></div>
        </div>
        <div className="flex justify-end pt-3 border-t border-gray-100">
          <div className="h-8 bg-gray-200 rounded-lg w-20"></div>
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Worker Flags</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review pending warnings and flags raised by managers. Decide whether to dismiss or issue formal warnings.
        </p>
      </div>

      {/* Main feed section */}
      {isLoading && flags.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderCardSkeletons()}
        </div>
      ) : error ? (
        <div className="border border-red-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-red-50/30 max-w-lg mx-auto shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 text-lg mb-4">
            ⚠️
          </span>
          <h3 className="text-base font-bold text-gray-900">Failed to load pending flags</h3>
          <p className="text-xs text-red-700 mt-1 mb-4">{error}</p>
          <button
            onClick={() => loadFlagsData(page)}
            className="inline-flex items-center justify-center rounded-xl bg-white border border-red-200 px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-all cursor-pointer shadow-xs"
          >
            Retry
          </button>
        </div>
      ) : flags.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-2xl p-16 flex flex-col items-center justify-center text-center bg-white max-w-lg mx-auto shadow-xs">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-lg mb-4">
            ✓
          </span>
          <h3 className="text-base font-bold text-gray-900">No pending flags. All clear!</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            Managers have not reported any new worker infractions.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Feed Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {flags.map((flag) => {
              const workerName = flag.worker?.name || `Worker #${flag.worker_id}`;
              const managerName = flag.manager?.name || `Manager #${flag.manager_id}`;
              const workerInitials = getInitials(workerName);
              const avatarColor = getAvatarColor(workerName);

              return (
                <div
                  key={flag.id}
                  className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-indigo-600/20 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Worker / Date header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-sm border uppercase shadow-2xs ${avatarColor}`}
                        >
                          {workerInitials}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900 truncate max-w-[180px]">
                            {workerName}
                          </div>
                          <div className="text-xs font-semibold text-indigo-600/90 uppercase tracking-wider mt-0.5">
                            Worker
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-gray-400 select-none bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1 shrink-0">
                        {formatDate(flag.created_at)}
                      </span>
                    </div>

                    {/* Manager & Reason info */}
                    <div className="space-y-3.5 mb-5">
                      <div className="text-xs text-gray-500 font-medium">
                        Flagged by:{' '}
                        <span className="font-semibold text-gray-800 bg-gray-100/70 px-2 py-0.5 rounded-md">
                          {managerName}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 leading-relaxed bg-gray-50/75 border border-gray-100/50 rounded-xl p-3.5 italic break-words">
                        "{flag.reason}"
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex justify-end pt-3 border-t border-gray-100 shrink-0">
                    <button
                      onClick={() => handleOpenReviewModal(flag)}
                      className="rounded-xl border border-gray-250 bg-white hover:bg-gray-50 hover:border-indigo-600 hover:text-indigo-600 px-4 py-2 text-xs font-semibold text-gray-700 transition-all shadow-2xs cursor-pointer"
                    >
                      Review
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 pt-6 px-1 shrink-0">
              <span className="text-xs font-semibold text-gray-500">
                Showing {flags.length} of {totalFlags} pending flags
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => loadFlagsData(page - 1)}
                  disabled={page <= 1 || isLoading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs font-semibold text-gray-600 select-none">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => loadFlagsData(page + 1)}
                  disabled={page >= totalPages || isLoading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Modal: Review Flag ─────────────────────────────────────────────────── */}
      {selectedFlag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden p-6 animate-[scaleIn_0.2s_ease-out] max-h-[95vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-150 pb-3 mb-4 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">
                {modalView === 'detail' && 'Review Worker Flag'}
                {modalView === 'confirm_dismiss' && 'Confirm Dismissal'}
                {modalView === 'issue_warning' && 'Issue Formal Warning'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer transition-colors p-1"
                disabled={isSubmittingAction}
              >
                ✕
              </button>
            </div>

            {/* Error Banner */}
            {actionError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl shrink-0 flex items-start gap-2">
                <span className="font-semibold select-none shrink-0">⚠️</span>
                <span>{actionError}</span>
              </div>
            )}

            {/* Main content scroll wrapper */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">

              {/* 1. Detail View */}
              {modalView === 'detail' && (
                <div className="space-y-4">
                  {/* Identity Row */}
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Flagged Worker
                      </div>
                      <div className="text-sm font-bold text-gray-800 mt-0.5">
                        {selectedFlag.worker?.name || `Worker #${selectedFlag.worker_id}`}
                      </div>
                      <div className="text-xs text-gray-500 font-medium">
                        Role: Worker
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Flagged By
                      </div>
                      <div className="text-sm font-bold text-gray-800 mt-0.5">
                        {selectedFlag.manager?.name || `Manager #${selectedFlag.manager_id}`}
                      </div>
                      <div className="text-xs text-gray-500 font-medium">
                        Role: Manager
                      </div>
                    </div>
                  </div>

                  {/* Reason Section */}
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      Flag Reason
                    </div>
                    <div className="text-xs text-gray-700 leading-relaxed bg-gray-50 border border-gray-150 rounded-xl p-4 break-words">
                      {selectedFlag.reason}
                    </div>
                  </div>

                  {/* Date section */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <span>📅 Raised on:</span>
                    <span className="font-semibold text-gray-700">{formatDate(selectedFlag.created_at)}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-6 shrink-0">
                    <button
                      type="button"
                      onClick={() => setModalView('confirm_dismiss')}
                      className="rounded-xl border border-gray-250 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer shadow-2xs"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalView('issue_warning')}
                      className="rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-orange-700 transition-all cursor-pointer animate-[pulse_2s_infinite]"
                    >
                      Issue Warning
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Dismiss Confirmation View */}
              {modalView === 'confirm_dismiss' && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 leading-relaxed bg-amber-50/50 border border-amber-200/80 rounded-xl p-4 flex items-start gap-2.5">
                    <span className="text-lg shrink-0 select-none">💡</span>
                    <span>
                      Are you sure you want to dismiss this flag? No action will be taken against the worker.
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-6 shrink-0">
                    <button
                      type="button"
                      onClick={() => setModalView('detail')}
                      disabled={isSubmittingAction}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDismiss}
                      disabled={isSubmittingAction}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-gray-850 transition-all disabled:opacity-50 cursor-pointer min-w-[120px]"
                    >
                      {isSubmittingAction ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                          <span>Dismissing...</span>
                        </>
                      ) : (
                        'Confirm Dismiss'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Issue Warning Form View */}
              {modalView === 'issue_warning' && (
                <form onSubmit={handleConfirmWarning} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Warning Notes *
                    </label>
                    <textarea
                      value={warningNotes}
                      onChange={(e) => {
                        setWarningNotes(e.target.value);
                        if (fieldErrors.notes) {
                          setFieldErrors((prev) => ({ ...prev, notes: '' }));
                        }
                      }}
                      placeholder="Describe the reason for this formal warning..."
                      disabled={isSubmittingAction}
                      rows={5}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none transition-all resize-none ${
                        fieldErrors.notes
                          ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                          : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                      }`}
                    />
                    {fieldErrors.notes && (
                      <span className="text-[10px] text-red-500 font-medium block">
                        {fieldErrors.notes}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-6 shrink-0">
                    <button
                      type="button"
                      onClick={() => setModalView('detail')}
                      disabled={isSubmittingAction}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingAction || !warningNotes.trim()}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-w-[130px]"
                    >
                      {isSubmittingAction ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                          <span>Submitting...</span>
                        </>
                      ) : (
                        'Confirm Warning'
                      )}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
