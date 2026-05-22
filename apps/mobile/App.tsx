import './global.css';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { initDatabase, getProducts, createProduct } from './src/db';
import SellScreen from './src/screens/SellScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import TransactionScreen from './src/screens/TransactionScreen';
import OverviewScreen from './src/screens/OverviewScreen';
import MoreScreen from './src/screens/MoreScreen';
import LoginScreen from './src/screens/LoginScreen';
import { useAuthStore } from './src/store/authStore';
import { useSyncStore } from './src/store/syncStore';
import { useCurrencyStore } from './src/hooks/useCurrency';
import { pushSalesToBackend } from './src/services/syncService';
import { syncProductsFromBackend } from './src/services/productSyncService';
import { API_URL } from './src/config';
import { ShoppingCart, Package, Wallet, BarChart2, Menu } from 'lucide-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';

const TABS = [
  { key: 'sell',        label: 'Sell',        Icon: ShoppingCart },
  { key: 'inventory',   label: 'Stock',       Icon: Package },
  { key: 'transaction', label: 'Transaction', Icon: Wallet },
  { key: 'overview',    label: 'Overview',    Icon: BarChart2 },
  { key: 'more',        label: 'More',        Icon: Menu },
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState('sell');
  const [initialBarcode, setInitialBarcode] = useState<string | null>(null);

  const { token, userId, isReady: authReady, restoreToken } = useAuthStore();
  const { setIsOnline, isOnline } = useSyncStore();

  useEffect(() => {
    initDatabase()
      .then(() => useCurrencyStore.getState().initCurrency())
      .then(() => restoreToken())
      .then(() => setReady(true))
      .catch(console.error);
  }, []);

  // Network listener using NetInfo for real-time updates
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      // isInternetReachable can be null on first run, so we check isConnected first
      setIsOnline(!!state.isConnected && state.isInternetReachable !== false);
    });
    return () => unsubscribe();
  }, [setIsOnline]);

  // Sync worker — only runs when authenticated AND online
  useEffect(() => {
    if (isOnline && token && userId) {
      // Automatic restore if local DB is empty
      const restoreIfNeeded = async () => {
        try {
          const localProducts = await getProducts(userId);
          if (localProducts.length === 0) {
            console.log('[Restore] Local DB empty, attempting restore...');
            const response = await fetch(`${API_URL}/user-products/restore`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
              const backendProducts = await response.json();
              if (backendProducts.length > 0) {
                for (const p of backendProducts) {
                  await createProduct(
                    p.id,
                    p.name,
                    p.sellingPrice,
                    p.stock,
                    p.barcode ?? null,
                    p.imageUrl ?? null,
                    userId,
                    p.costPrice ?? null
                  );
                }
                console.log(`[Restore] Restored ${backendProducts.length} products`);
              }
            }
          }
        } catch (e) {
          console.warn('[Restore] Product restore failed:', e);
        }
      };

      restoreIfNeeded();
      pushSalesToBackend();
      const syncInterval = setInterval(pushSalesToBackend, 60000);
      return () => clearInterval(syncInterval);
    }
  }, [isOnline, token, userId]);

  // Cross-screen barcode handoff (SellScreen → InventoryScreen)
  const navigateToStock = (barcode: string) => {
    setInitialBarcode(barcode);
    setActiveTab('inventory');
  };
  const clearInitialBarcode = () => setInitialBarcode(null);

  if (!ready || !authReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={styles.loadingText}>Loading KashAm...</Text>
      </View>
    );
  }

  if (!token) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <LoginScreen />
      </SafeAreaProvider>
    );
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'sell':        return <SellScreen onNavigateToStock={navigateToStock} />;
      case 'inventory':   return <InventoryScreen initialBarcode={initialBarcode} onClearBarcode={clearInitialBarcode} />;
      case 'transaction': return <TransactionScreen />;
      case 'overview':    return <OverviewScreen />;
      case 'more':        return <MoreScreen />;
      default:            return <SellScreen onNavigateToStock={navigateToStock} />;
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="dark" />
        {renderScreen()}

        {/* Bottom Tab Bar */}
        <View style={styles.tabBar}>
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            const IconComponent = tab.Icon;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tab}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <IconComponent
                  size={24}
                  color={active ? '#16A34A' : '#64748B'}
                  fill={active && tab.key === 'sell' ? '#16A34A' : 'none'}
                  style={{ marginBottom: 4 }}
                />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F8FAFC' },
  loading:     { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#94a3b8', marginTop: 12, fontSize: 16 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
  },
  tab:           { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  tabLabel:      { fontSize: 10, color: '#64748B', fontWeight: '400' },
  tabLabelActive:{ color: '#16A34A', fontWeight: '600' },
});
