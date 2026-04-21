import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from './src/db';
import SellScreen from './src/screens/SellScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import MoreScreen from './src/screens/MoreScreen';
import LoginScreen from './src/screens/LoginScreen';
import { useAuthStore } from './src/store/authStore';
import { useSyncStore } from './src/store/syncStore';
import { pushSalesToBackend } from './src/services/syncService';
import { API_URL } from './src/config';

const TABS = [
  { key: 'sell', label: 'Sell', icon: '🛒' },
  { key: 'inventory', label: 'Inventory', icon: '📦' },
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'more', label: 'More', icon: '⚙️' },
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState('sell');
  
  const { token, isReady: authReady, restoreToken } = useAuthStore();
  const { setIsOnline, isOnline } = useSyncStore();

  useEffect(() => {
    initDatabase()
      .then(() => restoreToken())
      .then(() => setReady(true))
      .catch(console.error);
  }, []);

  // Network listener — checks backend reachability directly (no expo-network needed)
  useEffect(() => {
    if (!ready || !authReady) return;

    const checkNetwork = async () => {
      try {
        const res = await fetch(`${API_URL}/`, { method: 'HEAD' });
        setIsOnline(res.ok || res.status < 500);
      } catch (e) {
        setIsOnline(false);
      }
    };

    checkNetwork();
    const interval = setInterval(checkNetwork, 10000);
    return () => clearInterval(interval);
  }, [ready, authReady, setIsOnline]);

  // Sync worker
  useEffect(() => {
    if (isOnline && token) {
      pushSalesToBackend();
      const syncInterval = setInterval(pushSalesToBackend, 60000); // 1 min sync
      return () => clearInterval(syncInterval);
    }
  }, [isOnline, token]);

  if (!ready || !authReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading KashAm...</Text>
      </View>
    );
  }

  if (!token) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style="light" />
        <LoginScreen />
      </View>
    );
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'sell': return <SellScreen />;
      case 'inventory': return <InventoryScreen />;
      case 'dashboard': return <DashboardScreen />;
      case 'more': return <MoreScreen />;
      default: return <SellScreen />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {renderScreen()}
      <View style={styles.tabBar}>
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loading: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#94a3b8', marginTop: 12, fontSize: 16 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  tabIcon: { fontSize: 20, marginBottom: 2 },
  tabLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '500' },
  tabLabelActive: { color: '#16a34a', fontWeight: '700' },
});
