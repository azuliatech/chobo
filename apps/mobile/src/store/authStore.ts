import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'jwt_token';
const REFRESH_TOKEN_KEY = 'jwt_refresh_token';
const BUSINESS_NAME_KEY = 'businessName';
const USER_ID_KEY = 'userId';
const ACTIVE_STORE_OWNER_KEY = 'activeStoreOwnerId';
const ACTIVE_ROLE_KEY = 'activeRole';

/** Decode JWT payload without a library (base64url split). */
function decodeJwtPayload(token: string): Record<string, any> | null {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const json = atob(base64);
        return JSON.parse(json);
    } catch {
        return null;
    }
}

export interface StoreAccess {
    ownerId: string;
    shopName: string | null;
    role: 'OWNER' | 'MANAGER' | 'CASHIER';
    status: string;
}

interface AuthState {
    token: string | null;
    refreshToken: string | null;
    userId: string | null;
    businessName: string | null;
    isReady: boolean;

    // Multi-store state
    stores: StoreAccess[];
    activeStoreOwnerId: string | null; // The owner whose catalog is currently active
    activeRole: 'OWNER' | 'MANAGER' | 'CASHIER' | null;

    login: (
        token: string,
        refreshToken: string,
        userId: string,
        businessName?: string | null,
        stores?: StoreAccess[],
    ) => Promise<void>;
    logout: () => Promise<void>;
    restoreToken: () => Promise<void>;
    setBusinessName: (name: string) => Promise<void>;
    switchStore: (ownerId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    token: null,
    refreshToken: null,
    userId: null,
    businessName: null,
    isReady: false,
    stores: [],
    activeStoreOwnerId: null,
    activeRole: null,

    login: async (token, refreshToken, userId, businessName, stores = []) => {
        try {
            await SecureStore.setItemAsync(TOKEN_KEY, token);
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
            await AsyncStorage.setItem(USER_ID_KEY, userId);
            if (businessName) await AsyncStorage.setItem(BUSINESS_NAME_KEY, businessName);

            // Determine the active store:
            // - If there's only 1 store (most users), auto-select it.
            // - If there are multiple (multi-store staff), default to the first OWNER store.
            const defaultStore = stores.find(s => s.role === 'OWNER') || stores[0] || null;
            const activeStoreOwnerId = defaultStore?.ownerId || userId;
            const activeRole = defaultStore?.role || 'OWNER';

            await AsyncStorage.setItem(ACTIVE_STORE_OWNER_KEY, activeStoreOwnerId);
            await AsyncStorage.setItem(ACTIVE_ROLE_KEY, activeRole);

            set({
                token,
                refreshToken,
                userId,
                businessName: businessName ?? null,
                stores,
                activeStoreOwnerId,
                activeRole,
            });
        } catch (e) {
            console.error('Failed to save auth state', e);
        }
    },

    logout: async () => {
        try {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
            await AsyncStorage.removeItem(ACTIVE_STORE_OWNER_KEY);
            await AsyncStorage.removeItem(ACTIVE_ROLE_KEY);
            set({
                token: null,
                refreshToken: null,
                userId: null,
                businessName: null,
                stores: [],
                activeStoreOwnerId: null,
                activeRole: null,
            });
        } catch (e) {
            console.error('Failed to clear auth state', e);
        }
    },

    restoreToken: async () => {
        try {
            const [token, refreshToken, userId, businessName, activeStoreOwnerId, activeRole] =
                await Promise.all([
                    SecureStore.getItemAsync(TOKEN_KEY),
                    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
                    AsyncStorage.getItem(USER_ID_KEY),
                    AsyncStorage.getItem(BUSINESS_NAME_KEY),
                    AsyncStorage.getItem(ACTIVE_STORE_OWNER_KEY),
                    AsyncStorage.getItem(ACTIVE_ROLE_KEY),
                ]);

            // Fallback: if userId wasn't persisted separately, decode from token
            let resolvedUserId = userId;
            if (!resolvedUserId && token) {
                const payload = decodeJwtPayload(token);
                resolvedUserId = payload?.sub ?? null;
            }

            set({
                token,
                refreshToken,
                userId: resolvedUserId,
                businessName,
                isReady: true,
                // Restore active store context (stores[] will be re-fetched on next login)
                activeStoreOwnerId: activeStoreOwnerId || resolvedUserId,
                activeRole: (activeRole as 'OWNER' | 'MANAGER' | 'CASHIER') || 'OWNER',
            });
        } catch (e) {
            console.error('Failed to restore auth state', e);
            set({
                isReady: true,
                token: null,
                refreshToken: null,
                userId: null,
                businessName: null,
                stores: [],
                activeStoreOwnerId: null,
                activeRole: null,
            });
        }
    },

    setBusinessName: async (name: string) => {
        await AsyncStorage.setItem(BUSINESS_NAME_KEY, name);
        set({ businessName: name });
    },

    /**
     * Switch the active store context.
     * Updates the activeStoreOwnerId and activeRole in memory + AsyncStorage.
     */
    switchStore: async (ownerId: string) => {
        const { stores } = get();
        const target = stores.find(s => s.ownerId === ownerId);
        if (!target) {
            console.warn('Attempted to switch to a store not in the stores list');
            return;
        }
        await AsyncStorage.setItem(ACTIVE_STORE_OWNER_KEY, ownerId);
        await AsyncStorage.setItem(ACTIVE_ROLE_KEY, target.role);
        set({ activeStoreOwnerId: ownerId, activeRole: target.role });
    },
}));
