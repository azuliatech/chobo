import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { ArrowLeft, MessageCircle, HelpCircle, ChevronRight, Mail, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react-native';
import Constants from 'expo-constants';

const FAQS = [
    { q: 'How do I add a new product?', a: 'Go to the Stock Hub tab and tap the + button or the scanner icon. You can manually enter details or scan a barcode to automatically fetch details if available.' },
    { q: 'How do I track what customers owe?', a: 'When checking out, select the "Pay Later" method. Make sure to enter the customer\'s name and phone number. You can then view all debts in the Ledger tab under "Owing".' },
    { q: 'Can I use KashAm offline?', a: 'Yes! KashAm is designed to work completely offline. Any sales or products you add while offline will sync to the cloud automatically once your internet connection is restored.' },
    { q: 'How do I share a receipt?', a: 'After completing a sale, you will be prompted to share a receipt. You can also go to the Ledger, tap any transaction to view details, and share it from there.' }
];

export default function HelpScreen({ onBack }: { onBack: () => void }) {
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    const version = Constants.expoConfig?.version || '1.0.0';

    return (
        <View className="flex-1 bg-lightBackground">
            <View className="flex-row items-center px-6 pt-12 pb-4 bg-white border-b border-border shadow-sm">
                <TouchableOpacity onPress={onBack} className="w-10 h-10 bg-lightBackground rounded-full items-center justify-center mr-4">
                    <ArrowLeft size={20} color="#0F172A" />
                </TouchableOpacity>
                <Text className="text-xl font-black text-textPrimary">Help & Support</Text>
            </View>

            <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
                
                {/* CONTACT OPTIONS */}
                <Text className="text-textSecondary text-[10px] font-black uppercase tracking-widest mb-4">Contact Us</Text>
                <View className="bg-white rounded-3xl overflow-hidden border border-border shadow-sm mb-8">
                    <TouchableOpacity 
                        className="flex-row items-center justify-between p-5 border-b border-border/50"
                        onPress={() => Linking.openURL('https://wa.me/2348000000000')}
                    >
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 bg-primaryLight rounded-xl items-center justify-center mr-4">
                                <MessageCircle size={20} color="#16A34A" />
                            </View>
                            <View>
                                <Text className="font-bold text-textPrimary">WhatsApp Support</Text>
                                <Text className="text-[10px] text-textSecondary font-bold mt-1 uppercase">Fastest response</Text>
                            </View>
                        </View>
                        <ExternalLink size={16} color="#64748B" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        className="flex-row items-center justify-between p-5"
                        onPress={() => Linking.openURL('mailto:support@kasham.app')}
                    >
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 bg-infoLight rounded-xl items-center justify-center mr-4">
                                <Mail size={20} color="#2563EB" />
                            </View>
                            <View>
                                <Text className="font-bold text-textPrimary">Email Us</Text>
                                <Text className="text-[10px] text-textSecondary font-bold mt-1 uppercase">support@kasham.app</Text>
                            </View>
                        </View>
                        <ExternalLink size={16} color="#64748B" />
                    </TouchableOpacity>
                </View>

                {/* FAQ */}
                <Text className="text-textSecondary text-[10px] font-black uppercase tracking-widest mb-4">Frequently Asked Questions</Text>
                <View className="bg-white rounded-3xl overflow-hidden border border-border shadow-sm mb-8">
                    {FAQS.map((faq, idx) => {
                        const isExpanded = expandedFaq === idx;
                        return (
                            <TouchableOpacity 
                                key={idx} 
                                onPress={() => setExpandedFaq(isExpanded ? null : idx)}
                                className={`p-5 ${idx < FAQS.length - 1 ? 'border-b border-border/50' : ''}`}
                            >
                                <View className="flex-row justify-between items-center">
                                    <View className="flex-row items-center flex-1 pr-4">
                                        <HelpCircle size={16} color={isExpanded ? '#16A34A' : '#64748B'} className="mr-3 mt-0.5" />
                                        <Text className={`font-bold ${isExpanded ? 'text-primary' : 'text-textPrimary'}`}>{faq.q}</Text>
                                    </View>
                                    {isExpanded ? <ChevronUp size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
                                </View>
                                {isExpanded && (
                                    <Text className="text-textSecondary font-bold text-xs mt-3 leading-5 ml-7">{faq.a}</Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* APP INFO */}
                <View className="items-center mb-12">
                    <Text className="text-textPrimary font-black text-lg mb-1">KashAm</Text>
                    <Text className="text-textSecondary font-bold text-xs">Version {version}</Text>
                </View>

            </ScrollView>
        </View>
    );
}
