import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList, Modal, ScrollView, Image, ActivityIndicator, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProducts, createProduct, updateProduct, updateProductQuantity, deleteProduct, getStockSummary } from '../db';
import { 
    Plus, 
    X, 
    Edit3, 
    Trash2, 
    ScanLine,
    Package,
    AlertTriangle,
    CheckCircle,
    Search,
    Filter,
    Camera,
    PackageSearch,
    PackageCheck
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config';
import { useAuthStore } from '../store/authStore';
import { useSyncStore } from '../store/syncStore';
import { v4 as uuidv4 } from 'uuid';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { formatCurrency, getInitials } from '../utils/format';
import { fetchProductFromOFF } from '../services/offService';
import { Header } from './SellScreen';
import * as ImagePicker from 'expo-image-picker';
import { useCurrency } from '../hooks/useCurrency';

interface InventoryScreenProps {
    initialBarcode?: string | null;
    onClearBarcode?: () => void;
}

type LookupState = 'idle' | 'local' | 'kasham' | 'global' | 'done';
type StockTab = 'inStock' | 'addQuantity';

const debounce = (func: Function, delay: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

export default function InventoryScreen({ initialBarcode, onClearBarcode }: InventoryScreenProps) {
    const [products, setProducts] = useState<any[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [summary, setSummary] = useState({ total: 0, low: 0, outOfStock: 0 });
    const [modalVisible, setModalVisible] = useState(false);
    const [scannerVisible, setScannerVisible] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isLookingUp, setIsLookingUp] = useState(false);
    
    // Filter Sheet State
    const [filterVisible, setFilterVisible] = useState(false);
    const [sortBy, setSortBy] = useState<string>('Newest');

    // Form state
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [barcode, setBarcode] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [lookupState, setLookupState] = useState<LookupState>('idle');
    const [activeTab, setActiveTab] = useState<StockTab>('inStock');
    const [nameSuggestions, setNameSuggestions] = useState<any[]>([]);
    const [showLookupStatus, setShowLookupStatus] = useState(false);

    const [newQuantity, setNewQuantity] = useState('');
    const [showAddQtySheet, setShowAddQtySheet] = useState(false);
    const [selectedPendingProduct, setSelectedPendingProduct] = useState<any>(null);

    const [permission, requestPermission] = useCameraPermissions();
    const { token, userId } = useAuthStore();
    const { isOnline } = useSyncStore();
    const { symbol, formatAmount } = useCurrency();
    const insets = useSafeAreaInsets();

    const loadData = useCallback(async () => {
        if (!userId) return;
        const threshold = parseInt((await AsyncStorage.getItem('lowStockThreshold')) || '5', 10);
        const [rows, sum] = await Promise.all([
            getProducts(userId),
            getStockSummary(userId, threshold),
        ]);
        setProducts(rows);
        setSummary(sum);
    }, [userId]);

    useEffect(() => { loadData(); }, [loadData]);

    // loadData triggered by useEffect above

    useEffect(() => {
        if (initialBarcode) {
            handleLookupFlow(initialBarcode);
            onClearBarcode?.();
        }
    }, [initialBarcode]);

    useEffect(() => {
        let result = [...products];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(searchQuery)));
        }

        if (sortBy === 'Low Stock') result.sort((a, b) => a.stock - b.stock);
        if (sortBy === 'Most Sold') result.sort((a, b) => b.stock - a.stock); // Proxy for now
        if (sortBy === 'Price (High)') result.sort((a, b) => b.price - a.price);
        if (sortBy === 'Price (Low)') result.sort((a, b) => a.price - b.price);
        // Newest is default by id/db order, handled natively
        
        setFilteredProducts(result);
    }, [searchQuery, products, sortBy]);

    const handleLookupFlow = async (barcodeData: string) => {
        const local = products.find(p => p.barcode === barcodeData);
        if (local) {
            handleEdit(local);
            Alert.alert('Found', `${local.name} is already in your stock.`);
            return;
        }

        setEditingProduct(null);
        setBarcode(barcodeData);
        setName('');
        setPrice('');
        setStock('');
        setImageUri(null);

        if (!isOnline) {
            Alert.alert('Offline', "You're offline — barcode lookup unavailable. Fill in details manually.");
            setModalVisible(true);
            return;
        }

        try {
            // 1. Check KashAm Shared Catalogue
            setLookupState('kasham');
            const res = await fetch(`${API_BASE_URL}/catalogue/lookup/${barcodeData}`);
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setName(data.name);
                    if (data.imageUrl) setImageUri(data.imageUrl);
                    setLookupState('done');
                    setModalVisible(true);
                    return;
                }
            }

            // 2. Fallback to Open Food Facts
            setLookupState('global');
            const offData = await fetchProductFromOFF(barcodeData);
            if (offData && offData.name) {
                setName(offData.name);
                if (offData.image) setImageUri(offData.image);
                
                // 3. Contribute to KashAm Catalogue so others can find it
                fetch(`${API_BASE_URL}/catalogue/contribute`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        barcode: barcodeData,
                        name: offData.name,
                        imageUrl: offData.image,
                        brand: offData.brand,
                        category: offData.category
                    })
                }).catch(e => console.log('Contribution failed', e));
            }
        } catch (e) {
            console.error('Lookup failed', e);
        } finally {
            setShowLookupStatus(false);
            setLookupState('done');
            setModalVisible(true);
        }
    };

    const searchProductName = React.useMemo(
        () =>
          debounce(async (query: string) => {
            if (query.length < 2 || !isOnline) {
                setNameSuggestions([]);
                return;
            }
            try {
              const res = await fetch(
                `${API_BASE_URL}/catalogue/search?q=${encodeURIComponent(query)}`
              );
              const results = await res.json();
              setNameSuggestions(results.slice(0, 5));
            } catch {
              setNameSuggestions([]);
            }
          }, 300),
        [isOnline]
    );

    const handleNameChange = (text: string) => {
        setName(text);
        searchProductName(text);
    };

    const selectSuggestion = (suggestion: any) => {
        setName(suggestion.name);
        if (suggestion.imageUrl) setImageUri(suggestion.imageUrl);
        if (suggestion.barcode) setBarcode(suggestion.barcode);
        setNameSuggestions([]);
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });
        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        if (!permission?.granted) {
            requestPermission();
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });
        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleEdit = (product: any) => {
        setEditingProduct(product);
        setName(product.name);
        setPrice(product.price.toString());
        setStock(product.stock.toString());
        setBarcode(product.barcode || '');
        setImageUri(product.image_uri || null);
        setModalVisible(true);
    };

    const handleDelete = (product: any) => {
        Alert.alert('Delete', `Are you sure you want to delete ${product.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                await deleteProduct(product.id);
                loadData();
            }}
        ]);
    };

    const handleSave = async () => {
        if (!name || !price || !stock) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        setLoading(true);
        try {
            if (editingProduct) {
                await updateProduct(editingProduct.id, name, parseFloat(price), parseInt(stock, 10), barcode || null, imageUri, editingProduct.cost_price);
            } else {
                await createProduct(uuidv4(), name, parseFloat(price), parseInt(stock, 10), barcode || null, imageUri, userId || '', null);
            }
            setModalVisible(false);
            loadData();
        } catch (e: any) {
            if (e.message?.includes('UNIQUE')) {
                Alert.alert('Error', 'Barcode already exists');
            } else {
                Alert.alert('Error', 'Could not save product');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOpenScanner = () => {
        if (!permission?.granted) {
            requestPermission();
            return;
        }
        setScannerVisible(true);
    };

    return (
        <View className="flex-1 bg-lightBackground">
            <Header title="Stock Hub" subtitle="Manage your inventory" showBell={true} />

            {isLookingUp && (
                <View className="bg-primaryLight p-2 items-center flex-row justify-center gap-2">
                    <ActivityIndicator size="small" color="#16A34A" />
                    <Text className="text-primaryDark text-xs font-bold">Looking up barcode globally...</Text>
                </View>
            )}

            {/* MINI DASHBOARD ROW */}
            <View className="flex-row gap-4 px-6 pt-6 pb-4">
                <View className="flex-1 bg-white p-4 rounded-3xl border border-border shadow-sm">
                    <Package size={20} color="#0F172A" />
                    <Text className="text-textPrimary font-black text-xl mt-2">{summary.total}</Text>
                    <Text className="text-textSecondary text-[10px] font-bold uppercase tracking-tight">Total Stock</Text>
                </View>
                <View className="flex-1 bg-accentLight p-4 rounded-3xl border border-accent/20 shadow-sm">
                    <AlertTriangle size={20} color="#92400E" />
                    <Text className="text-accent font-black text-xl mt-2">{summary.low}</Text>
                    <Text className="text-[#92400E] text-[10px] font-bold uppercase tracking-tight">Low Stock</Text>
                </View>
                <View className="flex-1 bg-dangerLight p-4 rounded-3xl border border-danger/20 shadow-sm">
                    <CheckCircle size={20} color="#EF4444" />
                    <Text className="text-danger font-black text-xl mt-2">{summary.outOfStock}</Text>
                    <Text className="text-danger text-[10px] font-bold uppercase tracking-tight">Out</Text>
                </View>
            </View>

            {/* Tabs */}
            <View className="flex-row px-6 border-b border-border mb-4">
                <TouchableOpacity 
                    onPress={() => setActiveTab('inStock')}
                    className={`flex-1 py-3 items-center border-b-2 ${activeTab === 'inStock' ? 'border-primary' : 'border-transparent'}`}
                >
                    <Text className={`font-black ${activeTab === 'inStock' ? 'text-primary' : 'text-textSecondary'}`}>In Stock</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    onPress={() => setActiveTab('addQuantity')}
                    className={`flex-1 py-3 items-center border-b-2 ${activeTab === 'addQuantity' ? 'border-primary' : 'border-transparent'}`}
                >
                    <View className="flex-row items-center gap-2">
                        <Text className={`font-black ${activeTab === 'addQuantity' ? 'text-primary' : 'text-textSecondary'}`}>Add Quantity</Text>
                        {summary.outOfStock > 0 && (
                            <View className="bg-danger px-1.5 py-0.5 rounded-full">
                                <Text className="text-white text-[10px] font-bold">{summary.outOfStock}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            {/* Search Bar & Filter */}
            <View className="px-6 pb-4 flex-row gap-3">
                <View className="flex-1 flex-row items-center bg-white rounded-2xl px-4 h-12 shadow-sm border border-border">
                    <Search size={18} color="#64748B" />
                    <TextInput placeholderTextColor="#94A3B8"
                        className="flex-1 ml-3 text-textPrimary font-bold text-sm"
                        placeholder="Search stock..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <X size={16} color="#64748B" />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity onPress={() => setFilterVisible(true)} className="bg-white w-12 h-12 rounded-2xl items-center justify-center border border-border shadow-sm">
                    <Filter size={20} color="#0F172A" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={activeTab === 'inStock' ? filteredProducts.filter(p => p.stock > 0) : products.filter(p => p.stock <= 0)}
                keyExtractor={p => p.id}
                contentContainerStyle={{ padding: 24, paddingBottom: 150 }}
                ListEmptyComponent={
                    <View className="items-center justify-center py-20 opacity-30">
                        {activeTab === 'inStock' ? (
                            <>
                                <Package size={64} color="#64748B" />
                                <Text className="font-bold mt-4 text-center text-lg">Your stock is empty.{'\n'}Tap + to add items.</Text>
                            </>
                        ) : (
                            <>
                                <PackageCheck size={64} color="#64748B" />
                                <Text className="font-bold mt-4 text-center text-lg">No products pending quantity.</Text>
                            </>
                        )}
                    </View>
                }
                renderItem={({ item }) => (
                    <View className="bg-white rounded-2xl p-4 mb-4 border border-border flex-row items-center shadow-sm">
                        <View className="w-12 h-12 bg-primaryLight rounded-full items-center justify-center overflow-hidden border border-border/50">
                            {item.image_uri ? (
                                <Image source={{ uri: item.image_uri }} className="w-full h-full" resizeMode="cover" />
                            ) : (
                                <Text className="text-primaryDark font-bold text-lg">{getInitials(item.name)}</Text>
                            )}
                        </View>
                        <View className="flex-1 ml-4">
                            <Text className="font-bold text-sm text-textPrimary" numberOfLines={1}>{item.name}</Text>
                            <Text className="text-primary font-black mt-0.5">{formatAmount(item.price)}</Text>
                        </View>
                        <View className="flex-col items-end gap-2">
                            <View className={`px-2 py-1 rounded-lg ${item.stock <= 5 ? 'bg-dangerLight' : 'bg-lightBackground'}`}>
                                <Text className={`text-[10px] font-black ${item.stock <= 5 ? 'text-danger' : 'text-textSecondary'}`}>{item.stock} left</Text>
                            </View>
                            <View className="flex-row gap-2">
                                {activeTab === 'inStock' ? (
                                    <TouchableOpacity onPress={() => handleEdit(item)} className="p-1.5 bg-lightBackground rounded-lg">
                                        <Edit3 size={16} color="#64748B" />
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity 
                                        onPress={() => { setSelectedPendingProduct(item); setShowAddQtySheet(true); }} 
                                        className="bg-primary px-3 py-1.5 rounded-lg"
                                    >
                                        <Text className="text-white text-[10px] font-black">Add quantity</Text>
                                    </TouchableOpacity>
                                )}
                                {activeTab === 'inStock' && (
                                    <TouchableOpacity onPress={() => handleDelete(item)} className="p-1.5 bg-dangerLight rounded-lg">
                                        <Trash2 size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                )}
            />

            {/* FAB */}
            <View className="absolute bottom-6 right-6 items-end">
                <TouchableOpacity 
                    onPress={handleOpenScanner}
                    className="bg-textPrimary w-12 h-12 rounded-2xl items-center justify-center shadow-lg mb-3"
                >
                    <ScanLine size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity 
                    onPress={() => { setEditingProduct(null); setName(''); setPrice(''); setStock(''); setBarcode(''); setImageUri(null); setModalVisible(true); }}
                    className="bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-primary/30"
                >
                    <Plus size={28} color="white" />
                </TouchableOpacity>
            </View>

            {/* ADD QUANTITY MODAL */}
            <Modal visible={showAddQtySheet} transparent animationType="slide">
                <View className="flex-1 bg-black/40 justify-end">
                    <View className="bg-white rounded-t-[40px] p-6 pb-12">
                        <View className="w-12 h-1.5 bg-border rounded-full self-center mb-6" />
                        <Text className="text-xl font-black text-center mb-4">
                            How many {selectedPendingProduct?.name} do you have?
                        </Text>
                        <TextInput
                            keyboardType="numeric"
                            placeholder="e.g. 24"
                            placeholderTextColor="#94A3B8"
                            value={newQuantity}
                            onChangeText={setNewQuantity}
                            className="bg-lightBackground border border-border p-4 rounded-xl font-bold mb-6 text-center text-2xl text-textPrimary"
                            autoFocus
                        />
                        <View className="flex-row gap-3">
                            <TouchableOpacity 
                                onPress={() => setShowAddQtySheet(false)}
                                className="flex-1 bg-lightBackground py-4 rounded-2xl items-center"
                            >
                                <Text className="text-textPrimary font-black text-lg">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={async () => {
                                    if (!newQuantity) return;
                                    await updateProductQuantity(selectedPendingProduct.id, parseInt(newQuantity));
                                    setShowAddQtySheet(false);
                                    setNewQuantity('');
                                    loadData();
                                }}
                                className="flex-2 bg-primary py-4 rounded-2xl items-center"
                            >
                                <Text className="text-white font-black text-lg">Save Stock</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* SCANNER MODAL */}
            <Modal visible={scannerVisible} transparent animationType="slide">
                <View className="flex-1 bg-black justify-end">
                    <View className="flex-row items-center justify-between px-6 pt-12 pb-4">
                        <Text className="text-white font-black text-xl">Scan to Add/Edit</Text>
                        <TouchableOpacity onPress={() => setScannerVisible(false)} className="bg-white/20 p-2 rounded-full">
                            <X size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                    <View className="flex-1 items-center justify-center">
                        <View className="w-[80%] aspect-square rounded-3xl overflow-hidden border-4 border-primary">
                            <CameraView 
                                style={{ flex: 1 }}
                                facing="back"
                                onBarcodeScanned={({ data }) => {
                                    setScannerVisible(false);
                                    handleLookupFlow(data);
                                }} 
                                barcodeScannerSettings={{
                                    barcodeTypes: ['ean13', 'ean8', 'code128', 'upc_a', 'upc_e', 'qr']
                                }}
                            />
                        </View>
                        {showLookupStatus && lookupState !== 'idle' && lookupState !== 'done' && (
                            <View className="mt-6 flex-row items-center gap-3 bg-white/10 px-4 py-2 rounded-full">
                                <ActivityIndicator size="small" color="#16A34A" />
                                <Text className="text-white font-bold">
                                    {lookupState === 'local' && 'Searching your stock...'}
                                    {lookupState === 'kasham' && 'Checking KashAm database...'}
                                    {lookupState === 'global' && 'Checking global database...'}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ADD/EDIT PRODUCT SHEET */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View className="flex-1 bg-black/40 justify-end">
                    <View className="bg-white rounded-t-[40px] p-6" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
                        <View className="w-12 h-1.5 bg-border rounded-full self-center mb-6" />
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-2xl font-black text-textPrimary">{editingProduct ? 'Edit stock' : 'Add to Stock'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} className="bg-lightBackground p-2 rounded-full">
                                <X size={24} color="#0F172A" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <TouchableOpacity onPress={() => {
                                Alert.alert("Product Image", "Choose an option", [
                                    { text: "Take Photo", onPress: takePhoto },
                                    { text: "Choose from Gallery", onPress: pickImage },
                                    { text: "Cancel", style: "cancel" }
                                ])
                            }} className="w-24 h-24 bg-lightBackground rounded-3xl items-center justify-center border border-border self-center mb-6 overflow-hidden shadow-sm">
                                {imageUri ? (
                                    <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
                                ) : (
                                    <View className="items-center justify-center">
                                        <Camera size={24} color="#64748B" />
                                        <Text className="text-[10px] text-textSecondary font-bold mt-1">Add Image</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            <View className="z-50">
                                <TextInput placeholderTextColor="#94A3B8" 
                                    className="bg-lightBackground border border-border p-4 rounded-xl font-bold mb-1 text-textPrimary" 
                                    placeholder="Product Name" 
                                    value={name} 
                                    onChangeText={handleNameChange} 
                                />
                                {nameSuggestions.length > 0 && (
                                    <View className="bg-white border border-border rounded-xl mb-4 shadow-lg overflow-hidden">
                                        {nameSuggestions.map((s, idx) => (
                                            <TouchableOpacity 
                                                key={idx} 
                                                onPress={() => selectSuggestion(s)}
                                                className="flex-row items-center p-3 border-b border-border last:border-0"
                                            >
                                                <View className="w-8 h-8 bg-primaryLight rounded-full items-center justify-center overflow-hidden mr-3">
                                                    {s.imageUrl ? (
                                                        <Image source={{ uri: s.imageUrl }} className="w-full h-full" />
                                                    ) : (
                                                        <Text className="text-primaryDark font-bold text-xs">{getInitials(s.name)}</Text>
                                                    )}
                                                </View>
                                                <View>
                                                    <Text className="font-bold text-sm text-textPrimary">{s.name}</Text>
                                                    {s.brand && <Text className="text-[10px] text-textSecondary">{s.brand}</Text>}
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                            <View className="flex-row gap-4 mb-4">
                                <TextInput placeholderTextColor="#94A3B8" 
                                    className="flex-1 bg-lightBackground border border-border p-4 rounded-xl font-bold text-textPrimary" 
                                    placeholder={`Price (${symbol})`}
                                    keyboardType="numeric" 
                                    value={price} 
                                    onChangeText={setPrice} 
                                />
                                <TextInput placeholderTextColor="#94A3B8" 
                                    className="flex-1 bg-lightBackground border border-border p-4 rounded-xl font-bold text-textPrimary" 
                                    placeholder="Quantity" 
                                    keyboardType="numeric" 
                                    value={stock} 
                                    onChangeText={setStock} 
                                />
                            </View>
                            <View className="flex-row items-center bg-lightBackground border border-border rounded-xl pr-2 mb-8">
                                <TextInput placeholderTextColor="#94A3B8" 
                                    className="flex-1 p-4 font-bold text-textPrimary" 
                                    placeholder="Barcode (Optional)" 
                                    value={barcode} 
                                    onChangeText={setBarcode} 
                                />
                                <TouchableOpacity onPress={() => { setModalVisible(false); handleOpenScanner(); }} className="p-3">
                                    <ScanLine size={20} color="#16A34A" />
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity onPress={handleSave} className="bg-primary py-4 rounded-2xl items-center shadow-sm">
                                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg">{editingProduct ? 'Update Product' : 'Save Product'}</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* FILTER SHEET */}
            <Modal visible={filterVisible} transparent animationType="slide">
                <View className="flex-1 bg-black/40 justify-end">
                    <View className="bg-white rounded-t-[40px] p-6 pb-12">
                        <View className="w-12 h-1.5 bg-border rounded-full self-center mb-6" />
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-2xl font-black">Sort & Filter</Text>
                            <TouchableOpacity onPress={() => setFilterVisible(false)} className="bg-lightBackground p-2 rounded-xl">
                                <X size={24} color="black" />
                            </TouchableOpacity>
                        </View>
                        <Text className="text-textSecondary text-[10px] font-black uppercase mb-3">Sort by</Text>
                        <View className="flex-row flex-wrap gap-2 mb-8">
                            {['Newest', 'Low Stock', 'Most Sold', 'Price (High)', 'Price (Low)'].map(s => (
                                <TouchableOpacity 
                                    key={s} 
                                    onPress={() => setSortBy(s)}
                                    className={`px-4 py-3 rounded-xl border ${sortBy === s ? 'bg-primary border-primary' : 'bg-lightBackground border-border'}`}
                                >
                                    <Text className={`font-black text-[12px] ${sortBy === s ? 'text-white' : 'text-textPrimary'}`}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity onPress={() => setFilterVisible(false)} className="bg-textPrimary py-4 rounded-2xl items-center">
                            <Text className="text-white font-black text-lg">Apply Filters</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
