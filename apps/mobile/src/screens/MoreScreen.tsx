import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { Header } from './SellScreen';
import { 
    User, 
    Settings, 
    HelpCircle, 
    LogOut, 
    Trash2, 
    ChevronRight,
    Store,
    ShieldCheck,
    Wrench
} from 'lucide-react-native';

import PersonalInfoScreen from './PersonalInfoScreen';
import BusinessSettingsScreen from './BusinessSettingsScreen';
import SecurityScreen from './SecurityScreen';
import SystemSettingsScreen from './SystemSettingsScreen';
import HelpSupportScreen from './HelpSupportScreen';
import DeleteAccountScreen from './DeleteAccountScreen';
import DevToolsScreen from './DevToolsScreen';

const MenuItem = ({ icon: Icon, color, label, onPress, sublabel }: any) => (
    <TouchableOpacity 
        onPress={onPress}
        className="bg-white px-6 py-5 flex-row items-center border-b border-border/50"
    >
        <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: `${color}15` }}>
            <Icon size={20} color={color} />
        </View>
        <View className="flex-1 ml-4">
            <Text className="text-textPrimary font-bold text-base">{label}</Text>
            {sublabel && <Text className="text-textSecondary text-[10px] uppercase font-bold mt-0.5">{sublabel}</Text>}
        </View>
        <ChevronRight size={16} color="#CBD5E1" />
    </TouchableOpacity>
);

export default function MoreScreen() {
    const { logout } = useAuthStore();
    const { clearCart } = useCartStore();
    const [activeSubScreen, setActiveSubScreen] = useState<string | null>(null);

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: async () => {
                    clearCart();
                    await logout();
                }}
            ]
        );
    };

    if (activeSubScreen === 'PersonalInfo') return <PersonalInfoScreen onBack={() => setActiveSubScreen(null)} />;
    if (activeSubScreen === 'BusinessSettings') return <BusinessSettingsScreen onBack={() => setActiveSubScreen(null)} />;
    if (activeSubScreen === 'Security') return <SecurityScreen onBack={() => setActiveSubScreen(null)} />;
    if (activeSubScreen === 'SystemSettings') return <SystemSettingsScreen onBack={() => setActiveSubScreen(null)} />;
    if (activeSubScreen === 'HelpSupport') return <HelpSupportScreen onBack={() => setActiveSubScreen(null)} />;
    if (activeSubScreen === 'DeleteAccount') return <DeleteAccountScreen onBack={() => setActiveSubScreen(null)} onConfirm={logout} />;
    if (activeSubScreen === 'DevTools') return <DevToolsScreen onBack={() => setActiveSubScreen(null)} />;

    return (
        <View className="flex-1 bg-lightBackground">
            <Header title="More" subtitle="Account & Settings" />
            
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="mt-8 mb-4 px-6">
                    <Text className="text-textSecondary text-[10px] font-black uppercase tracking-widest mb-4">Business Profile</Text>
                    <View className="bg-white rounded-3xl overflow-hidden border border-border shadow-sm">
                        <MenuItem 
                            icon={User} 
                            color="#16A34A" 
                            label="Personal Info" 
                            sublabel="Manage your personal details"
                            onPress={() => setActiveSubScreen('PersonalInfo')} 
                        />
                        <MenuItem 
                            icon={Store} 
                            color="#2563EB" 
                            label="Business Settings" 
                            sublabel="Change store name & address"
                            onPress={() => setActiveSubScreen('BusinessSettings')} 
                        />
                        <MenuItem 
                            icon={ShieldCheck} 
                            color="#8B5CF6" 
                            label="Security" 
                            sublabel="Password & authentication"
                            onPress={() => setActiveSubScreen('Security')} 
                        />
                    </View>
                </View>

                <View className="mb-4 px-6">
                    <Text className="text-textSecondary text-[10px] font-black uppercase tracking-widest mb-4">App Preferences</Text>
                    <View className="bg-white rounded-3xl overflow-hidden border border-border shadow-sm">
                        <MenuItem 
                            icon={Settings} 
                            color="#64748B" 
                            label="System Settings" 
                            sublabel="Language, theme & currency"
                            onPress={() => setActiveSubScreen('SystemSettings')} 
                        />
                        <MenuItem 
                            icon={HelpCircle} 
                            color="#0EA5E9" 
                            label="Help & Support" 
                            sublabel="FAQs and contact us"
                            onPress={() => setActiveSubScreen('HelpSupport')} 
                        />
                        {__DEV__ && (
                            <MenuItem 
                                icon={Wrench} 
                                color="#EAB308" 
                                label="Developer Tools" 
                                sublabel="Reset DB, clear cache"
                                onPress={() => setActiveSubScreen('DevTools')} 
                            />
                        )}
                    </View>
                </View>

                <View className="mb-12 px-6">
                    <Text className="text-textSecondary text-[10px] font-black uppercase tracking-widest mb-4">Safety Zone</Text>
                    <View className="bg-white rounded-3xl overflow-hidden border border-border shadow-sm">
                        <MenuItem 
                            icon={LogOut} 
                            color="#0F172A" 
                            label="Sign Out" 
                            onPress={handleSignOut} 
                        />
                        <MenuItem 
                            icon={Trash2} 
                            color="#EF4444" 
                            label="Delete Account" 
                            onPress={() => setActiveSubScreen('DeleteAccount')} 
                        />
                    </View>
                    <Text className="text-center text-textSecondary text-[10px] mt-8 font-bold">KashAm v1.2.0 · Offline-First Engine</Text>
                </View>
            </ScrollView>
        </View>
    );
}
