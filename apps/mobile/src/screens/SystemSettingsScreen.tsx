import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Bell } from 'lucide-react-native';
import AppModal from '../components/AppModal';

export default function SystemSettingsScreen({ onBack }: { onBack: () => void }) {
    const [pushNotifs, setPushNotifs] = useState(true);
    const [modal, setModal] = useState<{ visible: boolean; type: 'success' | 'error' | 'warning' | 'info'; title: string; subtitle?: string; primaryLabel?: string; onPrimary?: () => void; secondaryLabel?: string; onSecondary?: () => void; autoDismiss?: boolean } | null>(null);

    useEffect(() => {
        AsyncStorage.getItem('pushNotificationsEnabled').then(val => {
            setPushNotifs(val !== 'false'); // default true
        });
    }, []);

    const handlePushNotifsToggle = async (value: boolean) => {
        setPushNotifs(value);
        await AsyncStorage.setItem('pushNotificationsEnabled', value.toString());
        // TODO: When push notification service is integrated, send preference to backend here
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
                            onValueChange={handlePushNotifsToggle}
                            trackColor={{ false: '#CBD5E1', true: '#16A34A' }}
                        />
                    </View>
                </View>

            </ScrollView>
            <AppModal
                visible={modal?.visible ?? false}
                type={modal?.type ?? 'info'}
                title={modal?.title ?? ''}
                subtitle={modal?.subtitle}
                primaryLabel={modal?.primaryLabel}
                onPrimary={() => { modal?.onPrimary?.(); setModal(null); }}
                secondaryLabel={modal?.secondaryLabel}
                onSecondary={() => { modal?.onSecondary?.(); setModal(null); }}
                onDismiss={() => setModal(null)}
                autoDismiss={modal?.autoDismiss}
            />
        </View>
    );
}
