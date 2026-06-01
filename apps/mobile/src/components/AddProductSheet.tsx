import React, { useState, useEffect } from 'react';
import {
    View, Text, Modal, TextInput, TouchableOpacity,
    Alert, Image, ActivityIndicator, ActionSheetIOS, Platform, ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ScanLine, Camera } from 'lucide-react-native';
import { createProduct } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from '../store/authStore';
import { pickImageFromGallery, takePhoto } from '../utils/pickImage';
import { uploadImageToCloudinary } from '../utils/uploadImage';
import { useSyncStore } from '../store/syncStore';

interface AddProductSheetProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialBarcode?: string;
    onOpenScanner?: () => void;
}

export default function AddProductSheet({ visible, onClose, onSuccess, initialBarcode, onOpenScanner }: AddProductSheetProps) {
    const insets = useSafeAreaInsets();
    const { userId } = useAuthStore();
    const { isOnline } = useSyncStore();
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [barcode, setBarcode] = useState(initialBarcode || '');
    const [localImageUri, setLocalImageUri] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Validation error states
    const [nameError, setNameError] = useState('');
    const [priceError, setPriceError] = useState('');
    const [stockError, setStockError] = useState('');

    const handleGlobalLookup = async (barcodeData: string) => {
        if (!barcodeData || !isOnline) return;
        try {
            const res = await fetch(`${API_URL}/catalogue/lookup/${barcodeData}`);
            if (res.ok && res.status !== 204) {
                const contentType = res.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await res.json();
                    if (data) {
                        setName(data.name);
                        if (nameError) setNameError('');
                        if (data.imageUrl) setLocalImageUri(data.imageUrl);
                        return;
                    }
                }
            }
        } catch (e) {
            console.log('Global lookup failed', e);
        }
    };

    useEffect(() => {
        if (initialBarcode && isOnline) {
            handleGlobalLookup(initialBarcode);
        }
    }, [initialBarcode, isOnline]);

    const handlePickImage = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options: ['Cancel', 'Take Photo', 'Choose from Gallery'], cancelButtonIndex: 0 },
                async (idx) => {
                    if (idx === 1) { const uri = await takePhoto(); if (uri) setLocalImageUri(uri); }
                    if (idx === 2) { const uri = await pickImageFromGallery(); if (uri) setLocalImageUri(uri); }
                }
            );
        } else {
            Alert.alert('Add Photo', 'Choose an option', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Take Photo', onPress: async () => { const uri = await takePhoto(); if (uri) setLocalImageUri(uri); } },
                { text: 'Choose from Gallery', onPress: async () => { const uri = await pickImageFromGallery(); if (uri) setLocalImageUri(uri); } },
            ]);
        }
    };

    const resetForm = () => {
        setName(''); setPrice(''); setStock(''); setBarcode(''); setLocalImageUri(null);
        setNameError(''); setPriceError(''); setStockError('');
    };

    const handleSave = async () => {
        let valid = true;
        setNameError('');
        setPriceError('');
        setStockError('');

        if (!name.trim()) {
            setNameError('Product name is required');
            valid = false;
        }
        if (!price.trim()) {
            setPriceError('Price is required');
            valid = false;
        } else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
            setPriceError('Enter a valid price');
            valid = false;
        }
        if (!stock.trim()) {
            setStockError('Quantity is required');
            valid = false;
        } else if (isNaN(parseInt(stock, 10)) || parseInt(stock, 10) < 0) {
            setStockError('Enter a valid quantity');
            valid = false;
        }

        if (!valid) return;

        setSaving(true);
        try {
            let imageUrl: string | null = null;
            if (localImageUri) {
                if (!isOnline) {
                    // If it's a remote URL (from catalogue), keep it. If it's local, warn.
                    if (!localImageUri.startsWith('http')) {
                        Alert.alert('Offline', "You're offline — the image will not be uploaded.");
                    } else {
                        imageUrl = localImageUri;
                    }
                } else if (!localImageUri.startsWith('http')) {
                    setUploading(true);
                    imageUrl = await uploadImageToCloudinary(localImageUri);
                    setUploading(false);
                } else {
                    imageUrl = localImageUri;
                }
            }
            await createProduct(uuidv4(), name, parseFloat(price), parseInt(stock, 10), barcode || null, imageUrl, userId || '', null);
            resetForm();
            onSuccess();
            onClose();
        } catch (e: any) {
            if (e.message?.includes('UNIQUE')) {
                Alert.alert('Error', 'A product with this barcode already exists.');
            } else {
                Alert.alert('Error', 'Could not save product');
            }
        } finally {
            setSaving(false); setUploading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 justify-end bg-black/40">
                <View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
                    <View className="w-12 h-1.5 bg-border rounded-full self-center mb-4" />
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-xl font-black text-textPrimary">Add to Stock</Text>
                        <TouchableOpacity onPress={onClose} className="p-2 bg-lightBackground rounded-full">
                            <X size={20} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Image Upload Area */}
                        <TouchableOpacity
                            onPress={handlePickImage}
                            className="self-center mb-6"
                            style={{ width: 120, height: 120 }}
                        >
                            {localImageUri ? (
                                <View style={{ width: 120, height: 120 }} className="rounded-2xl overflow-hidden">
                                    <Image source={{ uri: localImageUri }} style={{ width: 120, height: 120 }} />
                                    <TouchableOpacity
                                        onPress={() => setLocalImageUri(null)}
                                        className="absolute top-1 right-1 bg-black/60 rounded-full p-1"
                                    >
                                        <X size={12} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View
                                    className="rounded-2xl items-center justify-center bg-lightBackground"
                                    style={{ width: 120, height: 120, borderWidth: 2, borderStyle: 'dashed', borderColor: '#CBD5E1' }}
                                >
                                    <Camera size={28} color="#64748B" />
                                    <Text className="text-textSecondary text-xs font-bold mt-2">Add photo</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TextInput placeholderTextColor="#94A3B8"
                            className={`bg-lightBackground border p-4 rounded-xl font-bold mb-1 text-textPrimary ${nameError ? 'border-red-500' : 'border-border'}`}
                            placeholder="Product Name"
                            value={name}
                            onChangeText={(t) => { setName(t); if (nameError) setNameError(''); }}
                        />
                        {nameError ? <Text className="text-red-500 font-bold text-[10px] mb-3 ml-1">{nameError}</Text> : <View className="h-2" />}

                        <View className="flex-row gap-3 mb-3">
                            <View className="flex-1">
                                <TextInput placeholderTextColor="#94A3B8"
                                    className={`w-full bg-lightBackground border p-4 rounded-xl font-bold text-textPrimary ${priceError ? 'border-red-500' : 'border-border'}`}
                                    placeholder="Price"
                                    keyboardType="numeric"
                                    value={price}
                                    onChangeText={(t) => { setPrice(t); if (priceError) setPriceError(''); }}
                                />
                                {priceError ? <Text className="text-red-500 font-bold text-[10px] mt-1 ml-1">{priceError}</Text> : null}
                            </View>
                            <View className="flex-1">
                                <TextInput placeholderTextColor="#94A3B8"
                                    className={`w-full bg-lightBackground border p-4 rounded-xl font-bold text-textPrimary ${stockError ? 'border-red-500' : 'border-border'}`}
                                    placeholder="Quantity"
                                    keyboardType="numeric"
                                    value={stock}
                                    onChangeText={(t) => { setStock(t); if (stockError) setStockError(''); }}
                                />
                                {stockError ? <Text className="text-red-500 font-bold text-[10px] mt-1 ml-1">{stockError}</Text> : null}
                            </View>
                        </View>
                        <View className="flex-row items-center bg-lightBackground border border-border rounded-xl pr-2 mb-6">
                            <TextInput placeholderTextColor="#94A3B8"
                                className="flex-1 p-4 font-bold text-textPrimary"
                                placeholder="Barcode (Optional)"
                                value={barcode}
                                onChangeText={setBarcode}
                            />
                            <TouchableOpacity onPress={onOpenScanner} className="p-3">
                                <ScanLine size={24} color="#16A34A" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving || uploading}
                            className={`w-full py-4 rounded-2xl items-center flex-row justify-center ${saving || uploading ? 'bg-primary/50' : 'bg-primary'}`}
                        >
                            {(saving || uploading) ? (
                                <>
                                    <ActivityIndicator color="white" size="small" />
                                    <Text className="text-white font-black text-lg ml-2">
                                        {uploading ? 'Uploading photo...' : 'Saving...'}
                                    </Text>
                                </>
                            ) : (
                                <Text className="text-white font-black text-lg">Save Product</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
