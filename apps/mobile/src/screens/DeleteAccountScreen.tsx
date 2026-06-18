import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { ArrowLeft, AlertTriangle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../config';
import AppModal from '../components/AppModal';

export default function DeleteAccountScreen({ onBack, onConfirm }: { onBack: () => void; onConfirm: () => void }) {
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState<{ visible: boolean; type: 'success' | 'error' | 'warning' | 'info'; title: string; subtitle?: string; primaryLabel?: string; onPrimary?: () => void; secondaryLabel?: string; onSecondary?: () => void; autoDismiss?: boolean } | null>(null);

    const handleDelete = async () => {
        if (confirmText !== 'DELETE') return;
        setLoading(true);
        try {
            const token = useAuthStore.getState().token;
            const res = await fetch(`${API_URL}/auth/account`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Delete failed');

            // Clear all local data
            await AsyncStorage.clear();
            await SecureStore.deleteItemAsync('jwt_token');
            await SecureStore.deleteItemAsync('jwt_refresh_token');

            // Clear auth store
            await onConfirm();
        } catch (e) {
            setModal({
                visible: true,
                type: 'error',
                title: 'Delete failed',
                subtitle: 'Could not delete your account. Please try again or contact support.',
            });
        } finally {
            setLoading(false);
        }
    };

    const isEnabled = confirmText === 'DELETE';

    return (
        <View className="flex-1 bg-lightBackground">
            {/* Header */}
            <View className="flex-row items-center px-6 pt-12 pb-4 bg-white border-b border-border shadow-sm">
                <TouchableOpacity onPress={onBack} className="w-10 h-10 bg-lightBackground rounded-full items-center justify-center mr-4">
                    <ArrowLeft size={20} color="#0F172A" />
                </TouchableOpacity>
                <Text className="text-xl font-black text-textPrimary">Delete Account</Text>
            </View>

            <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
                {/* Centered Warning Icon */}
                <View className="items-center my-6">
                    <View className="w-20 h-20 bg-dangerLight rounded-full items-center justify-center">
                        <AlertTriangle size={40} color="#EF4444" />
                    </View>
                </View>

                {/* Warning Content */}
                <View className="bg-white rounded-3xl p-6 border border-border shadow-sm mb-6">
                    <Text className="text-xl font-black text-textPrimary mb-4">Delete your account</Text>
                    <Text className="text-textSecondary text-sm font-semibold mb-4 leading-5">
                        This action is permanent and cannot be undone. Deleting your account will:
                    </Text>
                    <View className="gap-2.5">
                        <Text className="text-textSecondary text-xs font-semibold">• Permanently delete all your business data</Text>
                        <Text className="text-textSecondary text-xs font-semibold">• Close your workspace and remove all staff access</Text>
                        <Text className="text-textSecondary text-xs font-semibold">• Delete all sales history, stock, and transactions</Text>
                        <Text className="text-textSecondary text-xs font-semibold">• Cancel any active subscription immediately</Text>
                    </View>
                </View>

                <View className="bg-white rounded-3xl p-6 border border-border shadow-sm mb-8">
                    <Text className="text-textSecondary text-[10px] font-black uppercase mb-2">To confirm, type DELETE below</Text>
                    <TextInput 
                        placeholderTextColor="#94A3B8"
                        className="bg-lightBackground border border-border rounded-xl px-4 h-14 font-black text-textPrimary text-center mb-6"
                        placeholder="Type DELETE"
                        autoCapitalize="characters"
                        value={confirmText}
                        onChangeText={setConfirmText}
                    />

                    {/* Delete button */}
                    <TouchableOpacity
                        onPress={handleDelete}
                        disabled={!isEnabled || loading}
                        className={`py-4 rounded-xl items-center mb-3 ${isEnabled ? 'bg-danger active:bg-[#DC2626]' : 'bg-border'}`}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-black">Permanently delete my account</Text>
                        )}
                    </TouchableOpacity>

                    {/* Cancel ghost button */}
                    <TouchableOpacity
                        onPress={onBack}
                        className="py-3 items-center"
                    >
                        <Text className="text-textSecondary font-black text-sm">Cancel</Text>
                    </TouchableOpacity>
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
