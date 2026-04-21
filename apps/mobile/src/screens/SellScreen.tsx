import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Modal, FlatList, ScrollView, Platform
} from 'react-native';
import { getProducts, createSale, createSaleItem, decrementStock } from '../db';
import { useCartStore, PaymentType } from '../store/cartStore';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const COLORS = {
    bg: '#0f172a', card: '#1e293b', green: '#16a34a', greenLight: '#22c55e',
    yellow: '#eab308', red: '#ef4444', text: '#f8fafc', muted: '#94a3b8', border: '#334155',
};

const formatMoney = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

export default function SellScreen() {
    const [products, setProducts] = useState<any[]>([]);
    const [cartVisible, setCartVisible] = useState(false);
    const [successVisible, setSuccessVisible] = useState(false);
    const { items, total, addItem, removeItem, clearCart } = useCartStore();

    const loadProducts = useCallback(async () => {
        const rows = await getProducts();
        setProducts(rows);
    }, []);

    useEffect(() => { loadProducts(); }, [loadProducts]);

    const handleSale = async (paymentType: PaymentType) => {
        if (items.length === 0) return;
        try {
            const saleId = uuidv4();
            await createSale(saleId, total, paymentType);
            for (const item of items) {
                await createSaleItem(uuidv4(), saleId, item.productId, item.quantity, item.price);
                await decrementStock(item.productId, item.quantity);
            }
            clearCart();
            setCartVisible(false);
            setSuccessVisible(true);
            await loadProducts();
            setTimeout(() => setSuccessVisible(false), 2000);
        } catch (e) { console.error('Sale failed', e); }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.shopName}>KashAm 💚</Text>
                {items.length > 0 && (
                    <TouchableOpacity style={styles.cartBadge} onPress={() => setCartVisible(true)}>
                        <Text style={styles.cartBadgeText}>{items.length} item{items.length > 1 ? 's' : ''}  •  {formatMoney(total)}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {products.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={{ fontSize: 60 }}>📦</Text>
                    <Text style={styles.emptyText}>No products yet</Text>
                    <Text style={styles.emptySubText}>Add products in the Inventory tab</Text>
                </View>
            ) : (
                <FlatList
                    data={products}
                    numColumns={2}
                    keyExtractor={(p) => p.id}
                    contentContainerStyle={styles.grid}
                    renderItem={({ item: product }) => {
                        const inCart = items.find(i => i.productId === product.id);
                        return (
                            <TouchableOpacity
                                style={[styles.productTile, inCart ? { borderColor: COLORS.green, borderWidth: 2 } : {}]}
                                onPress={() => addItem({ id: product.id, name: product.name, price: product.price })}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.productName}>{product.name}</Text>
                                <Text style={styles.productPrice}>{formatMoney(product.price)}</Text>
                                <View style={styles.stockRow}>
                                    <View style={[styles.stockDot, { backgroundColor: product.stock > 5 ? COLORS.green : product.stock > 0 ? COLORS.yellow : COLORS.red }]} />
                                    <Text style={styles.stockText}>{product.stock} left</Text>
                                </View>
                                {inCart && (
                                    <View style={styles.qtyBadge}>
                                        <Text style={styles.qtyBadgeText}>{inCart.quantity}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    }}
                />
            )}

            <Modal visible={cartVisible} animationType="slide" transparent={true} onRequestClose={() => setCartVisible(false)}>
                <View style={styles.overlay}>
                    <View style={styles.bottomSheet}>
                        <Text style={styles.sheetTitle}>🧾 Cart</Text>
                        <ScrollView style={{ maxHeight: 200 }}>
                            {items.map(item => (
                                <View key={item.productId} style={styles.cartItem}>
                                    <View>
                                        <Text style={styles.cartItemName}>{item.name}</Text>
                                        <Text style={styles.cartItemPrice}>{formatMoney(item.price)} × {item.quantity}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => removeItem(item.productId)}>
                                        <Text style={{ color: COLORS.red, fontSize: 20 }}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalAmount}>{formatMoney(total)}</Text>
                        </View>
                        <Text style={styles.paymentLabel}>How did they pay?</Text>
                        <View style={styles.paymentButtons}>
                            {(['CASH', 'TRANSFER', 'POS'] as PaymentType[]).map(type => (
                                <TouchableOpacity key={type} style={styles.payBtn} onPress={() => handleSale(type)} activeOpacity={0.8}>
                                    <Text style={styles.payBtnText}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setCartVisible(false)}>
                            <Text style={styles.cancelText}>Back to selling</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {items.length > 0 && (
                <TouchableOpacity style={styles.checkoutBtn} onPress={() => setCartVisible(true)} activeOpacity={0.85}>
                    <Text style={styles.checkoutBtnText}>Checkout  {formatMoney(total)}</Text>
                </TouchableOpacity>
            )}

            {successVisible && (
                <View style={styles.successOverlay}>
                    <Text style={styles.successText}>✅ Sale Complete!</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: Platform.OS === 'android' ? 44 : 50 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
    shopName: { fontSize: 22, fontWeight: '800', color: COLORS.text },
    cartBadge: { backgroundColor: COLORS.green, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
    cartBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: 20, fontWeight: '700', color: COLORS.text },
    emptySubText: { color: COLORS.muted, marginTop: 4 },
    grid: { padding: 10 },
    productTile: { flex: 1, margin: 5, backgroundColor: COLORS.card, borderRadius: 16, padding: 16, minHeight: 110, borderWidth: 1, borderColor: COLORS.border },
    productName: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
    productPrice: { fontSize: 18, fontWeight: '800', color: COLORS.greenLight },
    stockRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    stockDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    stockText: { fontSize: 11, color: COLORS.muted },
    qtyBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: COLORS.green, borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    qtyBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    bottomSheet: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    sheetTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 16 },
    cartItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    cartItemName: { color: COLORS.text, fontWeight: '600', fontSize: 15 },
    cartItemPrice: { color: COLORS.muted, fontSize: 13, marginTop: 2 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 8 },
    totalLabel: { color: COLORS.muted, fontSize: 16 },
    totalAmount: { color: COLORS.greenLight, fontSize: 28, fontWeight: '900' },
    paymentLabel: { color: COLORS.muted, fontSize: 13, marginTop: 20, marginBottom: 10 },
    paymentButtons: { flexDirection: 'row', gap: 10 },
    payBtn: { flex: 1, backgroundColor: COLORS.green, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    payBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    cancelBtn: { marginTop: 14, alignItems: 'center', padding: 10 },
    cancelText: { color: COLORS.muted, fontSize: 14 },
    checkoutBtn: { margin: 16, backgroundColor: COLORS.green, borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
    checkoutBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
    successOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(22,163,74,0.92)' },
    successText: { fontSize: 28, fontWeight: '900', color: '#fff' },
});
