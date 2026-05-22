import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';

interface SyncState {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncedAt: Date | null;
    setIsOnline: (status: boolean) => void;
    setIsSyncing: (status: boolean) => void;
    setLastSyncedAt: (date: Date) => void;
    initNetworkListener: () => () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
    isOnline: false,
    isSyncing: false,
    lastSyncedAt: null,
    setIsOnline: (status) => set({ isOnline: status }),
    setIsSyncing: (status) => set({ isSyncing: status }),
    setLastSyncedAt: (date) => set({ lastSyncedAt: date }),

    /** Call once in App.tsx root. Returns the unsubscribe function. */
    initNetworkListener: () => {
        // Fetch current state immediately
        NetInfo.fetch().then(state => {
            set({ isOnline: !!(state.isConnected && state.isInternetReachable !== false) });
        });
        // Subscribe to changes — updates isOnline reactively in real time
        const unsubscribe = NetInfo.addEventListener(state => {
            set({ isOnline: !!(state.isConnected && state.isInternetReachable !== false) });
        });
        return unsubscribe;
    },
}));
