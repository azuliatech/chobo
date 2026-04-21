import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { getDailySales } from '../db';
import { useSyncStore } from '../store/syncStore';

const formatMoney = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

export default function DashboardScreen() {
    const [summary, setSummary] = useState({ total: 0, count: 0, cash: 0, transfer: 0, pos: 0 });
    const { isOnline, isSyncing } = useSyncStore();

    const load = useCallback(async () => {
        const sales = await getDailySales();
        const total = sales.reduce((s: number, r: any) => s + r.total, 0);
        const count = sales.length;
        const cash = sales.filter((s: any) => s.payment_type === 'CASH').reduce((a: number, s: any) => a + s.total, 0);
        const transfer = sales.filter((s: any) => s.payment_type === 'TRANSFER').reduce((a: number, s: any) => a + s.total, 0);
        const pos = sales.filter((s: any) => s.payment_type === 'POS').reduce((a: number, s: any) => a + s.total, 0);
        setSummary({ total, count, cash, transfer, pos });
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>📊 Dashboard</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isOnline ? '#16a34a' : '#ef4444', marginRight: 6 }} />
                        <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                            {isOnline ? (isSyncing ? 'Syncing...' : 'Online') : 'Offline'}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity onPress={load} style={styles.refresh}><Text style={{ color: '#94a3b8' }}>↻ Refresh</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                <View style={styles.hero}>
                    <Text style={styles.heroLabel}>Today's Revenue</Text>
                    <Text style={styles.heroAmount}>{formatMoney(summary.total)}</Text>
                    <Text style={styles.heroSub}>{summary.count} sale{summary.count !== 1 ? 's' : ''} completed</Text>
                </View>

                <Text style={styles.section}>PAYMENT BREAKDOWN</Text>
                <View style={styles.cards}>
                    {[
                        { icon: '💵', label: 'Cash', value: summary.cash },
                        { icon: '📲', label: 'Transfer', value: summary.transfer },
                        { icon: '💳', label: 'POS', value: summary.pos },
                    ].map(c => (
                        <View key={c.label} style={styles.card}>
                            <Text style={{ fontSize: 22 }}>{c.icon}</Text>
                            <Text style={styles.cardLabel}>{c.label}</Text>
                            <Text style={styles.cardValue}>{formatMoney(c.value)}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.motivation}>
                    <Text style={styles.motTitle}>Keep selling! 🚀</Text>
                    <Text style={styles.motSub}>Every transaction builds your business.</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a', paddingTop: Platform.OS === 'android' ? 44 : 50 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
    title: { fontSize: 22, fontWeight: '800', color: '#f8fafc' },
    refresh: { padding: 8 },
    hero: { backgroundColor: '#16a34a', borderRadius: 20, padding: 24, marginBottom: 20, alignItems: 'center' },
    heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '600', marginBottom: 4 },
    heroAmount: { color: '#fff', fontSize: 42, fontWeight: '900', letterSpacing: -1 },
    heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 6 },
    section: { color: '#94a3b8', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
    cards: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    card: { flex: 1, backgroundColor: '#1e293b', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    cardLabel: { color: '#94a3b8', fontSize: 12, marginTop: 6, marginBottom: 4 },
    cardValue: { color: '#f8fafc', fontWeight: '800', fontSize: 14 },
    motivation: { backgroundColor: '#1e3a5f', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#2563eb33' },
    motTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
    motSub: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
});
