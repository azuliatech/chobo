import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../config';

export default function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const loginStore = useAuthStore((state) => state.login);

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert('Error', 'Please enter username and password');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            
            if (!res.ok) {
                 // Fallback if user doesn't exist, try local register for testing purposes
                 if (res.status === 401 || res.status === 404) {
                     Alert.alert(
                         "Confirm Registration",
                         "User not found. Do you want to create a new account with these credentials?",
                         [
                             { text: "Cancel", style: "cancel", onPress: () => setLoading(false) },
                             { text: "Create", onPress: handleRegister }
                         ]
                     );
                     return;
                 }
                throw new Error(data.message || 'Login failed');
            }

            await loginStore(data.access_token);
        } catch (e: any) {
            Alert.alert('Login Error', e.message);
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Registration failed');
            
            // Auto-login after registration
            await handleLogin();
        } catch (e: any) {
            Alert.alert('Registration Error', e.message);
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.formContainer}>
                <Text style={styles.title}>KashAm</Text>
                <Text style={styles.subtitle}>Sign in to sync your sales</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor="#64748b"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                />
                
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#64748b"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity 
                    style={[styles.button, loading && styles.buttonDisabled]} 
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Sign In / Register</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 24 },
    formContainer: { backgroundColor: '#1e293b', padding: 24, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#10b981', textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 32 },
    input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 16, color: '#f8fafc', marginBottom: 16, fontSize: 16 },
    button: { backgroundColor: '#10b981', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
