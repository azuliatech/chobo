import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { ArrowLeft, Lock } from 'lucide-react-native';
import AppModal from '../components/AppModal';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../config';

export default function SecurityScreen({ onBack }: { onBack: () => void }) {
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState<{ visible: boolean; type: 'success' | 'error' | 'warning' | 'info'; title: string; subtitle?: string; primaryLabel?: string; onPrimary?: () => void; secondaryLabel?: string; onSecondary?: () => void; autoDismiss?: boolean } | null>(null);

    const isPasswordValid = newPass.length >= 8 && /[A-Z]/.test(newPass) && /[0-9]/.test(newPass) && /[^A-Za-z0-9]/.test(newPass);

    const handleChangePassword = async () => {
        if (!currentPass || !newPass) return;
        if (!isPasswordValid) {
            setModal({ visible: true, type: 'error', title: 'Weak password', subtitle: 'Your new password does not meet the requirements.' });
            return;
        }
        setLoading(true);
        try {
            const token = useAuthStore.getState().token;
            const res = await fetch(`${API_URL}/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed');
            }
            setCurrentPass('');
            setNewPass('');
            setModal({ visible: true, type: 'success', title: 'Password updated', subtitle: 'Your password has been changed successfully.', autoDismiss: true });
        } catch (e: any) {
            setModal({ visible: true, type: 'error', title: 'Update failed', subtitle: e.message === 'Incorrect current password' || e.message === 'Unauthorized' ? 'Your current password is incorrect.' : 'Could not update password. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-lightBackground">
            <View className="flex-row items-center px-6 pt-12 pb-4 bg-white border-b border-border shadow-sm">
                <TouchableOpacity onPress={onBack} className="w-10 h-10 bg-lightBackground rounded-full items-center justify-center mr-4">
                    <ArrowLeft size={20} color="#0F172A" />
                </TouchableOpacity>
                <Text className="text-xl font-black text-textPrimary">Security</Text>
            </View>

            <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
                <View className="bg-white rounded-3xl p-6 border border-border shadow-sm mb-6">
                    <View className="flex-row items-center mb-6">
                        <Lock size={20} color="#0F172A" />
                        <Text className="font-black text-textPrimary ml-3 text-lg">Change Password</Text>
                    </View>
                    <View className="mb-4">
                        <Text className="text-textSecondary text-[10px] font-black uppercase mb-2">Current Password</Text>
                        <View className="flex-row items-center bg-lightBackground border border-border rounded-xl px-4 h-14">
                            <TextInput placeholderTextColor="#94A3B8" 
                                className="flex-1 font-bold text-textPrimary" 
                                placeholder="••••••••"
                                secureTextEntry
                                value={currentPass}
                                onChangeText={setCurrentPass}
                            />
                        </View>
                    </View>
                    <View className="mb-6">
                        <Text className="text-textSecondary text-[10px] font-black uppercase mb-2">New Password</Text>
                        <View className="flex-row items-center bg-lightBackground border border-border rounded-xl px-4 h-14">
                            <TextInput placeholderTextColor="#94A3B8" 
                                className="flex-1 font-bold text-textPrimary" 
                                placeholder="••••••••"
                                secureTextEntry
                                value={newPass}
                                onChangeText={setNewPass}
                            />
                        </View>
                    </View>
                    <TouchableOpacity 
                        className={`py-4 rounded-xl items-center ${currentPass && newPass && isPasswordValid && !loading ? 'bg-black active:bg-gray-800' : 'bg-border opacity-50'}`}
                        onPress={handleChangePassword}
                        disabled={loading || !currentPass || !newPass || !isPasswordValid}
                    >
                        {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black">Update Password</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
            <AppModal
                visible={modal?.visible ?? false}
                type={modal?.type ?? 'info'}
                title={modal?.title ?? ''}
                subtitle={modal?.subtitle}
                onDismiss={() => setModal(null)}
                autoDismiss={modal?.autoDismiss}
            />
        </View>
    );
}
