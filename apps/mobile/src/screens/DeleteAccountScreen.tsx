import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

export default function DeleteAccountScreen({ onBack, onConfirm }: { onBack: () => void; onConfirm: () => void }) {
    return (
        <View className="flex-1 bg-lightBackground">
            <View className="flex-row items-center px-6 pt-12 pb-4 bg-white border-b border-border">
                <TouchableOpacity onPress={onBack} className="mr-4">
                    <ArrowLeft size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-textPrimary">Delete Account</Text>
            </View>
            <View className="p-6">
                <Text>Delete Account warning form goes here</Text>
            </View>
        </View>
    );
}
