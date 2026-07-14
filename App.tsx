import './global.css';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from './src/db';
import SellScreen from './src/screens/SellScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import OverviewScreen from './src/screens/OverviewScreen';
import MoreScreen from './src/screens/MoreScreen';
import LoginScreen from './src/screens/LoginScreen';
import { useAuthStore } from './src/store/authStore';
import { useSyncStore } from './src/store/syncStore';
import { pushSalesToBackend } from './src/services/syncService';
import { syncProductsFromBackend } from './src/services/productSyncService';
import { API_URL } from './src/config';
import { 
  ShoppingCart, 
  Package, 
  Wallet, 
  BarChart3, 
  Menu 
} from 'lucide-react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
  { key: 'sell', label: 'Sell', Icon: ShoppingCart },
  { key: 'inventory', label: 'Stock', Icon: Package },
  { key: 'transactions', label: 'Transactions', Icon: Wallet },
  { key: 'dashboard', label: 'Overview', Icon: BarChart3 },
  { key: 'more', label: 'More', Icon: Menu },
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState('sell');
  const [initialBarcode, setInitialBarcode] = useState<string | null>(null);
  
  const { token, isReady: authReady, restoreToken } = useAuthStore();
  const { setIsOnline } = useSyncStore();

  useEffect(() => {
    initDatabase()
      .then(() => restoreToken())
      .then(() => setReady(true))
      .catch(console.error);
  }, []);

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

  useEffect(() => {
    if (token) {
      syncProductsFromBackend(token);
      pushSalesToBackend();
      const syncInterval = setInterval(pushSalesToBackend, 60000);
      return () => clearInterval(syncInterval);
    }
  }, [token]);

  const navigateToStock = (barcode: string) => {
      setInitialBarcode(barcode);
      setActiveTab('inventory');
  };

  const clearInitialBarcode = () => setInitialBarcode(null);

  if (!ready || !authReady) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#16A34A" />
        <Text className="text-textSecondary mt-4 font-bold">Initializing Chobo...</Text>
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
      case 'sell': return <SellScreen onNavigateToStock={navigateToStock} />;
      case 'inventory': return <InventoryScreen initialBarcode={initialBarcode} onClearBarcode={clearInitialBarcode} />;
      case 'transactions': return <TransactionsScreen />;
      case 'dashboard': return <OverviewScreen />;
      case 'more': return <MoreScreen />;
      default: return <SellScreen onNavigateToStock={navigateToStock} />;
    }
  };

  return (
    <SafeAreaProvider>
        <View className="flex-1 bg-lightBackground">
          <StatusBar style="dark" />
          
          <View className="flex-1">
            {renderScreen()}
          </View>
          
          {/* Bottom Navigation */}
         {/* BOTTOM NAVIGATION */}
        <View 
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          className="bg-white border-t border-border flex-row items-center px-4 pt-4"
        >
          {TABS.map((tab) => {
              const active = activeTab === tab.key;
              const Icon = tab.Icon;
              return (
                <TouchableOpacity
                  key={tab.key}
                  className="flex-1 items-center justify-center"
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.7}
                >
                  {Icon ? (
                    <Icon 
                      size={24} 
                      color={active ? '#16A34A' : '#DCFCE7'} 
                      strokeWidth={active ? 2.5 : 2}
                    />
                  ) : (
                    <View className="w-6 h-6 bg-border mb-1" />
                  )}
                  <Text 
                    className={`text-[10px] mt-1 ${active ? 'text-primary font-black' : 'text-textSecondary'}`}
                  >
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
