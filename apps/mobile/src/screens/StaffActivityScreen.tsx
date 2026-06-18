import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import {
    ArrowLeft,
    ShoppingCart,
    Package,
    RefreshCw,
    Tag,
    Clock,
    Wallet,
    ClipboardList,
} from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { buildHeaders } from '../services/syncService';
import { API_URL } from '../config';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityEntry {
    id: string;
    action: string;
    details: Record<string, any>;
    createdAt: string;
}

interface ActivitySummary {
    totalSales: number;
    totalRevenue: number;
    topAction: string | null;
    totalActions: number;
}

type Filter = 'today' | 'week' | 'month';

interface Props {
    memberId: string;
    memberName: string | null;
    memberRole: string;
    onBack: () => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    SALE_COMPLETED: { label: 'Completed a sale',    icon: ShoppingCart, color: '#16A34A' },
    PRODUCT_ADDED:  { label: 'Added a product',     icon: Package,      color: '#2563EB' },
    STOCK_UPDATED:  { label: 'Updated stock',        icon: RefreshCw,    color: '#D97706' },
    DISCOUNT_GIVEN: { label: 'Gave a discount',      icon: Tag,          color: '#EA580C' },
    DEBT_CREATED:   { label: 'Created a Pay Later',  icon: Clock,        color: '#EF4444' },
    PAYMENT_LOGGED: { label: 'Logged a payment',     icon: Wallet,       color: '#16A34A' },
};

const FILTER_LABELS: Record<Filter, string> = {
    today: 'Today',
    week:  'This Week',
    month: 'This Month',
};

