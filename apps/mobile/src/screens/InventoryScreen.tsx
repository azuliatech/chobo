import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    Modal, TextInput, Platform, Alert
} from 'react-native';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../db';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const COLORS = {
    bg: '#0f172a', card: '#1e293b', green: '#16a34a', greenLight: '#22c55e',
    yellow: '#eab308', red: '#ef4444', text: '#f8fafc', muted: '#94a3b8', border: '#334155',
};

export default function InventoryScreen() {
    const [products, setProducts] = useState<any[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    const loadProducts = useCallback(async () => {
        const rows = await getProducts();
        setProducts(rows);
    }, []);

    useEffect(() => { loadProducts(); }, [loadProducts]);

    const openAdd = () => {
        setEditingId(null); setName(''); setPrice(''); setStock('');
        setModalVisible(true);
    };

    const openEdit = (p: any) => {
        setEditingId(p.id); setName(p.name); setPrice(String(p.price)); setStock(String(p.stock));
        setModalVisible(true);
    };

    const save = async () => {
        if (!name || !price) return;
        if (editingId) {
            await updateProduct(editingId, name, parseFloat(price), parseInt(stock) || 0);
        } else {
            await createProduct(uuidv4(), name, parseFloat(price), parseInt(stock) || 0);
        }
        setModalVisible(false);
        loadProducts();
    };

    const remove = (p: any) => {
        Alert.alert('Delete', `Remove "${p.name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => { await deleteProduct(p.id); loadProducts(); } }
        ]);
    };

    const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>📦 Inventory</Text>
                <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
                    <Text style={styles.addBtnText}>+ Add</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.searchWrap}>
                <TextInput style={styles.search} placeholder="Search products..." placeholderTextColor={COLORS.muted} value={search} onChangeText={setSearch} />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={p => p.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item: p }) => (
                    <View style={styles.row}>
                        <TouchableOpacity style={styles.info} onPress={() => openEdit(p)}>
                            <Text style={styles.productName}>{p.name}</Text>
                            <Text style={styles.productSub}>₦{p.price.toLocaleString()} • {p.stock} in stock</Text>
                        </TouchableOpacity>
                        <View style={styles.actions}>
                            <View style={[styles.stockBadge, { backgroundColor: p.stock > 5 ? '#14532d' : p.stock > 0 ? '#713f12' : '#450a0a' }]}>
                                <Text style={[styles.stockNum, { color: p.stock > 5 ? COLORS.greenLight : p.stock > 0 ? COLORS.yellow : COLORS.red }]}>{p.stock}</Text>
                            </View>
                            <TouchableOpacity onPress={() => remove(p)} style={{ padding: 6 }}>
                                <Text style={{ color: COLORS.red, fontSize: 16 }}>🗑</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                ListEmptyComponent={<View style={styles.empty}><Text style={{ fontSize: 40 }}>📦</Text><Text style={styles.emptyText}>No products yet</Text></View>}
            />

            <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.overlay}>
                    <View style={styles.sheet}>
                        <Text style={styles.sheetTitle}>{editingId ? 'Edit Product' : 'Add Product'}</Text>
                        <TextInput style={styles.input} placeholder="Product name *" placeholderTextColor={COLORS.muted} value={name} onChangeText={setName} />
                        <TextInput style={styles.input} placeholder="Price (₦) *" placeholderTextColor={COLORS.muted} value={price} onChangeText={setPrice} keyboardType="numeric" />
                        <TextInput style={styles.input} placeholder="Stock quantity" placeholderTextColor={COLORS.muted} value={stock} onChangeText={setStock} keyboardType="numeric" />
                        <TouchableOpacity style={styles.saveBtn} onPress={save}>
                            <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Add Product'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a', paddingTop: Platform.OS === 'android' ? 44 : 50 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
    title: { fontSize: 22, fontWeight: '800', color: '#f8fafc' },
    addBtn: { backgroundColor: '#16a34a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
    addBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    searchWrap: { paddingHorizontal: 16, paddingBottom: 12 },
    search: { backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#f8fafc', fontSize: 15, borderWidth: 1, borderColor: '#334155' },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
    info: { flex: 1 },
    productName: { color: '#f8fafc', fontWeight: '700', fontSize: 16 },
    productSub: { color: '#94a3b8', fontSize: 13, marginTop: 3 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stockBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    stockNum: { fontWeight: '800', fontSize: 14 },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyText: { color: '#94a3b8', marginTop: 12, fontSize: 16 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    sheetTitle: { fontSize: 20, fontWeight: '800', color: '#f8fafc', marginBottom: 20 },
    input: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#f8fafc', fontSize: 15, borderWidth: 1, borderColor: '#334155', marginBottom: 14 },
    saveBtn: { backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    cancelBtn: { alignItems: 'center', paddingVertical: 12 },
    cancelText: { color: '#94a3b8', fontSize: 14 },
});
