import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, TextInput, Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { getTransactionHistory, getDailyStats, getOutstandingDebts, markDebtPaid, createPaymentLog, getSaleItems } from '../db';
import { Header } from './SellScreen';
import { formatCurrency, formatDate, formatTime } from '../utils/format';
import { 
    Search, 
    Filter, 
    Plus, 
    X, 
    ChevronDown, 
    ChevronUp,
    CheckCircle, 
    Clock, 
    User,
    Phone,
    Banknote,
    Receipt,
    ArrowLeftRight,
    CreditCard,
    Share2
} from 'lucide-react-native';
import { v4 as uuidv4 } from 'uuid';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useCurrency } from '../hooks/useCurrency';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { ReceiptView } from '../components/ReceiptView';

export default function TransactionScreen() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [debts, setDebts] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'owing'>('all');
    
    // Expand/Collapse state mapping saleId -> items
    const [expandedRows, setExpandedRows] = useState<Record<string, any[]>>({});

    // Log Payment Modal State
    const [logPaymentModal, setLogPaymentModal] = useState(false);
    const [logAmount, setLogAmount] = useState('');
    const [logSenderName, setLogSenderName] = useState('');
    const [logSenderPhone, setLogSenderPhone] = useState('');
    const [logMethod, setLogMethod] = useState('TRANSFER');
    const [logNotes, setLogNotes] = useState('');
    const [logLoading, setLogLoading] = useState(false);

    const { userId, businessName } = useAuthStore();
    const { symbol: currencySymbol, formatAmount } = useCurrency();
    const insets = useSafeAreaInsets();

    const receiptRef = React.useRef<View>(null);
    const [sharingTx, setSharingTx] = useState<any>(null);
    const [sharingItems, setSharingItems] = useState<any[]>([]);
    const [isCapturing, setIsCapturing] = useState(false);

    const loadData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const [tRows, dRows, sData] = await Promise.all([
                getTransactionHistory(userId),
                getOutstandingDebts(userId),
                getDailyStats(userId, 'today')
            ]);
            setTransactions(tRows);
            setDebts(dRows);
            setStats(sData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleMarkPaid = async (debtId: string) => {
        Alert.alert('Mark as Paid', 'Has this customer paid in full?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Yes, Paid', style: 'default', onPress: async () => {
                await markDebtPaid(debtId);
                await loadData();
            }}
        ]);
    };

    const handleLogPayment = async () => {
        if (!logAmount) {
            Alert.alert('Required', 'Please enter an amount.');
            return;
        }
        setLogLoading(true);
        try {
            await createPaymentLog(
                uuidv4(),
                parseFloat(logAmount),
                logSenderName || null,
                logSenderPhone || null,
                logMethod,
                'Manual Payment Log',
                logNotes || null,
                userId || ''
            );
            setLogPaymentModal(false);
            setLogAmount('');
            setLogSenderName('');
            setLogSenderPhone('');
            setLogNotes('');
            await loadData();
        } catch (e) {
            Alert.alert('Error', 'Failed to log payment.');
        } finally {
            setLogLoading(false);
        }
    };

    const toggleRow = async (saleId: string) => {
        if (expandedRows[saleId]) {
            // Collapse
            const next = { ...expandedRows };
            delete next[saleId];
            setExpandedRows(next);
        } else {
            // Expand
            const items = await getSaleItems(saleId);
            setExpandedRows({ ...expandedRows, [saleId]: items });
        }
    };

    const filteredTransactions = useMemo(() => {
        let list = transactions;
        if (searchQuery) {
            list = list.filter(t => 
                (t.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.customer_phone || '').includes(searchQuery)
            );
        }
        return list;
    }, [transactions, searchQuery]);

    const filteredDebts = useMemo(() => {
        let list = debts;
        if (searchQuery) {
            list = list.filter(d => 
                (d.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (d.customer_phone || '').includes(searchQuery)
            );
        }
        return list;
    }, [debts, searchQuery]);

    const getDaysOverdue = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        return days;
    };

    const handleShareReceipt = async (transaction: any) => {
        setIsCapturing(true);
        const items = await getSaleItems(transaction.id);
        setSharingTx(transaction);
        setSharingItems(items);
        
        // Wait a tick for ReceiptView to render
        setTimeout(async () => {
            try {
                if (receiptRef.current) {
                    const uri = await captureRef(receiptRef, {
                        format: 'jpg',
                        quality: 0.8,
                    });
                    
                    const isAvailable = await Sharing.isAvailableAsync();
                    if (isAvailable) {
                        await Sharing.shareAsync(uri, { UTI: 'public.jpeg', mimeType: 'image/jpeg' });
                    } else {
                        Alert.alert('Error', 'Sharing is not available on this device');
                    }
                }
            } catch (error) {
                console.error("View shot error:", error);
                // Fallback to text
                const lines = items.map(i => `${i.product_name} x${i.quantity} — ${currencySymbol}${formatCurrency(i.price * i.quantity, currencySymbol).replace(currencySymbol, '')}`);
                const message = `Receipt from ${businessName || 'KashAm'}\n\n${lines.join('\n')}\n\nTotal: ${currencySymbol}${formatCurrency(transaction.total, currencySymbol).replace(currencySymbol, '')}`;
                Share.share({ message });
            } finally {
                setIsCapturing(false);
                setSharingTx(null);
                setSharingItems([]);
            }
        }, 100);
    };

    return (
        <View className="flex-1 bg-lightBackground">
            <Header title="Ledger" subtitle="Manage your daily transactions" showBell={true} />
            
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* 1. MINI DASHBOARD */}
                <View className="px-6 py-6 flex-row gap-4">
                    <View className="flex-1 bg-primaryLight p-4 rounded-3xl border border-primary/20 shadow-sm">
                        <Text className="text-textSecondary text-[10px] font-bold uppercase tracking-tight mb-2">Total Revenue</Text>
                        <Text className="text-primaryDark font-black text-xl">{formatAmount(stats?.revenue || 0)}</Text>
                    </View>
                    <View className="flex-1 bg-dangerLight p-4 rounded-3xl border border-danger/20 shadow-sm">
                        <Text className="text-danger text-[10px] font-bold uppercase tracking-tight mb-2">Debt Owed</Text>
                        <Text className="text-danger font-black text-xl">{formatAmount(stats?.debt || 0)}</Text>
                    </View>
                </View>

                {/* MIX BREAKDOWN */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6 mb-8 gap-3" contentContainerStyle={{ paddingRight: 48 }}>
                    {Object.entries(stats?.methods || {}).map(([key, val]) => (
                        <View key={key} className="bg-white px-4 py-3 rounded-2xl border border-border shadow-sm flex-row items-center">
                            <View className="w-2 h-2 rounded-full bg-primary mr-2" />
                            <Text className="text-textSecondary font-bold text-[10px] uppercase mr-3">{key}</Text>
                            <Text className="text-textPrimary font-black text-sm">{formatAmount(val as number)}</Text>
                        </View>
                    ))}
                </ScrollView>

                {/* TABS */}
                <View className="flex-row px-6 gap-3 mb-6">
                    <TouchableOpacity
                        onPress={() => setFilterType('all')}
                        className={`flex-1 py-3 rounded-xl border ${filterType === 'all' ? 'bg-primary border-primary' : 'bg-white border-border'}`}
                    >
                        <Text className={`text-center font-black text-xs uppercase ${filterType === 'all' ? 'text-white' : 'text-textPrimary'}`}>All Payments</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setFilterType('owing')}
                        className={`flex-1 py-3 rounded-xl border flex-row items-center justify-center gap-2 ${filterType === 'owing' ? 'bg-danger border-danger' : 'bg-white border-border'}`}
                    >
                        <Text className={`font-black text-xs uppercase ${filterType === 'owing' ? 'text-white' : 'text-textPrimary'}`}>Owing</Text>
                        {debts.length > 0 && (
                            <View className="bg-white/20 px-1.5 py-0.5 rounded-full">
                                <Text className={`text-[10px] font-bold ${filterType === 'owing' ? 'text-white' : 'text-danger'}`}>{debts.length}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View className="px-6 mb-6">
                    <View className="flex-row items-center bg-white border border-border rounded-xl px-4 py-1 h-12 shadow-sm">
                        <Search size={18} color="#64748B" />
                        <TextInput placeholderTextColor="#94A3B8" 
                            className="flex-1 ml-3 text-sm font-bold text-textPrimary" 
                            placeholder="Search customer name or phone..." 
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <X size={16} color="#64748B" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* LIST CONTENT */}
                {loading ? (
                    <View className="py-16 items-center"><ActivityIndicator color="#16A34A" /></View>
                ) : filterType === 'all' ? (
                    <View className="px-6 mb-12">
                        {filteredTransactions.length === 0 && (
                            <View className="py-16 items-center opacity-30">
                                <Receipt size={48} color="#64748B" />
                                <Text className="font-bold mt-4 text-center text-base">No transactions found.</Text>
                            </View>
                        )}
                        {filteredTransactions.map(t => {
                            const isExpanded = !!expandedRows[t.id];
                            return (
                                <View key={t.id} className="bg-white rounded-2xl mb-4 border border-border shadow-sm overflow-hidden">
                                    <TouchableOpacity 
                                        onPress={() => toggleRow(t.id)}
                                        className="p-4 flex-row items-center"
                                    >
                                        <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${t.payment_type === 'PAY_LATER' ? 'bg-dangerLight' : 'bg-primaryLight'}`}>
                                            <Receipt size={24} color={t.payment_type === 'PAY_LATER' ? '#EF4444' : '#16A34A'} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-bold text-sm text-textPrimary">{t.customer_name || 'Guest Customer'}</Text>
                                            <Text className="text-textSecondary text-[10px] font-bold uppercase mt-1">{t.payment_type} · {formatTime(t.timestamp)}</Text>
                                        </View>
                                        <View className="items-end mr-3">
                                            <Text className="text-primary font-black text-sm">{formatAmount(t.total)}</Text>
                                            <Text className={`text-[10px] font-black uppercase mt-1 ${t.payment_type === 'PAY_LATER' ? 'text-danger' : 'text-primary'}`}>
                                                {t.payment_type === 'PAY_LATER' ? 'OWING' : 'PAID'}
                                            </Text>
                                        </View>
                                        {isExpanded ? <ChevronUp size={20} color="#64748B" /> : <ChevronDown size={20} color="#64748B" />}
                                    </TouchableOpacity>
                                    
                                    {isExpanded && (
                                        <View className="bg-lightBackground px-6 py-4 border-t border-border/50">
                                            <Text className="text-textSecondary text-[10px] font-black uppercase tracking-widest mb-3">Items Summary</Text>
                                            {expandedRows[t.id]?.map((item, idx) => (
                                                <View key={idx} className="flex-row justify-between py-1.5">
                                                    <Text className="font-bold text-xs text-textPrimary flex-1">{item.product_name}</Text>
                                                    <Text className="text-textSecondary font-bold text-xs mx-4">x{item.quantity}</Text>
                                                    <Text className="font-black text-xs text-textPrimary">{formatAmount(item.price * item.quantity)}</Text>
                                                </View>
                                            ))}
                                                <View className="mt-4 flex-row items-center justify-between">
                                                    {t.customer_phone ? (
                                                        <View className="flex-row items-center">
                                                            <Phone size={14} color="#64748B" />
                                                            <Text className="text-textSecondary text-xs font-bold ml-2">{t.customer_phone}</Text>
                                                        </View>
                                                    ) : <View />}
                                                    <TouchableOpacity 
                                                        onPress={() => handleShareReceipt(t)}
                                                        disabled={isCapturing}
                                                        className="flex-row items-center bg-primary/10 px-3 py-1.5 rounded-lg"
                                                    >
                                                        {isCapturing && sharingTx?.id === t.id ? (
                                                            <ActivityIndicator size="small" color="#16A34A" />
                                                        ) : (
                                                            <>
                                                                <Share2 size={14} color="#16A34A" />
                                                                <Text className="text-primary font-bold text-xs ml-1.5">Receipt</Text>
                                                            </>
                                                        )}
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    <View className="px-6 mb-12">
                        {filteredDebts.length === 0 && (
                            <View className="py-16 items-center opacity-30">
                                <CheckCircle size={48} color="#16A34A" />
                                <Text className="font-bold mt-4 text-center text-base">Awesome, no one owes you money!</Text>
                            </View>
                        )}
                        {filteredDebts.map(d => {
                            const daysOverdue = getDaysOverdue(d.created_at);
                            return (
                                <View key={d.id} className="bg-dangerLight/20 border border-danger/20 rounded-2xl p-4 mb-4">
                                    <View className="flex-row justify-between items-start mb-4">
                                        <View className="flex-1">
                                            <Text className="font-bold text-base text-[#991B1B]">{d.customer_name}</Text>
                                            {d.customer_phone && <Text className="text-[#991B1B]/70 text-xs font-bold mt-1">{d.customer_phone}</Text>}
                                        </View>
                                        <View className="items-end">
                                            <Text className="font-black text-lg text-danger">{formatAmount(d.amount_owed)}</Text>
                                            <Text className="text-[#991B1B]/60 text-[10px] font-bold uppercase mt-1">
                                                {daysOverdue === 0 ? 'Today' : `${daysOverdue} days overdue`}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity 
                                        onPress={() => handleMarkPaid(d.id)}
                                        className="bg-danger py-3 rounded-xl items-center"
                                    >
                                        <Text className="text-white font-black text-sm">Mark as Paid</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* LOG PAYMENT FAB */}
            <TouchableOpacity 
                onPress={() => setLogPaymentModal(true)}
                className="absolute bottom-6 right-6 bg-textPrimary w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-black/30 z-50"
            >
                <Plus size={28} color="white" />
            </TouchableOpacity>

            {/* LOG PAYMENT MODAL */}
            <Modal visible={logPaymentModal} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-black/40 justify-end">
                    <View className="bg-white rounded-t-[40px] pt-4" style={{ paddingBottom: Math.max(insets.bottom, 24), maxHeight: '90%' }}>
                        <View className="w-12 h-1.5 bg-border rounded-full self-center mb-6" />
                        <View className="flex-row justify-between items-center px-6 mb-6">
                            <Text className="text-2xl font-black text-textPrimary">Log Payment</Text>
                            <TouchableOpacity onPress={() => setLogPaymentModal(false)} className="bg-lightBackground p-2 rounded-full">
                                <X size={24} color="#0F172A" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false} className="px-6">
                            <TextInput placeholderTextColor="#94A3B8" 
                                className="bg-lightBackground border border-border p-4 rounded-xl font-black text-xl mb-4 text-primary" 
                                placeholder={`Amount (${currencySymbol})`}
                                keyboardType="numeric" 
                                value={logAmount} 
                                onChangeText={setLogAmount} 
                            />
                            
                            <View className="mb-4">
                                <TextInput placeholderTextColor="#94A3B8" 
                                    className="bg-lightBackground border border-border p-4 rounded-xl font-bold mb-3 text-textPrimary" 
                                    placeholder="Sender Name (Optional)" 
                                    value={logSenderName} 
                                    onChangeText={setLogSenderName} 
                                />
                                <TextInput placeholderTextColor="#94A3B8" 
                                    className="bg-lightBackground border border-border p-4 rounded-xl font-bold text-textPrimary" 
                                    placeholder="Phone Number (Optional)" 
                                    keyboardType="phone-pad" 
                                    value={logSenderPhone} 
                                    onChangeText={setLogSenderPhone} 
                                />
                            </View>

                            <Text className="text-textSecondary text-[10px] font-black uppercase mb-3 mt-2">Payment Method</Text>
                            <View className="flex-row gap-2 mb-6">
                                {[
                                    { key: 'CASH', icon: Banknote, label: 'Cash' },
                                    { key: 'TRANSFER', icon: ArrowLeftRight, label: 'Transfer' },
                                    { key: 'POS', icon: CreditCard, label: 'POS' }
                                ].map(m => (
                                    <TouchableOpacity 
                                        key={m.key} 
                                        onPress={() => setLogMethod(m.key)}
                                        className={`flex-1 p-3 rounded-xl border items-center justify-center ${logMethod === m.key ? 'bg-primaryLight border-primary' : 'bg-white border-border'}`}
                                    >
                                        <m.icon size={20} color={logMethod === m.key ? '#16A34A' : '#64748B'} />
                                        <Text className={`font-black text-[10px] mt-2 ${logMethod === m.key ? 'text-primaryDark' : 'text-textSecondary'}`}>{m.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TextInput placeholderTextColor="#94A3B8" 
                                className="bg-lightBackground border border-border p-4 rounded-xl font-bold mb-8 text-textPrimary min-h-[100px]" 
                                placeholder="Notes (Optional)" 
                                multiline
                                textAlignVertical="top"
                                value={logNotes} 
                                onChangeText={setLogNotes} 
                            />

                            <TouchableOpacity 
                                onPress={handleLogPayment} 
                                disabled={logLoading}
                                className="bg-primary py-4 rounded-2xl items-center shadow-sm"
                            >
                                {logLoading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg">Save Payment Log</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
            <ReceiptView 
                ref={receiptRef} 
                businessName={businessName || 'KashAm Store'} 
                transaction={sharingTx} 
                items={sharingItems} 
                currencySymbol={currencySymbol} 
            />
        </View>
    );
}
