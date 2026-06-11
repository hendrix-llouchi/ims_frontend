import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Worker } from '../types/worker';

interface WorkerState {
  workers: Worker[];
  isLoading: boolean;

  setWorkers: (workers: Worker[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useWorkerStore = create<WorkerState>()(
  devtools(
    (set) => ({
      // State
      workers: [],
      isLoading: false,

      // Actions
      setWorkers: (workers) =>
        set({ workers }, false, 'workers/setWorkers'),

      setLoading: (loading) =>
        set({ isLoading: loading }, false, 'workers/setLoading'),
    }),
    { name: 'WorkerStore' }
  )
);
