import { create } from 'zustand';
import * as SQLite from 'expo-sqlite';

// Simple key-value store using SQLite for token persistence (no extra packages needed)
const metaDb = SQLite.openDatabaseSync('kasham_meta.db');

async function initMetaDb() {
    await metaDb.execAsync(`CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT)`);
}
initMetaDb().catch(console.error);

async function kvGet(key: string): Promise<string | null> {
    const row: any = await metaDb.getFirstAsync('SELECT value FROM kv_store WHERE key = ?', key);
    return row?.value ?? null;
}

async function kvSet(key: string, value: string): Promise<void> {
    await metaDb.runAsync('INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)', key, value);
}

async function kvDelete(key: string): Promise<void> {
    await metaDb.runAsync('DELETE FROM kv_store WHERE key = ?', key);
}

interface AuthState {
    token: string | null;
    isReady: boolean;
    login: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    restoreToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    isReady: false,
    login: async (token: string) => {
        try {
            await kvSet('jwt_token', token);
            set({ token });
        } catch (e) {
            console.error("Failed to save token", e);
        }
    },
    logout: async () => {
        try {
            await kvDelete('jwt_token');
            set({ token: null });
        } catch (e) {
            console.error("Failed to delete token", e);
        }
    },
    restoreToken: async () => {
        try {
            const token = await kvGet('jwt_token');
            set({ token, isReady: true });
        } catch (e) {
            console.error("Failed to restore token", e);
            set({ isReady: true, token: null });
        }
    }
}));