const ROLE_COLORS: Record<string, string> = {
    OWNER:   '#7C5CFC',
    MANAGER: '#10B981',
    STAFF:   '#F59E0B',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1)   return 'Just now';
    if (diffMin < 60)  return `${diffMin}m ago`;
    if (diffHrs < 24)  return `${diffHrs}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function buildSubtitle(action: string, details: Record<string, any>): string {
    switch (action) {
        case 'SALE_COMPLETED':
            return `${details.itemCount ?? 0} item(s) · ₦${Number(details.amount || 0).toLocaleString()} · ${details.paymentMethod ?? 'Cash'}`;
        case 'PRODUCT_ADDED':
            return `${details.productName ?? 'Product'} · ₦${Number(details.sellingPrice || 0).toLocaleString()}`;
        case 'STOCK_UPDATED':
            return `${details.productName ?? 'Product'} · ${details.from ?? 0} → ${details.to ?? 0} units`;
        case 'DISCOUNT_GIVEN':
            return `₦${Number(details.discountAmount || 0).toLocaleString()} off`;
        case 'DEBT_CREATED':
            return `${details.customerName ?? 'Customer'} · ₦${Number(details.amount || 0).toLocaleString()}`;
        case 'PAYMENT_LOGGED':
            return `₦${Number(details.amount || 0).toLocaleString()} received`;
        default:
            return '';
    }
}

// ─── Shimmer Skeleton ─────────────────────────────────────────────────────────

function SkeletonRow() {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB' }} />
            <View style={{ flex: 1, gap: 6 }}>
                <View style={{ width: '60%', height: 12, borderRadius: 6, backgroundColor: '#E5E7EB' }} />
                <View style={{ width: '80%', height: 10, borderRadius: 6, backgroundColor: '#F1F5F9' }} />
            </View>
            <View style={{ width: 40, height: 10, borderRadius: 6, backgroundColor: '#F1F5F9' }} />
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function StaffActivityScreen({ memberId, memberName, memberRole, onBack }: Props) {
    const { token, activeStoreOwnerId, activeRole } = useAuthStore();
    const [filter, setFilter] = useState<Filter>('today');
    const [activities, setActivities] = useState<ActivityEntry[]>([]);
    const [summary, setSummary] = useState<ActivitySummary | null>(null);
    const [loading, setLoading] = useState(true);

    // Access control — only OWNER and MANAGER may view this screen
    const canView = activeRole === 'OWNER' || activeRole === 'MANAGER';

    const loadActivity = useCallback(async () => {
        if (!token || !activeStoreOwnerId || !canView) return;
        setLoading(true);
        try {
            const res = await fetch(
                `${API_URL}/workspaces/${activeStoreOwnerId}/members/${memberId}/activity?filter=${filter}`,
                { headers: buildHeaders(token, activeStoreOwnerId) },
            );
            if (res.ok) {
                const data = await res.json();
                setActivities(data.activities ?? []);
                setSummary(data.summary ?? null);
            }
        } catch (e) {
            console.error('Failed to load staff activity', e);
        } finally {
            setLoading(false);
        }
    }, [token, activeStoreOwnerId, memberId, filter, canView]);

    useEffect(() => {
        loadActivity();
    }, [loadActivity]);

    const displayName = memberName || 'Staff Member';
    const roleColor = ROLE_COLORS[memberRole] || '#64748B';

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <View className="flex-1 bg-lightBackground">
            {/* Header */}
            <View className="bg-white px-6 pt-14 pb-5 border-b border-border">
                <View className="flex-row items-center gap-4 mb-1">
                    <TouchableOpacity
                        onPress={onBack}
                        className="w-10 h-10 bg-lightBackground rounded-2xl items-center justify-center"
                    >
                        <ArrowLeft size={20} color="#0F172A" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-xl font-black text-textPrimary" numberOfLines={1}>
                            {displayName}
                        </Text>
                        <View
                            style={{
                                alignSelf: 'flex-start',
                                backgroundColor: roleColor + '20',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 8,
                                marginTop: 2,
                            }}
                        >
                            <Text style={{ color: roleColor, fontSize: 10, fontWeight: '800' }}>
                                {memberRole}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Access Denied */}
            {!canView ? (
                <View className="flex-1 items-center justify-center px-8">
                    <ClipboardList size={56} color="#94A3B8" />
                    <Text className="text-xl font-black text-textPrimary mt-4 text-center">
                        Access Restricted
                    </Text>
                    <Text className="text-textSecondary text-sm text-center mt-2 font-semibold">
                        Only owners and managers can view staff activity logs.
                    </Text>
                </View>
            ) : (
                <>
                    {/* Filter Tabs */}
                    <View className="flex-row bg-white border-b border-border px-6 gap-1 pt-2">
                        {(Object.keys(FILTER_LABELS) as Filter[]).map(f => (
                            <TouchableOpacity
                                key={f}
                                onPress={() => setFilter(f)}
                                className="pb-3 px-3"
                                style={{
                                    borderBottomWidth: 2,
                                    borderBottomColor: filter === f ? '#16A34A' : 'transparent',
                                }}
                            >
                                <Text
                                    className="text-sm font-bold"
                                    style={{ color: filter === f ? '#16A34A' : '#94A3B8' }}
                                >
                                    {FILTER_LABELS[f]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

                        {/* Summary Card */}
                        {summary && !loading && (
                            <View className="mx-6 mt-6 bg-white rounded-3xl p-5 border border-border shadow-sm">
                                <Text className="text-textSecondary text-[10px] font-black uppercase tracking-widest mb-3">
                                    {FILTER_LABELS[filter]} Summary
                                </Text>
                                <View className="flex-row gap-4">
                                    <View className="flex-1">
                                        <Text className="text-2xl font-black text-textPrimary">
                                            {summary.totalSales}
                                        </Text>
                                        <Text className="text-textSecondary text-xs font-semibold mt-0.5">
                                            Sales Made
                                        </Text>
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-2xl font-black text-primary">
                                            ₦{summary.totalRevenue.toLocaleString()}
                                        </Text>
                                        <Text className="text-textSecondary text-xs font-semibold mt-0.5">
                                            Revenue
                                        </Text>
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-2xl font-black text-textPrimary">
                                            {summary.totalActions}
                                        </Text>
                                        <Text className="text-textSecondary text-xs font-semibold mt-0.5">
                                            Total Actions
                                        </Text>
                                    </View>
                                </View>
                                {summary.topAction && ACTION_CONFIG[summary.topAction] && (
                                    <View className="mt-4 bg-lightBackground rounded-2xl p-3 flex-row items-center gap-2">
                                        <Text className="text-textSecondary text-[11px] font-semibold">
                                            Most frequent:
                                        </Text>
                                        <Text className="text-textPrimary text-[11px] font-black">
                                            {ACTION_CONFIG[summary.topAction].label}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Activity List */}
                        <View className="px-6 mt-5 mb-4">
                            <Text className="text-textSecondary text-[10px] font-black uppercase tracking-widest mb-3">
                                Activity Log
                            </Text>

                            {loading ? (
                                <View className="bg-white rounded-3xl overflow-hidden border border-border">
                                    <SkeletonRow />
                                    <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />
                                    <SkeletonRow />
                                    <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />
                                    <SkeletonRow />
                                </View>
                            ) : activities.length === 0 ? (
                                <View className="bg-white rounded-3xl py-16 items-center justify-center border border-border">
                                    <ClipboardList size={48} color="#CBD5E1" />
                                    <Text className="text-textPrimary font-black text-base mt-4">
                                        No activity yet
                                    </Text>
                                    <Text className="text-textSecondary text-sm text-center mt-1 font-semibold px-8">
                                        {displayName} has no recorded actions for this period.
                                    </Text>
                                </View>
                            ) : (
                                <View className="bg-white rounded-3xl overflow-hidden border border-border">
                                    {activities.map((item, index) => {
                                        const config = ACTION_CONFIG[item.action] ?? {
                                            label: item.action,
                                            icon: ClipboardList,
                                            color: '#64748B',
                                        };
                                        const Icon = config.icon;
                                        const subtitle = buildSubtitle(item.action, item.details);

                                        return (
                                            <View key={item.id}>
                                                <View className="flex-row items-center px-4 py-4 gap-3">
                                                    <View
                                                        style={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: 20,
                                                            backgroundColor: config.color + '18',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        <Icon size={18} color={config.color} />
                                                    </View>
                                                    <View className="flex-1">
                                                        <Text className="text-textPrimary font-bold text-sm">
                                                            {config.label}
                                                        </Text>
                                                        {subtitle ? (
                                                            <Text className="text-textSecondary text-[11px] font-semibold mt-0.5">
                                                                {subtitle}
                                                            </Text>
                                                        ) : null}
                                                    </View>
                                                    <Text className="text-textSecondary text-[10px] font-semibold">
                                                        {formatRelativeTime(item.createdAt)}
                                                    </Text>
                                                </View>
                                                {index < activities.length - 1 && (
                                                    <View style={{ height: 1, backgroundColor: '#F8FAFC', marginHorizontal: 16 }} />
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>

                    </ScrollView>
                </>
            )}
        </View>
    );
}
