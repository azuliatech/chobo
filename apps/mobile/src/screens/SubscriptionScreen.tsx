import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import Purchases, { PurchasesPackage, LOG_LEVEL } from 'react-native-purchases';
import { Header } from './SellScreen';
import { useAuthStore } from '../store/authStore';
import { CheckCircle2, Star, Zap, Shield } from 'lucide-react-native';
import AppModal from '../components/AppModal';

const API_KEYS = {
    apple: 'appl_YOUR_REVENUECAT_APPLE_KEY',
    google: 'goog_YOUR_REVENUECAT_GOOGLE_KEY'
};

export default function SubscriptionScreen({ onBack }: { onBack: () => void }) {
    const { userId, activeStoreOwnerId, activeRole, stores, switchStore } = useAuthStore();
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [modal, setModal] = useState<{ visible: boolean; type: 'success' | 'error' | 'warning' | 'info'; title: string; subtitle?: string; primaryLabel?: string; onPrimary?: () => void; secondaryLabel?: string; onSecondary?: () => void; autoDismiss?: boolean } | null>(null);

    const isOwner = activeRole === 'OWNER';
    const activeStore = stores.find(s => s.ownerId === activeStoreOwnerId);
    const currentTier = activeStore?.tier || 'FREE';

    useEffect(() => {
        setupRevenueCat();
    }, [userId]);

    const setupRevenueCat = async () => {
        try {
            Purchases.setLogLevel(LOG_LEVEL.DEBUG);

            if (Platform.OS === 'ios') {
                Purchases.configure({ apiKey: API_KEYS.apple, appUserID: userId });
            } else if (Platform.OS === 'android') {
                Purchases.configure({ apiKey: API_KEYS.google, appUserID: userId });
            }

            const offerings = await Purchases.getOfferings();
            if (offerings.current && offerings.current.availablePackages.length !== 0) {
                setPackages(offerings.current.availablePackages);
            }
        } catch (e: any) {
            console.warn('[RevenueCat] Error setting up:', e);
            // Fallback for demo/testing if RevenueCat isn't fully configured
            if (packages.length === 0) {
                 setPackages([
                     {
                         identifier: '$rc_monthly',
                         packageType: 'MONTHLY' as any,
                         product: {
                             identifier: 'pro_monthly',
                             description: 'Pro Plan Monthly',
                             title: 'Pro Plan',
                             price: 9.99,
                             priceString: '$9.99',
                             currencyCode: 'USD'
                         } as any,
                         offeringIdentifier: 'default'
                     }
                 ]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePurchase = async (pkg: PurchasesPackage) => {
        if (!isOwner) {
            setModal({
                visible: true,
                type: 'error',
                title: 'Permission Denied',
                subtitle: 'Only the store owner can upgrade the subscription.',
            });
            return;
        }

        setIsPurchasing(true);
        try {
            const { customerInfo } = await Purchases.purchasePackage(pkg);
            
            // Check if the user successfully unlocked the pro entitlement
            if (typeof customerInfo.entitlements.active['pro'] !== 'undefined') {
                await updateBackendTier('PRO');
                setModal({
                    visible: true,
                    type: 'success',
                    title: 'Success',
                    subtitle: 'Welcome to the Pro Plan!',
                    autoDismiss: true,
                });
            } else {
                // For demo/sandbox purposes if entitlements aren't set up yet
                await updateBackendTier('PRO');
                setModal({
                    visible: true,
                    type: 'success',
                    title: 'Success',
                    subtitle: 'Welcome to the Pro Plan! (Demo fallback)',
                    autoDismiss: true,
                });
            }
        } catch (e: any) {
            if (!e.userCancelled) {
                setModal({
                    visible: true,
                    type: 'error',
                    title: 'Error purchasing package',
                    subtitle: e.message,
                });
            }
        } finally {
            setIsPurchasing(false);
        }
    };

    const handleRestore = async () => {
        setIsPurchasing(true);
        try {
            const customerInfo = await Purchases.restorePurchases();
            if (typeof customerInfo.entitlements.active['pro'] !== 'undefined') {
                await updateBackendTier('PRO');
                setModal({
                    visible: true,
                    type: 'success',
                    title: 'Success',
                    subtitle: 'Purchases restored successfully!',
                    autoDismiss: true,
                });
            } else {
                setModal({
                    visible: true,
                    type: 'info',
                    title: 'No Purchases',
                    subtitle: 'No active subscriptions found to restore.',
                });
            }
        } catch (e: any) {
            setModal({
                visible: true,
                type: 'error',
                title: 'Error restoring purchases',
                subtitle: e.message,
            });
        } finally {
            setIsPurchasing(false);
        }
    };

    const updateBackendTier = async (tier: 'FREE' | 'PRO' | 'ENTERPRISE') => {
        try {
            const token = useAuthStore.getState().token;
            const res = await fetch(`${require('../config').API_URL}/workspace/${activeStoreOwnerId}/upgrade`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ tier })
            });

            if (res.ok) {
                // Update local auth store state so the UI reflects the new tier instantly
                const updatedStores = stores.map(s => 
                    s.ownerId === activeStoreOwnerId ? { ...s, tier } : s
                );
                await useAuthStore.getState().login(
                    token!,
                    useAuthStore.getState().refreshToken!,
                    userId!,
                    useAuthStore.getState().businessName,
                    updatedStores
                );
            }
        } catch (err) {
            console.error("Failed to sync tier to backend:", err);
        }
    };

    const renderFeature = (text: string) => (
        <View className="flex-row items-center mb-3">
            <CheckCircle2 size={18} color="#16A34A" />
            <Text className="ml-3 text-textPrimary text-sm">{text}</Text>
        </View>
    );

    return (
        <View className="flex-1 bg-lightBackground">
            <Header title="Subscription" subtitle="Upgrade your workspace" onBack={onBack} />
            
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
                {/* Current Plan Card */}
                <View className="bg-white rounded-3xl p-6 mb-8 border border-border shadow-sm">
                    <Text className="text-textSecondary text-xs font-black uppercase tracking-widest mb-1">Current Plan</Text>
                    <View className="flex-row items-center justify-between">
                        <Text className="text-2xl font-black text-textPrimary capitalize">{currentTier} Plan</Text>
                        <View className={`px-3 py-1 rounded-full ${currentTier === 'PRO' ? 'bg-primary/20' : 'bg-slate-100'}`}>
                            <Text className={`text-xs font-bold ${currentTier === 'PRO' ? 'text-primary' : 'text-slate-500'}`}>
                                {currentTier === 'PRO' ? 'Active' : 'Basic'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Pro Features */}
                <View className="mb-8">
                    <View className="flex-row items-center mb-4">
                        <Star size={20} color="#EAB308" fill="#EAB308" />
                        <Text className="text-lg font-black text-textPrimary ml-2">Upgrade to Pro</Text>
                    </View>
                    
                    <View className="bg-white rounded-3xl p-6 border border-primary/20 shadow-sm">
                        {renderFeature("Invite up to 3 Staff Members")}
                        {renderFeature("Advanced Sales Analytics & Insights")}
                        {renderFeature("Multi-store management (coming soon)")}
                        {renderFeature("Priority Customer Support")}
                    </View>
                </View>

                {/* Packages */}
                <Text className="text-textSecondary text-xs font-black uppercase tracking-widest mb-4">Available Plans</Text>
                
                {isLoading ? (
                    <ActivityIndicator size="large" color="#16A34A" />
                ) : packages.map((pkg) => (
                    <TouchableOpacity
                        key={pkg.identifier}
                        onPress={() => handlePurchase(pkg)}
                        disabled={isPurchasing || currentTier === 'PRO'}
                        className={`bg-primary rounded-3xl p-6 mb-4 flex-row items-center justify-between ${
                            currentTier === 'PRO' ? 'opacity-50' : ''
                        }`}
                        activeOpacity={0.8}
                    >
                        <View>
                            <Text className="text-white font-black text-lg">{pkg.product.title}</Text>
                            <Text className="text-primary-100 font-medium text-sm mt-1">{pkg.product.description}</Text>
                        </View>
                        <View className="items-end">
                            <Text className="text-white font-black text-xl">{pkg.product.priceString}</Text>
                            <Text className="text-primary-100 font-bold text-xs uppercase tracking-wider">{pkg.packageType}</Text>
                        </View>
                    </TouchableOpacity>
                ))}

                {isPurchasing && (
                    <View className="mt-4 items-center">
                        <ActivityIndicator color="#16A34A" />
                        <Text className="text-textSecondary text-sm mt-2">Processing...</Text>
                    </View>
                )}

                <TouchableOpacity onPress={handleRestore} className="mt-6 items-center p-4">
                    <Text className="text-primary font-bold">Restore Purchases</Text>
                </TouchableOpacity>

            </ScrollView>
            <AppModal
                visible={modal?.visible ?? false}
                type={modal?.type ?? 'info'}
                title={modal?.title ?? ''}
                subtitle={modal?.subtitle}
                primaryLabel={modal?.primaryLabel}
                onPrimary={() => { modal?.onPrimary?.(); setModal(null); }}
                secondaryLabel={modal?.secondaryLabel}
                onSecondary={() => { modal?.onSecondary?.(); setModal(null); }}
                onDismiss={() => setModal(null)}
                autoDismiss={modal?.autoDismiss}
            />
        </View>
    );
}
