import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'jwt_token';
const REFRESH_TOKEN_KEY = 'jwt_refresh_token';
const BUSINESS_NAME_KEY = 'businessName';
const USER_ID_KEY = 'userId';

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

interface AuthState {
    token: string | null;
    refreshToken: string | null;
    userId: string | null;
    businessName: string | null;
    isReady: boolean;
    login: (token: string, refreshToken: string, userId: string, businessName?: string | null) => Promise<void>;
    logout: () => Promise<void>;
    restoreToken: () => Promise<void>;
    setBusinessName: (name: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    refreshToken: null,
    userId: null,
    businessName: null,
    isReady: false,

    login: async (token, refreshToken, userId, businessName) => {
        try {
            await SecureStore.setItemAsync(TOKEN_KEY, token);
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
            await AsyncStorage.setItem(USER_ID_KEY, userId);
            if (businessName) await AsyncStorage.setItem(BUSINESS_NAME_KEY, businessName);
            set({ token, refreshToken, userId, businessName: businessName ?? null });
        } catch (e) {
            console.error('Failed to save auth state', e);
        }
    },

    logout: async () => {
        try {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
            // NOTE: We do NOT delete userId or businessName from AsyncStorage on logout —
            // we only clear in-memory state. Data remains in SQLite scoped by userId.
            set({ token: null, refreshToken: null, userId: null, businessName: null });
        } catch (e) {
            console.error('Failed to clear auth state', e);
        }
    },

    restoreToken: async () => {
        try {
            const [token, refreshToken, userId, businessName] = await Promise.all([
                SecureStore.getItemAsync(TOKEN_KEY),
                SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
                AsyncStorage.getItem(USER_ID_KEY),
                AsyncStorage.getItem(BUSINESS_NAME_KEY),
            ]);

            // Fallback: if userId wasn't persisted separately, decode from token
            let resolvedUserId = userId;
            if (!resolvedUserId && token) {
                const payload = decodeJwtPayload(token);
                resolvedUserId = payload?.sub ?? null;
            }

            set({ token, refreshToken, userId: resolvedUserId, businessName, isReady: true });
        } catch (e) {
            console.error('Failed to restore auth state', e);
            set({ isReady: true, token: null, refreshToken: null, userId: null, businessName: null });
        }
    },

    setBusinessName: async (name: string) => {
        await AsyncStorage.setItem(BUSINESS_NAME_KEY, name);
        set({ businessName: name });
    },
}));
