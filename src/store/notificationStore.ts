import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Notification } from '../types/notification';

interface NotificationState {
  notifications: Notification[];

  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set) => ({
      // State
      notifications: [],

      // Actions
      addNotification: (notification) =>
        set(
          (state) => ({
            notifications: [...state.notifications, notification],
          }),
          false,
          'notifications/addNotification'
        ),

      removeNotification: (id) =>
        set(
          (state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          }),
          false,
          'notifications/removeNotification'
        ),

      clearAll: () =>
        set({ notifications: [] }, false, 'notifications/clearAll'),
    }),
    { name: 'NotificationStore' }
  )
);
