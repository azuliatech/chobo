import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Alert } from 'react-native';
import { db } from '../db';

export default function MoreScreen() {
    const clearAllData = () => {
        Alert.alert('Clear Data', 'This will delete ALL local data. Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear', style: 'destructive', onPress: async () => {
                    await db.execAsync('DELETE FROM sale_items');
                    await db.execAsync('DELETE FROM sales');
                    await db.execAsync('DELETE FROM products');
                }
            }
        ]);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>⚙️ More</Text>
            </View>
            <View style={{ padding: 16 }}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>About KashAm</Text>
                    <Text style={styles.cardSub}>v1.0.0 MVP • Offline-first POS for Nigerian retail</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>🔄 Sync Status</Text>
                    <Text style={styles.cardSub}>Background sync when internet available</Text>
                    <View style={styles.statusDot}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Offline Ready</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.dangerCard} onPress={clearAllData}>
                    <Text style={styles.dangerTitle}>🗑 Clear All Local Data</Text>
                    <Text style={styles.dangerSub}>Removes all products, sales, and records</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a', paddingTop: Platform.OS === 'android' ? 44 : 50 },
    header: { paddingHorizontal: 16, paddingBottom: 12 },
    title: { fontSize: 22, fontWeight: '800', color: '#f8fafc' },
    card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
    cardTitle: { color: '#f8fafc', fontWeight: '700', fontSize: 16, marginBottom: 4 },
    cardSub: { color: '#94a3b8', fontSize: 13 },
    statusDot: { marginTop: 10, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', backgroundColor: '#16a34a' },
    dangerCard: { backgroundColor: '#450a0a', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#ef4444' },
    dangerTitle: { color: '#f87171', fontWeight: '700', fontSize: 16, marginBottom: 4 },
    dangerSub: { color: '#94a3b8', fontSize: 13 },
});
