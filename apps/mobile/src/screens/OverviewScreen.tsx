import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { getDailyStats, getTopSoldProducts } from '../db';
import { Header } from './SellScreen';
import { getInitials } from '../utils/format';
import { useAuthStore } from '../store/authStore';
import { useCurrency } from '../hooks/useCurrency';
import { 
    TrendingUp, 
    TrendingDown, 
    Wallet, 
    Receipt, 
    ArrowUpRight, 
    Package,
    Lock,
    Sparkles
} from 'lucide-react-native';

type TimeFilter = 'today' | 'week' | 'month';

export default function OverviewScreen() {
    const [filter, setFilter] = useState<TimeFilter>('today');
    const [stats, setStats] = useState<any>(null);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const { userId } = useAuthStore();
    const { formatAmount } = useCurrency();

    const loadData = useCallback(async () => {
        if (!userId) return;
        setRefreshing(true);
        try {
            const [sData, topP] = await Promise.all([
                getDailyStats(userId, filter),
                getTopSoldProducts(userId, 5)
            ]);
            setStats(sData);
            setTopProducts(topP);
        } catch (e) {
            console.error(e);
        } finally {
            setRefreshing(false);
        }
    }, [filter, userId]);

    useEffect(() => { loadData(); }, [loadData]);

    const getRevenueMix = () => {
        const total = stats?.revenue || 1; // avoid /0
        const cash = stats?.methods?.cash || 0;
        const transfer = stats?.methods?.transfer || 0;
        const pos = stats?.methods?.pos || 0;
        const payLater = stats?.methods?.payLater || 0;
        
        return [
            { label: 'Cash', value: cash, color: '#16A34A', flex: Math.max((cash/total)*100, 2) },
            { label: 'Transfer', value: transfer, color: '#2563EB', flex: Math.max((transfer/total)*100, 2) },
            { label: 'POS', value: pos, color: '#8B5CF6', flex: Math.max((pos/total)*100, 2) },
            { label: 'Credit', value: payLater, color: '#EF4444', flex: Math.max((payLater/total)*100, 2) },
        ].filter(i => i.value > 0);
    };

    return (
        <View className="flex-1 bg-lightBackground">
            <Header title="Business Overview" subtitle="Track your growth" showBell={true} />

            {/* TIME FILTER TABS */}
            <View className="px-6 py-4 bg-white border-b border-border z-10 flex-row gap-2">
                {[
                    { key: 'today', label: 'Today' },
                    { key: 'week', label: '7 Days' },
                    { key: 'month', label: '30 Days' }
                ].map(f => (
                    <TouchableOpacity
                        key={f.key}
                        onPress={() => setFilter(f.key as TimeFilter)}
                        className={`flex-1 py-2.5 rounded-xl border ${filter === f.key ? 'bg-primary border-primary' : 'bg-lightBackground border-border'}`}
                    >
                        <Text className={`text-center font-black text-[10px] uppercase tracking-wider ${filter === f.key ? 'text-white' : 'text-textSecondary'}`}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView 
                className="flex-1" 
                contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
                showsVerticalScrollIndicator={false}
            >
                {/* HERO CARD */}
                <View className="bg-textPrimary p-6 rounded-[32px] mb-6 shadow-xl relative overflow-hidden">
                    <View className="absolute -top-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
                    <View className="absolute -bottom-8 -left-8 w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
                    
                    <Text className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Total Revenue</Text>
                    <Text className="text-white font-black text-4xl mb-4">{formatAmount(stats?.revenue || 0)}</Text>
                    
                    <View className="flex-row items-center">
                        <View className="flex-row items-center bg-primary/20 px-2.5 py-1 rounded-full mr-2 border border-primary/30">
                            <TrendingUp size={12} color="#4ADE80" />
                            <Text className="text-[#4ADE80] font-black text-[10px] ml-1">+12.5%</Text>
                        </View>
                        <Text className="text-white/60 font-bold text-xs">vs last {filter === 'today' ? 'period' : filter}</Text>
                    </View>
                </View>

                {/* 2x2 METRIC GRID */}
                <View className="flex-row flex-wrap gap-4 mb-8">
                    <View className="w-[47%] bg-white p-4 rounded-3xl border border-border shadow-sm">
                        <View className="w-8 h-8 rounded-full bg-primaryLight items-center justify-center mb-3">
                            <Receipt size={16} color="#16A34A" />
                        </View>
                        <Text className="text-textSecondary text-[10px] font-bold uppercase mb-1">Sales Count</Text>
                        <Text className="text-textPrimary font-black text-2xl">{stats?.count || 0}</Text>
                    </View>
                    <View className="w-[47%] bg-white p-4 rounded-3xl border border-border shadow-sm">
                        <View className="w-8 h-8 rounded-full bg-dangerLight items-center justify-center mb-3">
                            <TrendingDown size={16} color="#EF4444" />
                        </View>
                        <Text className="text-textSecondary text-[10px] font-bold uppercase mb-1">Debt Issued</Text>
                        <Text className="text-textPrimary font-black text-2xl">{formatAmount(stats?.debt || 0)}</Text>
                    </View>
                </View>

                {/* PAYMENT BREAKDOWN */}
                <View className="mb-8">
                    <Text className="text-textPrimary font-black text-lg mb-4">Payment Mix</Text>
                    
                    {stats?.revenue > 0 ? (
                        <>
                            <View className="h-4 flex-row rounded-full overflow-hidden mb-4">
                                {getRevenueMix().map((m, idx) => (
                                    <View key={idx} style={{ flex: m.flex, backgroundColor: m.color, borderRightWidth: idx < getRevenueMix().length-1 ? 2 : 0, borderColor: 'white' }} />
                                ))}
                            </View>
                            <View className="flex-row flex-wrap gap-y-3">
                                {getRevenueMix().map((m, idx) => (
                                    <View key={idx} className="w-[50%] flex-row items-center">
                                        <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: m.color }} />
                                        <Text className="text-textSecondary font-bold text-xs uppercase w-16">{m.label}</Text>
                                        <Text className="text-textPrimary font-black text-xs">{formatAmount(m.value)}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    ) : (
                        <View className="bg-lightBackground p-4 rounded-2xl items-center border border-border">
                            <Text className="text-textSecondary font-bold text-xs">No payment data yet.</Text>
                        </View>
                    )}
                </View>

                {/* TOP 5 PRODUCTS */}
                <View className="mb-8">
                    <Text className="text-textPrimary font-black text-lg mb-4">Top Sellers</Text>
                    {topProducts.length === 0 && (
                        <View className="bg-lightBackground p-6 rounded-2xl items-center border border-border">
                            <Package size={24} color="#64748B" />
                            <Text className="text-textSecondary font-bold mt-2">No products sold yet.</Text>
                        </View>
                    )}
                    {topProducts.map((p, idx) => (
                        <View key={idx} className="bg-white p-4 rounded-2xl mb-2 flex-row items-center border border-border shadow-sm">
                            <View className="w-10 h-10 rounded-xl bg-primaryLight items-center justify-center overflow-hidden mr-4">
                                {p.image_uri ? (
                                    <Image source={{ uri: p.image_uri }} className="w-full h-full" />
                                ) : (
                                    <Text className="text-primaryDark font-black">{getInitials(p.name)}</Text>
                                )}
                            </View>
                            <View className="flex-1">
                                <Text className="font-bold text-sm text-textPrimary" numberOfLines={1}>{p.name}</Text>
                                <Text className="text-textSecondary text-[10px] font-black uppercase mt-0.5">{p.total_qty} Units Sold</Text>
                            </View>
                            <Text className="text-primary font-black text-sm">{formatAmount(p.price * p.total_qty)}</Text>
                        </View>
                    ))}
                </View>

                {/* AI INSIGHT BANNER (LOCKED) */}
                <View className="bg-gradient-to-r from-accent/20 to-primary/20 p-6 rounded-[32px] border border-accent/30 relative overflow-hidden">
                    <View className="flex-row items-start justify-between mb-2 z-10">
                        <View className="flex-row items-center bg-white/50 px-2 py-1 rounded-full border border-white">
                            <Sparkles size={12} color="#92400E" />
                            <Text className="text-[#92400E] font-black text-[9px] uppercase ml-1 tracking-widest">KashAm AI</Text>
                        </View>
                        <View className="bg-textPrimary p-2 rounded-full">
                            <Lock size={14} color="white" />
                        </View>
                    </View>
                    <Text className="text-textPrimary font-black text-xl mb-2 z-10">Smart Restock Insights</Text>
                    <Text className="text-textSecondary font-bold text-xs leading-5 mb-4 z-10">
                        Unlock predictive analytics to know exactly what to restock before you run out.
                    </Text>
                    <TouchableOpacity className="bg-textPrimary py-3 rounded-xl items-center z-10 w-32 shadow-lg shadow-black/20">
                        <Text className="text-white font-black text-xs">Upgrade Plan</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}
