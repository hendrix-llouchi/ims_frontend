import { useEffect } from 'react';
import { useNotificationStore } from '../store/notificationStore';

export default function Toast() {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {notifications.map((notification) => (
        <ToastItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  notification: {
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    createdAt: Date;
  };
  onClose: () => void;
}

function ToastItem({ notification, onClose }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = notification.type === 'success';

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 w-full p-4 rounded-xl shadow-lg border text-white transition-all duration-300 transform translate-y-0 opacity-100 animate-[slideIn_0.25s_ease-out] ${
        isSuccess
          ? 'bg-emerald-600 border-emerald-500 shadow-emerald-900/10'
          : 'bg-red-600 border-red-500 shadow-red-900/10'
      }`}
      role="alert"
    >
      {/* Icon Badge */}
      <span className="mt-0.5 shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-white/20 text-white">
        {isSuccess ? (
          <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </span>

      {/* Message */}
      <div className="flex-1">
        <p className="text-sm font-semibold tracking-wide leading-5">
          {isSuccess ? 'Success' : 'Error'}
        </p>
        <p className="text-sm text-emerald-50 leading-relaxed mt-0.5">
          {notification.message}
        </p>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="shrink-0 text-white/80 hover:text-white transition-colors p-0.5 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
        aria-label="Dismiss notification"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
