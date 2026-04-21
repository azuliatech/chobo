import { create } from 'zustand';

interface SyncState {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncedAt: Date | null;
    setIsOnline: (status: boolean) => void;
    setIsSyncing: (status: boolean) => void;
    setLastSyncedAt: (date: Date) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
    isOnline: false,
    isSyncing: false,
    lastSyncedAt: null,
    setIsOnline: (status) => set({ isOnline: status }),
    setIsSyncing: (status) => set({ isSyncing: status }),
    setLastSyncedAt: (date) => set({ lastSyncedAt: date })
}));
