import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ArrowLeft, Database, HardDrive } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { db } from '../db';

export default function DevToolsScreen({ onBack }: { onBack: () => void }) {
    const handleClearAsyncStorage = async () => {
        await AsyncStorage.clear();
        Alert.alert('Cleared', 'AsyncStorage wiped.');
    };

    const handleClearSecureStore = async () => {
        await SecureStore.deleteItemAsync('jwt_token');
        await SecureStore.deleteItemAsync('jwt_refresh_token');
        Alert.alert('Cleared', 'SecureStore auth tokens wiped.');
    };

    const handleDropTables = async () => {
        Alert.alert('Warning', 'This will wipe all SQLite tables and data. You must restart the app afterward.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Wipe', style: 'destructive', onPress: async () => {
                await db.execAsync(`
                    DROP TABLE IF EXISTS products;
                    DROP TABLE IF EXISTS sales;
                    DROP TABLE IF EXISTS sale_items;
                    DROP TABLE IF EXISTS customers;
                    DROP TABLE IF EXISTS debts;
                    DROP TABLE IF EXISTS notifications;
                    DROP TABLE IF EXISTS payment_logs;
                `);
                Alert.alert('Wiped', 'Restart app to recreate tables.');
            }}
        ]);
    };

    return (
        <View className="flex-1 bg-lightBackground">
            <View className="flex-row items-center px-6 pt-12 pb-4 bg-white border-b border-border shadow-sm">
                <TouchableOpacity onPress={onBack} className="w-10 h-10 bg-lightBackground rounded-full items-center justify-center mr-4">
                    <ArrowLeft size={20} color="#0F172A" />
                </TouchableOpacity>
                <Text className="text-xl font-black text-textPrimary">Developer Tools</Text>
            </View>
            <ScrollView className="p-6">
                <Text className="text-textSecondary text-xs font-bold uppercase mb-4 tracking-widest">Storage & Cache</Text>
                
                <TouchableOpacity onPress={handleClearAsyncStorage} className="bg-white p-4 rounded-xl border border-border flex-row items-center mb-4 shadow-sm">
                    <HardDrive size={20} color="#64748B" />
                    <Text className="font-bold text-textPrimary ml-4">Wipe AsyncStorage (KV Store)</Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={handleClearSecureStore} className="bg-white p-4 rounded-xl border border-border flex-row items-center mb-6 shadow-sm">
                    <HardDrive size={20} color="#64748B" />
                    <Text className="font-bold text-textPrimary ml-4">Wipe SecureStore (Tokens)</Text>
                </TouchableOpacity>

                <Text className="text-textSecondary text-xs font-bold uppercase mb-4 tracking-widest">Database</Text>
                
                <TouchableOpacity onPress={handleDropTables} className="bg-dangerLight p-4 rounded-xl border border-danger/30 flex-row items-center mb-4 shadow-sm">
                    <Database size={20} color="#EF4444" />
                    <View className="ml-4">
                        <Text className="font-bold text-danger">Drop All SQLite Tables</Text>
                        <Text className="text-danger/70 text-xs font-bold mt-1">Simulates fresh install</Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
