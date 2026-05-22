import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Switch } from 'react-native';
import { ArrowLeft, Lock, Smartphone, ShieldCheck, Fingerprint } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SecurityScreen({ onBack }: { onBack: () => void }) {
    const [biometricSupported, setBiometricSupported] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');

    useEffect(() => {
        (async () => {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            setBiometricSupported(compatible);
            const enabled = await SecureStore.getItemAsync('biometricEnabled');
            setBiometricEnabled(enabled === 'true');
        })();
    }, []);

    const toggleBiometric = async (val: boolean) => {
        if (val) {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authenticate to enable biometric login'
            });
            if (result.success) {
                setBiometricEnabled(true);
                await SecureStore.setItemAsync('biometricEnabled', 'true');
                const userId = await AsyncStorage.getItem('userId');
                if (userId) {
                    await SecureStore.setItemAsync('biometricUserId', userId);
                }
            }
        } else {
            setBiometricEnabled(false);
            await SecureStore.deleteItemAsync('biometricEnabled');
            await SecureStore.deleteItemAsync('biometricUserId');
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
                {biometricSupported && (
                    <View className="bg-white rounded-3xl p-6 border border-border shadow-sm mb-6 flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1 pr-4">
                            <View className="w-10 h-10 bg-primaryLight rounded-xl items-center justify-center mr-4">
                                <Fingerprint size={20} color="#16A34A" />
                            </View>
                            <View className="flex-1">
                                <Text className="font-bold text-textPrimary">Biometric Login</Text>
                                <Text className="text-[10px] text-textSecondary font-bold mt-1 uppercase">Use Face ID / Touch ID</Text>
                            </View>
                        </View>
                        <Switch
                            value={biometricEnabled}
                            onValueChange={toggleBiometric}
                            trackColor={{ false: '#CBD5E1', true: '#16A34A' }}
                            thumbColor="white"
                        />
                    </View>
                )}

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
                    <TouchableOpacity className={`py-4 rounded-xl items-center ${currentPass && newPass ? 'bg-black' : 'bg-border'}`}>
                        <Text className="text-white font-black">Update Password</Text>
                    </TouchableOpacity>
                </View>

                <View className="bg-white rounded-3xl p-6 border border-border shadow-sm mb-6">
                    <View className="flex-row items-center mb-6">
                        <Smartphone size={20} color="#0F172A" />
                        <Text className="font-black text-textPrimary ml-3 text-lg">Change Phone Number</Text>
                    </View>
                    <View className="mb-6">
                        <Text className="text-textSecondary text-[10px] font-black uppercase mb-2">New Phone Number</Text>
                        <View className="flex-row items-center bg-lightBackground border border-border rounded-xl px-4 h-14">
                            <TextInput placeholderTextColor="#94A3B8" 
                                className="flex-1 font-bold text-textPrimary" 
                                placeholder="e.g. 801 234 5678"
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>
                    <TouchableOpacity className="py-4 rounded-xl items-center bg-black">
                        <Text className="text-white font-black">Request OTP</Text>
                    </TouchableOpacity>
                </View>

                <View className="flex-row items-start bg-lightGreen p-4 rounded-2xl mb-8 border border-primary/20">
                    <ShieldCheck size={20} color="#16A34A" />
                    <Text className="flex-1 ml-3 text-xs text-[#15803D] font-bold leading-5">Your data is fully encrypted and stored securely both locally and on our cloud servers.</Text>
                </View>

            </ScrollView>
        </View>
    );
}
