import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { ArrowLeft, Moon, Bell, CloudFog, RefreshCw, DatabaseZap } from 'lucide-react-native';

export default function SystemSettingsScreen({ onBack }: { onBack: () => void }) {
    const [darkMode, setDarkMode] = useState(false);
    const [pushNotifs, setPushNotifs] = useState(true);
    const [autoSync, setAutoSync] = useState(true);

    const handleClearCache = () => {
        Alert.alert(
            'Clear Local Cache',
            'This will clear local image caches and temp data. Your sales and stock are safe.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear Cache', style: 'destructive', onPress: () => Alert.alert('Success', 'Cache cleared!') }
            ]
        );
    };

    return (
        <View className="flex-1 bg-lightBackground">
            <View className="flex-row items-center px-6 pt-12 pb-4 bg-white border-b border-border shadow-sm">
                <TouchableOpacity onPress={onBack} className="w-10 h-10 bg-lightBackground rounded-full items-center justify-center mr-4">
                    <ArrowLeft size={20} color="#0F172A" />
                </TouchableOpacity>
                <Text className="text-xl font-black text-textPrimary">System Settings</Text>
            </View>

            <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
                
                <Text className="text-textSecondary text-[10px] font-black uppercase tracking-widest mb-4">Appearance & Experience</Text>
                <View className="bg-white rounded-3xl overflow-hidden border border-border shadow-sm mb-8">
                    <View className="flex-row items-center justify-between p-5 border-b border-border/50">
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 bg-[#1E293B] rounded-xl items-center justify-center mr-4">
                                <Moon size={20} color="white" />
                            </View>
                            <View>
                                <Text className="font-bold text-textPrimary">Dark Mode</Text>
                                <Text className="text-[10px] text-textSecondary font-bold mt-1 uppercase">Coming soon</Text>
                            </View>
                        </View>
                        <Switch
                            value={darkMode}
                            onValueChange={setDarkMode}
                            disabled={true}
                            trackColor={{ false: '#CBD5E1', true: '#16A34A' }}
                        />
                    </View>

                    <View className="flex-row items-center justify-between p-5">
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 bg-accentLight rounded-xl items-center justify-center mr-4">
                                <Bell size={20} color="#92400E" />
                            </View>
                            <View>
                                <Text className="font-bold text-textPrimary">Push Notifications</Text>
                                <Text className="text-[10px] text-textSecondary font-bold mt-1 uppercase">Stock & Debt Alerts</Text>
                            </View>
                        </View>
                        <Switch
                            value={pushNotifs}
                            onValueChange={setPushNotifs}
                            trackColor={{ false: '#CBD5E1', true: '#16A34A' }}
                        />
                    </View>
                </View>

                <Text className="text-textSecondary text-[10px] font-black uppercase tracking-widest mb-4">Data & Sync</Text>
                <View className="bg-white rounded-3xl overflow-hidden border border-border shadow-sm mb-8">
                    <View className="flex-row items-center justify-between p-5 border-b border-border/50">
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 bg-infoLight rounded-xl items-center justify-center mr-4">
                                <RefreshCw size={20} color="#2563EB" />
                            </View>
                            <View>
                                <Text className="font-bold text-textPrimary">Auto-Sync to Cloud</Text>
                                <Text className="text-[10px] text-textSecondary font-bold mt-1 uppercase">When online</Text>
                            </View>
                        </View>
                        <Switch
                            value={autoSync}
                            onValueChange={setAutoSync}
                            trackColor={{ false: '#CBD5E1', true: '#16A34A' }}
                        />
                    </View>

                    <TouchableOpacity onPress={handleClearCache} className="flex-row items-center p-5">
                        <View className="w-10 h-10 bg-dangerLight rounded-xl items-center justify-center mr-4">
                            <DatabaseZap size={20} color="#EF4444" />
                        </View>
                        <View>
                            <Text className="font-bold text-textPrimary">Clear Local Cache</Text>
                            <Text className="text-[10px] text-textSecondary font-bold mt-1 uppercase">Free up device space</Text>
                        </View>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}
