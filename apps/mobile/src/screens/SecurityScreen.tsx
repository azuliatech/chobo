import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { ArrowLeft, Lock } from 'lucide-react-native';

export default function SecurityScreen({ onBack }: { onBack: () => void }) {
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');

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
                    <TouchableOpacity className={`py-4 rounded-xl items-center ${currentPass && newPass ? 'bg-black' : 'bg-border'}`}>
                        <Text className="text-white font-black">Update Password</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}
