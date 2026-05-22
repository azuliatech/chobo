import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { ArrowLeft, Store, MapPin, ChevronRight, Package, LocateFixed, Banknote } from 'lucide-react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { useCurrency } from '../hooks/useCurrency';

const BUSINESS_TYPES = [
    'Provision Store',
    'Supermarket Minimart',
    'Pharmacy',
    'Food Vendor',
    'Boutique Clothing Store',
    'Electronics Phone Accessories',
    'Other'
];

export default function BusinessSettingsScreen({ onBack }: { onBack: () => void }) {
    const { businessName: storeBusinessName, setBusinessName: setStoreBusinessName } = useAuthStore();
    const { currency } = useCurrency();
    const [name, setName] = useState(storeBusinessName || '');
    const [businessType, setBusinessType] = useState('Provision Store');
    const [otherType, setOtherType] = useState('');
    const [location, setLocation] = useState('');
    const [lowStock, setLowStock] = useState('5');
    
    const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const [storedType, storedOtherType, storedLocation, storedLowStock] = await Promise.all([
                AsyncStorage.getItem('businessType'),
                AsyncStorage.getItem('businessOtherType'),
                AsyncStorage.getItem('businessLocation'),
                AsyncStorage.getItem('lowStockThreshold')
            ]);
            if (storedType) setBusinessType(storedType);
            if (storedOtherType) setOtherType(storedOtherType);
            if (storedLocation) setLocation(storedLocation);
            if (storedLowStock) setLowStock(storedLowStock);
        } catch (e) {
            console.error('Failed to load business settings', e);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await setStoreBusinessName(name);
            await AsyncStorage.setItem('businessType', businessType);
            await AsyncStorage.setItem('businessOtherType', otherType);
            await AsyncStorage.setItem('businessLocation', location);
            await AsyncStorage.setItem('lowStockThreshold', lowStock);
            Alert.alert('Success', 'Business settings saved successfully!');
        } catch (e) {
            Alert.alert('Error', 'Could not save business settings');
        } finally {
            setLoading(false);
        }
    };

    const handleGetLocation = async () => {
        setLocating(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Permission to access location was denied');
                return;
            }

            let loc = await Location.getCurrentPositionAsync({});
            let geocode = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude
            });
            
            if (geocode.length > 0) {
                const place = geocode[0];
                const locStr = `${place.city || place.subregion || ''}, ${place.country || ''}`.replace(/^, /, '');
                setLocation(locStr);
            } else {
                setLocation(`${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
            }
        } catch (e) {
            Alert.alert('Location Error', 'Could not fetch your location.');
        } finally {
            setLocating(false);
        }
    };

    return (
        <View className="flex-1 bg-lightBackground">
            <View className="flex-row items-center px-6 pt-12 pb-4 bg-white border-b border-border shadow-sm">
                <TouchableOpacity onPress={onBack} className="w-10 h-10 bg-lightBackground rounded-full items-center justify-center mr-4">
                    <ArrowLeft size={20} color="#0F172A" />
                </TouchableOpacity>
                <Text className="text-xl font-black text-textPrimary">Business Settings</Text>
            </View>

            <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
                <View className="bg-white rounded-3xl p-6 border border-border shadow-sm mb-6">
                    <View className="mb-6">
                        <Text className="text-textSecondary text-[10px] font-black uppercase mb-2">Store Name</Text>
                        <View className="flex-row items-center bg-lightBackground border border-border rounded-xl px-4 h-14">
                            <Store size={18} color="#64748B" />
                            <TextInput placeholderTextColor="#94A3B8" 
                                className="flex-1 ml-3 font-bold text-textPrimary" 
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    </View>

                    <View className="mb-6 relative">
                        <Text className="text-textSecondary text-[10px] font-black uppercase mb-2">Business Type</Text>
                        <TouchableOpacity 
                            onPress={() => setTypeDropdownOpen(!typeDropdownOpen)}
                            className="bg-lightBackground border border-border rounded-xl px-4 h-14 flex-row items-center justify-between"
                        >
                            <Text className="font-bold text-textPrimary">{businessType}</Text>
                            <ChevronRight size={16} color="#64748B" style={{ transform: [{ rotate: typeDropdownOpen ? '90deg' : '0deg' }] }} />
                        </TouchableOpacity>

                        {typeDropdownOpen && (
                            <View className="absolute top-[80px] left-0 right-0 bg-white border border-border shadow-lg rounded-xl z-50">
                                {BUSINESS_TYPES.map(bt => (
                                    <TouchableOpacity 
                                        key={bt} 
                                        className="px-4 py-3 border-b border-border/50"
                                        onPress={() => { setBusinessType(bt); setTypeDropdownOpen(false); }}
                                    >
                                        <Text className={`font-bold ${businessType === bt ? 'text-primary' : 'text-textPrimary'}`}>{bt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        {businessType === 'Other' && !typeDropdownOpen && (
                            <View className="mt-3">
                                <TextInput placeholderTextColor="#94A3B8" 
                                    className="bg-lightBackground border border-border rounded-xl px-4 h-14 font-bold text-textPrimary"
                                    placeholder="Please specify"
                                    value={otherType}
                                    onChangeText={setOtherType}
                                />
                            </View>
                        )}
                    </View>

                    <View className="mb-2">
                        <Text className="text-textSecondary text-[10px] font-black uppercase mb-2">Location</Text>
                        <View className="flex-row items-center bg-lightBackground border border-border rounded-xl px-4 h-14">
                            <MapPin size={18} color="#64748B" />
                            <TextInput placeholderTextColor="#94A3B8" 
                                className="flex-1 ml-3 font-bold text-textPrimary" 
                                value={location}
                                onChangeText={setLocation}
                                placeholder="E.g. Lagos, Nigeria"
                            />
                            <TouchableOpacity onPress={handleGetLocation} className="p-2 bg-primary/10 rounded-lg">
                                {locating ? <ActivityIndicator size="small" color="#16A34A" /> : <LocateFixed size={18} color="#16A34A" />}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View className="bg-white rounded-3xl p-6 border border-border shadow-sm mb-6">
                    <View className="mb-6">
                        <Text className="text-textSecondary text-[10px] font-black uppercase mb-2">Currency</Text>
                        <View className="flex-row items-center bg-lightBackground border border-border rounded-xl px-4 h-14">
                            <Banknote size={18} color="#64748B" />
                            <View className="flex-1 ml-3">
                                <Text className="font-black text-textPrimary">{currency.symbol} — {currency.name}</Text>
                                <Text className="text-[10px] text-textSecondary font-bold mt-0.5" style={{ fontStyle: 'italic' }}>
                                    Set by country selection. Change in Personal Info.
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View>
                        <Text className="text-textSecondary text-[10px] font-black uppercase mb-2">Low Stock Threshold</Text>
                        <View className="flex-row items-center bg-lightBackground border border-border rounded-xl px-4 h-14">
                            <Package size={18} color="#64748B" />
                            <TextInput placeholderTextColor="#94A3B8" 
                                className="flex-1 ml-3 font-bold text-textPrimary" 
                                value={lowStock}
                                onChangeText={setLowStock}
                                keyboardType="numeric"
                            />
                            <Text className="font-bold text-textSecondary">Units</Text>
                        </View>
                        <Text className="text-xs text-textSecondary font-bold mt-2 ml-1">You will be notified when stock falls below this number.</Text>
                    </View>
                </View>

                {!typeDropdownOpen && (
                    <TouchableOpacity 
                        onPress={handleSave}
                        disabled={loading}
                        className={`py-4 rounded-2xl items-center shadow-sm mb-8 ${loading ? 'bg-primary/50' : 'bg-primary active:bg-[#15803D]'}`}
                    >
                        {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg">Save Settings</Text>}
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
}
