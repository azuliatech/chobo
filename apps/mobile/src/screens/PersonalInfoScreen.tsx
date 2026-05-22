import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Image, ActivityIndicator, Alert, ActionSheetIOS, Platform } from 'react-native';
import { ArrowLeft, Camera, User, Phone, Mail } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pickImageFromGallery, takePhoto } from '../utils/pickImage';
import { uploadImageToCloudinary } from '../utils/uploadImage';
import { useAuthStore } from '../store/authStore';
import { useSyncStore } from '../store/syncStore';

export default function PersonalInfoScreen({ onBack }: { onBack: () => void }) {
    const { isOnline } = useSyncStore();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const [storedName, storedPhone, storedEmail, storedPhoto] = await Promise.all([
                AsyncStorage.getItem('profileName'),
                AsyncStorage.getItem('profilePhone'),
                AsyncStorage.getItem('profileEmail'),
                AsyncStorage.getItem('profilePhoto')
            ]);
            if (storedName) setName(storedName);
            if (storedPhone) setPhone(storedPhone);
            if (storedEmail) setEmail(storedEmail);
            if (storedPhoto) setProfilePhoto(storedPhoto);
        } catch (e) {
            console.error('Error loading profile', e);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await AsyncStorage.setItem('profileName', name);
            await AsyncStorage.setItem('profilePhone', phone);
            await AsyncStorage.setItem('profileEmail', email);
            if (profilePhoto) await AsyncStorage.setItem('profilePhoto', profilePhoto);
            Alert.alert('Success', 'Profile saved successfully!');
        } catch (e) {
            Alert.alert('Error', 'Could not save profile details');
        } finally {
            setLoading(false);
        }
    };

    const handlePickImage = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options: ['Cancel', 'Take Photo', 'Choose from Gallery'], cancelButtonIndex: 0 },
                async (idx) => {
                    let uri: string | null = null;
                    if (idx === 1) uri = await takePhoto();
                    if (idx === 2) uri = await pickImageFromGallery();
                    if (uri) handleUpload(uri);
                }
            );
        } else {
            Alert.alert('Add Photo', 'Choose an option', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Take Photo', onPress: async () => { const uri = await takePhoto(); if (uri) handleUpload(uri); } },
                { text: 'Choose from Gallery', onPress: async () => { const uri = await pickImageFromGallery(); if (uri) handleUpload(uri); } },
            ]);
        }
    };

    const handleUpload = async (uri: string) => {
        if (!isOnline) {
            Alert.alert('Offline', 'Cannot upload photo while offline. Saving locally for now.');
            setProfilePhoto(uri);
            return;
        }
        setLoading(true);
        try {
            const url = await uploadImageToCloudinary(uri);
            if (url) {
                setProfilePhoto(url);
            } else {
                Alert.alert('Upload Failed', 'Could not upload image.');
            }
        } catch (e) {
            Alert.alert('Error', 'Image upload failed.');
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (str: string) => {
        if (!str) return 'U';
        const parts = str.trim().split(' ');
        if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
        return str.substring(0, 2).toUpperCase();
    };

    return (
        <View className="flex-1 bg-lightBackground">
            <View className="flex-row items-center px-6 pt-12 pb-4 bg-white border-b border-border shadow-sm">
                <TouchableOpacity onPress={onBack} className="w-10 h-10 bg-lightBackground rounded-full items-center justify-center mr-4">
                    <ArrowLeft size={20} color="#0F172A" />
                </TouchableOpacity>
                <Text className="text-xl font-black text-textPrimary">Personal Info</Text>
            </View>

            <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
                <View className="items-center mb-8">
                    <View className="w-24 h-24 bg-primaryLight rounded-full items-center justify-center mb-4 relative border-4 border-white shadow-sm overflow-visible">
                        {profilePhoto ? (
                            <Image source={{ uri: profilePhoto }} className="w-full h-full rounded-full" />
                        ) : (
                            <Text className="text-primaryDark font-black text-3xl">{getInitials(name)}</Text>
                        )}
                        <TouchableOpacity 
                            onPress={handlePickImage}
                            className="absolute -bottom-2 -right-2 bg-primary p-2.5 rounded-full border-2 border-white shadow-sm z-10"
                        >
                            <Camera size={16} color="white" />
                        </TouchableOpacity>
                    </View>
                    <Text className="text-textSecondary text-[10px] font-black uppercase tracking-widest mt-2">Profile Photo</Text>
                </View>

                <View className="bg-white rounded-3xl p-6 border border-border shadow-sm mb-6">
                    <View className="mb-6 relative">
                        <Text className="text-textSecondary text-[10px] font-black uppercase mb-2">Full Name</Text>
                        <View className="flex-row items-center bg-lightBackground border border-border rounded-xl px-4 h-14">
                            <User size={18} color="#64748B" />
                            <TextInput placeholderTextColor="#94A3B8" 
                                className="flex-1 ml-3 font-bold text-textPrimary" 
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter full name"
                            />
                        </View>
                    </View>

                    <View className="mb-6 relative">
                        <Text className="text-textSecondary text-[10px] font-black uppercase mb-2">Phone Number</Text>
                        <View className="flex-row items-center bg-lightBackground border border-border rounded-xl px-4 h-14 opacity-70">
                            <Phone size={18} color="#64748B" />
                            <TextInput placeholderTextColor="#94A3B8" 
                                className="flex-1 ml-3 font-bold text-textPrimary" 
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="Enter phone number"
                            />
                        </View>
                    </View>

                    <View className="relative">
                        <Text className="text-textSecondary text-[10px] font-black uppercase mb-2">Email Address (Optional)</Text>
                        <View className="flex-row items-center bg-lightBackground border border-border rounded-xl px-4 h-14">
                            <Mail size={18} color="#64748B" />
                            <TextInput placeholderTextColor="#94A3B8" 
                                className="flex-1 ml-3 font-bold text-textPrimary" 
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                placeholder="Enter email address"
                            />
                        </View>
                    </View>
                </View>

                <TouchableOpacity 
                    onPress={handleSave}
                    disabled={loading}
                    className={`py-4 rounded-2xl items-center shadow-sm ${loading ? 'bg-primary/50' : 'bg-primary active:bg-[#15803D]'}`}
                >
                    {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg">Save Changes</Text>}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
