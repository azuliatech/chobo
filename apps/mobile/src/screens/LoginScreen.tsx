import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView, Modal } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, ArrowLeft, Lock, Store, Phone, Eye, EyeOff, ShieldCheck, CheckCircle, Wallet, Package, Sparkles, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CountryPicker, { CountryCode } from 'react-native-country-picker-modal';
import { saveCountryCode } from '../hooks/useCurrency';

type Step = 'welcome' | 'signup_phone' | 'signup_otp' | 'signup_business' | 'signup_password' | 'login';

const BUSINESS_TYPES = [
    'Provision Store',
    'Supermarket Minimart',
    'Pharmacy',
    'Food Vendor',
    'Boutique Clothing Store',
    'Electronics Phone Accessories',
    'Other'
];

const getPhonePlaceholder = (countryCode: string): string => {
  const placeholders: Record<string, string> = {
    NG: 'e.g. 0801 234 5678',
    GB: 'e.g. 07700 900000',
    US: 'e.g. (555) 000-0000',
    GH: 'e.g. 024 000 0000',
    KE: 'e.g. 0700 000000',
    ZA: 'e.g. 071 000 0000',
    IN: 'e.g. 98765 43210',
    CA: 'e.g. (555) 000-0000',
    AU: 'e.g. 0412 345 678',
    FR: 'e.g. 06 12 34 56 78',
    DE: 'e.g. 0151 12345678',
  };
  return placeholders[countryCode] ?? 'e.g. Your phone number';
};

const WALKTHROUGH_SLIDES = [
    {
        title: 'Stop losing your money to memory',
        description: 'Every day, little sales slip away because you forgot to write them down. KashAm tracks every single Cedi and Naira instantly, so you go home knowing your exact profit.',
        icon: Wallet
    },
    {
        title: 'Never tell a customer "It\'s finished"',
        description: 'Turning a customer away is like throwing away money. KashAm alerts you before your fastest-moving items run empty, keeping your shelves full and your shop busy.',
        icon: Package
    },
    {
        title: 'Get paid back without the awkward talks',
        description: 'Chasing customer debts feels stressful and awkward. KashAm keeps accurate, indisputable records of who owes you and lets you send polite, friendly reminders with one tap.',
        icon: ShieldCheck
    }
];

export default function LoginScreen() {
    const [step, setStep] = useState<Step>('welcome');
    
    // Auth State
    const [countryCode, setCountryCode] = useState<CountryCode>('NG');
    const [callingCode, setCallingCode] = useState('234');
    const [phone, setPhone] = useState('');
    
    // OTP State (6 digits)
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [pinId, setPinId] = useState('');
    const [countdown, setCountdown] = useState(60);
    const otpRefs = useRef<Array<TextInput | null>>([]);
    
    const [businessName, setBusinessName] = useState('');
    const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
    const [otherBusinessType, setOtherBusinessType] = useState('');
    const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
    
    // Password State
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [phoneError, setPhoneError] = useState('');
    const [loginError, setLoginError] = useState('');

    // Inline Login Validation States
    const [loginPhoneError, setLoginPhoneError] = useState('');
    const [loginPasswordError, setLoginPasswordError] = useState('');

    // Onboarding / Splash States
    const [showSplash, setShowSplash] = useState(true);
    const [showWalkthrough, setShowWalkthrough] = useState(false);
    const [walkthroughPage, setWalkthroughPage] = useState(0);

    // Forgot Password States
    const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
    const [forgotStep, setForgotStep] = useState<'phone' | 'otp' | 'password'>('phone');
    const [forgotPhone, setForgotPhone] = useState('');
    const [forgotPhoneError, setForgotPhoneError] = useState('');
    const [forgotPinId, setForgotPinId] = useState('');
    const [forgotOtp, setForgotOtp] = useState(['', '', '', '', '', '']);
    const [forgotOtpError, setForgotOtpError] = useState('');
    const [forgotNewPassword, setForgotNewPassword] = useState('');
    const [forgotPasswordError, setForgotPasswordError] = useState('');
    const [forgotCountdown, setForgotCountdown] = useState(60);
    const forgotOtpRefs = useRef<Array<TextInput | null>>([]);

    const { login } = useAuthStore();
    const insets = useSafeAreaInsets();

    const getFullPhone = () => {
        const digitsOnly = phone.replace(/\D/g, '');
        const cleaned = digitsOnly.replace(/^0+/, '');
        return `+${callingCode}${cleaned}`;
    };

    const getForgotFullPhone = () => {
        const digitsOnly = forgotPhone.replace(/\D/g, '');
        const cleaned = digitsOnly.replace(/^0+/, '');
        return `+${callingCode}${cleaned}`;
    };

    // Password validation
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const isPasswordValid = hasLength && hasUpper && hasNumber && hasSpecial;

    // Forgot password validation
    const forgotHasLength = forgotNewPassword.length >= 8;
    const forgotHasUpper = /[A-Z]/.test(forgotNewPassword);
    const forgotHasNumber = /[0-9]/.test(forgotNewPassword);
    const forgotHasSpecial = /[^A-Za-z0-9]/.test(forgotNewPassword);
    const isForgotNewPasswordValid = forgotHasLength && forgotHasUpper && forgotHasNumber && forgotHasSpecial;

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (step === 'signup_otp' && countdown > 0) {
            timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [step, countdown]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (forgotPasswordVisible && forgotStep === 'otp' && forgotCountdown > 0) {
            timer = setTimeout(() => setForgotCountdown(c => c - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [forgotPasswordVisible, forgotStep, forgotCountdown]);

    useEffect(() => {
        const checkFirstLaunch = async () => {
            const completed = await AsyncStorage.getItem('hasCompletedWalkthrough');
            // Show splash for 1.5 seconds then transition
            setTimeout(() => {
                setShowSplash(false);
                if (completed === 'true') {
                    setStep('welcome');
                } else {
                    setShowWalkthrough(true);
                }
            }, 1500);
        };
        const loadSavedCountry = async () => {
            const saved = await AsyncStorage.getItem('countryCode');
            if (saved) {
                setCountryCode(saved as CountryCode);
                const codes: Record<string, string> = {
                    NG: '234',
                    GH: '233',
                    GB: '44',
                    US: '1',
                    CA: '1',
                };
                setCallingCode(codes[saved] ?? '234');
            }
        };
        checkFirstLaunch();
        loadSavedCountry();
    }, []);

    const handleLogin = async () => {
        setLoginPhoneError('');
        setLoginPasswordError('');
        setLoginError('');

        let hasError = false;
        if (!phone.trim()) {
            setLoginPhoneError('Phone number is required');
            hasError = true;
        }
        if (!password) {
            setLoginPasswordError('Password is required');
            hasError = true;
        }
        if (hasError) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: getFullPhone(), password })
            });
            const data = await res.json();
            
            if (res.ok && data.access_token) {
                // Prefer server-stored country code; fall back to current picker selection
                const serverCountryCode = data.country_code || countryCode;
                await saveCountryCode(serverCountryCode);
                await login(data.access_token, data.refresh_token, data.user_id, data.shop_name, data.stores || []);
            } else {
                setLoginError(data.message || 'Invalid credentials');
            }
        } catch (e) {
            setLoginError('Could not reach the server. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotSendOtp = async () => {
        setForgotPhoneError('');
        if (!forgotPhone) {
            setForgotPhoneError('Please enter your phone number');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: getForgotFullPhone() })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                setForgotPinId(data.pinId);
                setForgotCountdown(60);
                setForgotOtp(['', '', '', '', '', '']);
                setForgotStep('otp');
            } else {
                setForgotPhoneError(data.message || 'Could not send verification code.');
            }
        } catch (e) {
            setForgotPhoneError('Could not reach the server. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotVerifyOtp = async () => {
        setForgotOtpError('');
        const otpString = forgotOtp.join('');
        if (otpString.length !== 6) {
            setForgotOtpError('Please enter the 6-digit code');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin_id: forgotPinId, pin: otpString })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                setForgotStep('password');
            } else {
                setForgotOtpError(data.message || 'The code you entered is incorrect.');
            }
        } catch (e) {
            setForgotOtpError('Could not reach the server.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotResetPassword = async () => {
        setForgotPasswordError('');
        if (!isForgotNewPasswordValid) {
            setForgotPasswordError('Password must meet all requirements');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    phone: getForgotFullPhone(),
                    pin_id: forgotPinId,
                    pin: forgotOtp.join(''),
                    password: forgotNewPassword
                })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                Alert.alert('Success', 'Your password has been successfully reset! You can now log in with your new password.', [
                    { text: 'OK', onPress: () => {
                        setForgotPasswordVisible(false);
                        setStep('login');
                        setPhone(forgotPhone);
                        setPassword('');
                    }}
                ]);
            } else {
                setForgotPasswordError(data.message || 'Failed to reset password.');
            }
        } catch (e) {
            setForgotPasswordError('Could not reach the server.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotResendOtp = async () => {
        setForgotOtp(['', '', '', '', '', '']);
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: getForgotFullPhone() })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                setForgotPinId(data.pinId);
                setForgotCountdown(60);
                Alert.alert('Success', 'Verification code resent.');
            } else {
                Alert.alert('Error', data.message || 'Could not resend verification code.');
            }
        } catch (e) {
            Alert.alert('Network Error', 'Could not reach the server.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotOtpChange = (text: string, index: number) => {
        const newOtp = [...forgotOtp];
        if (text.length > 1) {
            const pasted = text.replace(/[^0-9]/g, '').slice(0, 6);
            for (let i = 0; i < pasted.length; i++) {
                newOtp[i] = pasted[i];
            }
            setForgotOtp(newOtp);
            if (pasted.length === 6) {
                forgotOtpRefs.current[5]?.blur();
            } else {
                forgotOtpRefs.current[pasted.length]?.focus();
            }
            return;
        }

        newOtp[index] = text;
        setForgotOtp(newOtp);
        
        if (text && index < 5) {
            forgotOtpRefs.current[index + 1]?.focus();
        }
    };

    const handleForgotOtpKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !forgotOtp[index] && index > 0) {
            forgotOtpRefs.current[index - 1]?.focus();
        }
    };

    const handleRegister = async () => {
        if (!isPasswordValid) {
            Alert.alert('Error', 'Please enter a valid password');
            return;
        }

        const finalType = businessType === 'Other' ? otherBusinessType : businessType;
        if (!businessName || !finalType) {
            Alert.alert('Error', 'Business details are incomplete');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    phone: getFullPhone(), 
                    password,
                    business_name: businessName,
                    business_type: finalType,
                    country_code: countryCode
                })
            });
            const data = await res.json();
            
            if (res.ok && data.access_token) {
                await saveCountryCode(countryCode);
                await login(data.access_token, data.refresh_token, data.user_id, data.shop_name, data.stores || []);
            } else {
                Alert.alert('Registration Failed', data.message || 'An error occurred');
            }
        } catch (e) {
            Alert.alert('Network Error', 'Could not reach the server.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (text: string, index: number) => {
        const newOtp = [...otp];
        
        // Handle paste
        if (text.length > 1) {
            const pasted = text.replace(/[^0-9]/g, '').slice(0, 6);
            for (let i = 0; i < pasted.length; i++) {
                newOtp[i] = pasted[i];
            }
            setOtp(newOtp);
            if (pasted.length === 6) {
                otpRefs.current[5]?.blur();
            } else {
                otpRefs.current[pasted.length]?.focus();
            }
            return;
        }

        newOtp[index] = text;
        setOtp(newOtp);
        
        if (text && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleSendOtp = async () => {
        setPhoneError('');
        if (!phone) {
            setPhoneError('Please enter your phone number');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: getFullPhone() })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                setPinId(data.pinId);
                setCountdown(60);
                setOtp(['', '', '', '', '', '']);
                setStep('signup_otp');
            } else {
                setPhoneError(data.message || 'Could not send verification code.');
            }
        } catch (e) {
            setPhoneError('Could not reach the server. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            Alert.alert('Error', 'Please enter the 6-digit code');
            return;
        }

        if (!pinId) {
            Alert.alert('Error', 'Session expired. Please resend code.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin_id: pinId, pin: otpString })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                setStep('signup_business');
            } else {
                Alert.alert('Verification Failed', data.message || 'The code you entered is incorrect or has expired.');
            }
        } catch (e) {
            Alert.alert('Network Error', 'Could not reach the server.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setOtp(['', '', '', '', '', '']);
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: getFullPhone() })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                setPinId(data.pinId);
                setCountdown(60);
                Alert.alert('Success', 'Verification code resent.');
            } else {
                Alert.alert('Error', data.message || 'Could not resend verification code.');
            }
        } catch (e) {
            Alert.alert('Network Error', 'Could not reach the server.');
        } finally {
            setLoading(false);
        }
    };

    const renderWelcome = () => (
        <View className="flex-1 px-6 justify-center bg-primary">
            <View className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <View className="absolute -bottom-32 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
            
            <View className="flex-1 justify-center items-center">
                <View className="w-24 h-24 bg-white rounded-3xl items-center justify-center shadow-2xl shadow-black/50 mb-8">
                    <Store size={48} color="#16A34A" />
                </View>
                <Text className="text-white font-black text-5xl tracking-tight text-center mb-2">KashAm</Text>
                <Text className="text-white/80 font-bold text-base text-center max-w-[280px]">Know your money. Track your stock. Never forget who owes you.</Text>
            </View>

            <View className="mb-12">
                <TouchableOpacity 
                    onPress={() => setStep('signup_phone')}
                    className="bg-white w-full h-[52px] rounded-xl items-center justify-center shadow-lg mb-4"
                >
                    <Text className="text-primary font-black text-lg">Create Account</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    onPress={() => setStep('login')}
                    className="bg-black/20 w-full h-[52px] rounded-xl items-center justify-center"
                >
                    <Text className="text-white font-bold text-lg">Log In</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderLogin = () => (
        <View className="flex-1 bg-lightBackground px-6 pt-12">
            <TouchableOpacity onPress={() => setStep('welcome')} className="w-10 h-10 bg-white items-center justify-center rounded-full mb-8 shadow-sm">
                <ArrowLeft size={20} color="#0F172A" />
            </TouchableOpacity>
            <Text className="text-3xl font-black text-textPrimary mb-2">Welcome Back</Text>
            <Text className="text-textSecondary font-bold mb-10">Enter your details to access your store.</Text>

            <View className="mb-6">
                <Text className="text-textSecondary text-xs font-black uppercase mb-2">Phone Number</Text>
                <View className={`flex-row items-center bg-white border rounded-xl px-4 h-14 shadow-sm ${loginPhoneError ? 'border-red-500' : 'border-border'}`}>
                    <CountryPicker
                        withFilter
                        withCallingCode
                        withAlphaFilter
                        countryCode={countryCode}
                        onSelect={(country) => {
                            setCountryCode(country.cca2);
                            setCallingCode(country.callingCode[0]);
                        }}
                    />
                    <Text className="font-bold text-textPrimary mx-2">+{callingCode}</Text>
                    <TextInput 
                        className="flex-1 font-bold text-base text-textPrimary" 
                        placeholder={getPhonePlaceholder(countryCode)} 
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={(t) => {
                            setPhone(t);
                            if (loginPhoneError) setLoginPhoneError('');
                            if (loginError) setLoginError('');
                        }}
                    />
                </View>
                {loginPhoneError ? <Text className="text-red-500 font-bold text-xs mt-2 ml-1">{loginPhoneError}</Text> : null}
            </View>

            <View className="mb-8">
                <Text className="text-textSecondary text-xs font-black uppercase mb-2">Password</Text>
                <View className={`flex-row items-center bg-white border rounded-xl px-4 h-14 shadow-sm ${(loginPasswordError || loginError) ? 'border-red-500' : 'border-border'}`}>
                    <Lock size={20} color="#64748B" />
                    <TextInput 
                        className="flex-1 font-bold text-base text-textPrimary ml-3" 
                        placeholder="••••••••" 
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={(t) => {
                            setPassword(t);
                            if (loginPasswordError) setLoginPasswordError('');
                            if (loginError) setLoginError('');
                        }}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={20} color="#64748B" /> : <Eye size={20} color="#64748B" />}
                    </TouchableOpacity>
                </View>
                {(loginPasswordError || loginError) ? (
                    <Text className="text-red-500 font-bold text-xs mt-2 ml-1">{loginPasswordError || loginError}</Text>
                ) : null}
                <View className="flex-row justify-end mt-3">
                    <TouchableOpacity onPress={() => { setForgotPasswordVisible(true); setForgotStep('phone'); setForgotPhone(phone); }}>
                        <Text className="text-primary font-bold text-sm">Forgot Password?</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity 
                onPress={handleLogin}
                disabled={loading}
                className={`w-full h-[52px] rounded-xl items-center flex-row justify-center shadow-lg shadow-primary/30 ${loading ? 'bg-primary/50' : 'bg-primary active:bg-[#15803D]'}`}
            >
                {loading ? <ActivityIndicator color="white" /> : (
                    <>
                        <Text className="text-white font-black text-lg mr-2">Sign In</Text>
                        <ChevronRight size={20} color="white" />
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderSignupPhone = () => (
        <View className="flex-1 bg-lightBackground px-6 pt-12">
            <TouchableOpacity onPress={() => setStep('welcome')} className="w-10 h-10 bg-white items-center justify-center rounded-full mb-8 shadow-sm">
                <ArrowLeft size={20} color="#0F172A" />
            </TouchableOpacity>
            
            <View className="flex-row gap-1 mb-8">
                <View className="h-1 flex-1 bg-primary rounded-full" />
                <View className="h-1 flex-1 bg-border rounded-full" />
                <View className="h-1 flex-1 bg-border rounded-full" />
                <View className="h-1 flex-1 bg-border rounded-full" />
            </View>

            <Text className="text-3xl font-black text-textPrimary mb-2">Let's get started</Text>
            <Text className="text-textSecondary font-bold mb-10">What's your phone number?</Text>

            <View className="mb-10">
                <Text className="text-textSecondary text-xs font-black uppercase mb-2">Phone Number</Text>
                <View className={`flex-row items-center bg-white border rounded-xl px-4 h-14 shadow-sm ${phoneError ? 'border-red-500' : 'border-border'}`}>
                    <CountryPicker
                        withFilter
                        withCallingCode
                        withAlphaFilter
                        countryCode={countryCode}
                        onSelect={(country) => {
                            setCountryCode(country.cca2);
                            setCallingCode(country.callingCode[0]);
                        }}
                    />
                    <Text className="font-bold text-textPrimary mx-2">+{callingCode}</Text>
                    <TextInput 
                        className="flex-1 font-bold text-base text-textPrimary" 
                        placeholder={getPhonePlaceholder(countryCode)} 
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={(t) => {
                            setPhone(t);
                            if (phoneError) setPhoneError('');
                        }}
                        autoFocus
                    />
                </View>
                {phoneError ? (
                    <Text className="text-red-500 font-bold text-xs mt-2 ml-1">{phoneError}</Text>
                ) : null}
            </View>

            <TouchableOpacity 
                onPress={handleSendOtp}
                disabled={loading || !phone}
                className={`w-full h-[52px] rounded-xl items-center flex-row justify-center shadow-sm ${(phone && !loading) ? 'bg-primary active:bg-[#15803D]' : 'bg-primary/50'}`}
            >
                {loading ? <ActivityIndicator color="white" /> : (
                    <>
                        <Text className="text-white font-black text-lg mr-2">Continue</Text>
                        <ChevronRight size={20} color="white" />
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderSignupOtp = () => (
        <View className="flex-1 bg-lightBackground px-6 pt-12">
            <TouchableOpacity onPress={() => setStep('signup_phone')} className="w-10 h-10 bg-white items-center justify-center rounded-full mb-8 shadow-sm">
                <ArrowLeft size={20} color="#0F172A" />
            </TouchableOpacity>
            
            <View className="flex-row gap-1 mb-8">
                <View className="h-1 flex-1 bg-primary rounded-full" />
                <View className="h-1 flex-1 bg-primary rounded-full" />
                <View className="h-1 flex-1 bg-border rounded-full" />
                <View className="h-1 flex-1 bg-border rounded-full" />
            </View>

            <Text className="text-3xl font-black text-textPrimary mb-2">Verify Phone</Text>
            <Text className="text-textSecondary font-bold mb-10">We sent a 6-digit code to +{callingCode} {phone}</Text>

            <View className="flex-row justify-between mb-8 px-2">
                {[0,1,2,3,4,5].map(i => (
                    <TextInput placeholderTextColor="#94A3B8" 
                        key={i}
                        ref={(ref) => otpRefs.current[i] = ref}
                        className={`w-12 h-14 bg-white border rounded-xl text-center text-xl font-black shadow-sm ${otp[i] ? 'border-primary text-primary' : 'border-border text-textPrimary'}`}
                        keyboardType="number-pad"
                        maxLength={6} // Allow pasting multiple
                        value={otp[i]}
                        onChangeText={(t) => handleOtpChange(t, i)}
                        onKeyPress={(e) => handleOtpKeyPress(e, i)}
                        editable={countdown > 0}
                    />
                ))}
            </View>

            <View className="flex-row justify-center items-center mb-10">
                {countdown > 0 ? (
                    <Text className="text-textSecondary font-bold">Resend code in {countdown}s</Text>
                ) : (
                    <TouchableOpacity onPress={handleResendOtp}>
                        <Text className="text-primary font-bold">Resend Code</Text>
                    </TouchableOpacity>
                )}
            </View>

            <TouchableOpacity 
                onPress={handleVerifyOtp}
                disabled={loading || otp.join('').length !== 6 || countdown === 0}
                className={`w-full h-[52px] rounded-xl items-center flex-row justify-center shadow-sm ${(otp.join('').length === 6 && countdown > 0 && !loading) ? 'bg-primary active:bg-[#15803D]' : 'bg-primary/50'}`}
            >
                {loading ? <ActivityIndicator color="white" /> : (
                    <>
                        <Text className="text-white font-black text-lg mr-2">Verify Phone</Text>
                        <ChevronRight size={20} color="white" />
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderSignupBusiness = () => (
        <View className="flex-1 bg-lightBackground px-6 pt-12">
            <TouchableOpacity onPress={() => setStep('signup_otp')} className="w-10 h-10 bg-white items-center justify-center rounded-full mb-8 shadow-sm">
                <ArrowLeft size={20} color="#0F172A" />
            </TouchableOpacity>
            
            <View className="flex-row gap-1 mb-8">
                <View className="h-1 flex-1 bg-primary rounded-full" />
                <View className="h-1 flex-1 bg-primary rounded-full" />
                <View className="h-1 flex-1 bg-primary rounded-full" />
                <View className="h-1 flex-1 bg-border rounded-full" />
            </View>

            <Text className="text-3xl font-black text-textPrimary mb-2">Business Profile</Text>
            <Text className="text-textSecondary font-bold mb-10">Tell us about your store.</Text>

            <View className="mb-6">
                <Text className="text-textSecondary text-xs font-black uppercase mb-2">Business Name</Text>
                <TextInput 
                    className="bg-white border border-border rounded-xl px-4 h-14 shadow-sm font-bold text-textPrimary"
                    placeholder="e.g. Your business name"
                    placeholderTextColor="#94A3B8"
                    value={businessName}
                    onChangeText={setBusinessName}
                />
            </View>

            <View className="mb-10 relative">
                <Text className="text-textSecondary text-xs font-black uppercase mb-2">Business Type</Text>
                <TouchableOpacity 
                    onPress={() => setTypeDropdownOpen(!typeDropdownOpen)}
                    className="bg-white border border-border rounded-xl px-4 h-14 shadow-sm flex-row items-center justify-between z-10"
                >
                    <Text className="font-bold text-textPrimary">{businessType}</Text>
                    <ChevronRight size={16} color="#64748B" style={{ transform: [{ rotate: typeDropdownOpen ? '90deg' : '0deg' }] }} />
                </TouchableOpacity>

                {typeDropdownOpen && (
                    <View className="absolute top-[80px] left-0 right-0 bg-white rounded-xl border border-border shadow-lg z-50">
                        {BUSINESS_TYPES.map(bt => (
                            <TouchableOpacity 
                                key={bt} 
                                className="px-4 py-3 border-b border-border/50"
                                onPress={() => {
                                    setBusinessType(bt);
                                    setTypeDropdownOpen(false);
                                }}
                            >
                                <Text className={`font-bold ${businessType === bt ? 'text-primary' : 'text-textPrimary'}`}>{bt}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {businessType === 'Other' && !typeDropdownOpen && (
                    <View className="mt-4">
                        <TextInput 
                            className="bg-white border border-border rounded-xl px-4 h-14 shadow-sm font-bold text-textPrimary"
                            placeholder="e.g. Your business type"
                            placeholderTextColor="#94A3B8"
                            value={otherBusinessType}
                            onChangeText={setOtherBusinessType}
                        />
                    </View>
                )}
            </View>

            {!typeDropdownOpen && (
                <TouchableOpacity 
                    onPress={() => { if(businessName) setStep('signup_password'); }}
                    className={`w-full h-[52px] rounded-xl items-center flex-row justify-center shadow-sm ${businessName ? 'bg-primary active:bg-[#15803D]' : 'bg-primary/50'}`}
                >
                    <Text className="text-white font-black text-lg mr-2">Continue</Text>
                    <ChevronRight size={20} color="white" />
                </TouchableOpacity>
            )}
        </View>
    );

    const renderSignupPassword = () => (
        <View className="flex-1 bg-lightBackground px-6 pt-12">
            <TouchableOpacity onPress={() => setStep('signup_business')} className="w-10 h-10 bg-white items-center justify-center rounded-full mb-8 shadow-sm">
                <ArrowLeft size={20} color="#0F172A" />
            </TouchableOpacity>
            
            <View className="flex-row gap-1 mb-8">
                <View className="h-1 flex-1 bg-primary rounded-full" />
                <View className="h-1 flex-1 bg-primary rounded-full" />
                <View className="h-1 flex-1 bg-primary rounded-full" />
                <View className="h-1 flex-1 bg-primary rounded-full" />
            </View>

            <Text className="text-3xl font-black text-textPrimary mb-2">Secure Account</Text>
            <Text className="text-textSecondary font-bold mb-6">Create a password to secure your store.</Text>

            <View className="mb-4">
                <Text className="text-textSecondary text-xs font-black uppercase mb-2">Password</Text>
                <View className="flex-row items-center bg-white border border-border rounded-xl px-4 h-14 shadow-sm">
                    <Lock size={20} color="#64748B" />
                    <TextInput 
                        className="flex-1 font-bold text-base text-textPrimary ml-3" 
                        placeholder="••••••••" 
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={20} color="#64748B" /> : <Eye size={20} color="#64748B" />}
                    </TouchableOpacity>
                </View>
            </View>

            <View className="bg-white rounded-xl p-4 border border-border shadow-sm mb-6">
                <View className="flex-row items-center mb-2">
                    <ShieldCheck size={16} color={hasLength ? "#16A34A" : "#CBD5E1"} />
                    <Text className={`ml-2 text-xs font-bold ${hasLength ? 'text-primary' : 'text-textSecondary'}`}>At least 8 characters</Text>
                </View>
                <View className="flex-row items-center mb-2">
                    <ShieldCheck size={16} color={hasUpper ? "#16A34A" : "#CBD5E1"} />
                    <Text className={`ml-2 text-xs font-bold ${hasUpper ? 'text-primary' : 'text-textSecondary'}`}>One uppercase letter</Text>
                </View>
                <View className="flex-row items-center mb-2">
                    <ShieldCheck size={16} color={hasNumber ? "#16A34A" : "#CBD5E1"} />
                    <Text className={`ml-2 text-xs font-bold ${hasNumber ? 'text-primary' : 'text-textSecondary'}`}>One number</Text>
                </View>
                <View className="flex-row items-center">
                    <ShieldCheck size={16} color={hasSpecial ? "#16A34A" : "#CBD5E1"} />
                    <Text className={`ml-2 text-xs font-bold ${hasSpecial ? 'text-primary' : 'text-textSecondary'}`}>One special character</Text>
                </View>
            </View>

            <TouchableOpacity 
                onPress={handleRegister}
                disabled={loading || !isPasswordValid}
                className={`w-full h-[52px] rounded-xl items-center flex-row justify-center shadow-lg shadow-primary/30 ${(loading || !isPasswordValid) ? 'bg-primary/50' : 'bg-primary active:bg-[#15803D]'}`}
            >
                {loading ? <ActivityIndicator color="white" /> : (
                    <>
                        <Text className="text-white font-black text-lg mr-2">Create Account</Text>
                        <CheckCircle size={20} color="white" />
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderWalkthrough = () => {
        const slide = WALKTHROUGH_SLIDES[walkthroughPage];
        const IconComponent = slide.icon;
        
        return (
            <View className="flex-1 bg-white px-6 justify-between pt-16 pb-12">
                <View className="flex-1 justify-center items-center px-4">
                    <View className="w-24 h-24 bg-lightGreen rounded-[30px] items-center justify-center mb-8 shadow-sm">
                        <IconComponent size={44} color="#16A34A" />
                    </View>
                    <Text className="text-textPrimary font-black text-3xl text-center mb-4 tracking-tight leading-tight">
                        {slide.title}
                    </Text>
                    <Text className="text-textSecondary font-bold text-center text-base leading-7">
                        {slide.description}
                    </Text>
                </View>
                
                <View className="mt-8">
                    <View className="flex-row justify-center gap-2 mb-8">
                        {WALKTHROUGH_SLIDES.map((_, idx) => (
                            <View 
                                key={idx} 
                                className={`h-2 rounded-full ${walkthroughPage === idx ? 'w-6 bg-primary' : 'w-2 bg-border'}`}
                            />
                        ))}
                    </View>
                    
                    <TouchableOpacity 
                        onPress={async () => {
                            if (walkthroughPage < 2) {
                                setWalkthroughPage(walkthroughPage + 1);
                            } else {
                                await AsyncStorage.setItem('hasCompletedWalkthrough', 'true');
                                setShowWalkthrough(false);
                                setStep('welcome');
                            }
                        }}
                        className="bg-primary w-full h-14 rounded-2xl items-center justify-center flex-row shadow-lg shadow-primary/30"
                    >
                        <Text className="text-white font-black text-lg mr-2">
                            {walkthroughPage === 2 ? 'Get Started' : 'Next'}
                        </Text>
                        <ChevronRight size={20} color="white" />
                    </TouchableOpacity>
                    
                    {walkthroughPage < 2 && (
                        <TouchableOpacity 
                            onPress={async () => {
                                await AsyncStorage.setItem('hasCompletedWalkthrough', 'true');
                                setShowWalkthrough(false);
                                setStep('welcome');
                            }}
                            className="items-center py-4 mt-2"
                        >
                            <Text className="text-textSecondary font-bold text-sm">Skip intro</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    if (showSplash) {
        return (
            <View className="flex-1 bg-primary items-center justify-center">
                <View className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
                <View className="absolute -bottom-32 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
                <View className="items-center justify-center">
                    <View className="w-28 h-28 bg-white rounded-[32px] items-center justify-center shadow-2xl mb-6">
                        <Store size={56} color="#16A34A" />
                    </View>
                    <Text className="text-white font-black text-5xl tracking-tight">KashAm</Text>
                    <Text className="text-white/80 font-bold text-sm mt-3 uppercase tracking-widest">Store POS & Stock</Text>
                    <ActivityIndicator size="small" color="white" style={{ marginTop: 24 }} />
                </View>
            </View>
        );
    }

    if (showWalkthrough) {
        return renderWalkthrough();
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                <View style={{ paddingTop: insets.top, flex: 1, backgroundColor: step === 'welcome' ? '#16A34A' : '#F8FAFC' }}>
                    {step === 'welcome' && renderWelcome()}
                    {step === 'login' && renderLogin()}
                    {step === 'signup_phone' && renderSignupPhone()}
                    {step === 'signup_otp' && renderSignupOtp()}
                    {step === 'signup_business' && renderSignupBusiness()}
                    {step === 'signup_password' && renderSignupPassword()}
                </View>
            </ScrollView>

            {/* Forgot Password Modal Sheet */}
            <Modal visible={forgotPasswordVisible} transparent animationType="slide">
                <View className="flex-1 bg-black/60 justify-end">
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="bg-white rounded-t-[40px] p-6" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
                        <View className="w-12 h-1.5 bg-border rounded-full self-center mb-6" />
                        
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-2xl font-black text-textPrimary">Reset Password</Text>
                            <TouchableOpacity 
                                onPress={() => { setForgotPasswordVisible(false); setForgotStep('phone'); }} 
                                className="bg-lightBackground p-2 rounded-full"
                            >
                                <X size={20} color="#0F172A" />
                            </TouchableOpacity>
                        </View>

                        {forgotStep === 'forgotStep' /* wait, forgotStep is 'phone' | 'otp' | 'password' */}
                        {forgotStep === 'phone' && (
                            <View>
                                <Text className="text-textSecondary font-bold mb-6">Enter your registered phone number to verify your identity.</Text>
                                
                                <View className={`flex-row items-center bg-lightBackground border rounded-xl px-4 h-14 mb-2 ${forgotPhoneError ? 'border-red-500' : 'border-border'}`}>
                                    <CountryPicker
                                        withFilter
                                        withCallingCode
                                        withAlphaFilter
                                        countryCode={countryCode}
                                        onSelect={(country) => {
                                            setCountryCode(country.cca2);
                                            setCallingCode(country.callingCode[0]);
                                        }}
                                    />
                                    <Text className="font-bold text-textPrimary mx-2">+{callingCode}</Text>
                                    <TextInput 
                                        className="flex-1 font-bold text-base text-textPrimary" 
                                        placeholder={getPhonePlaceholder(countryCode)} 
                                        placeholderTextColor="#94A3B8"
                                        keyboardType="phone-pad"
                                        value={forgotPhone}
                                        onChangeText={(t) => { setForgotPhone(t); if (forgotPhoneError) setForgotPhoneError(''); }}
                                        autoFocus
                                    />
                                </View>
                                {forgotPhoneError ? <Text className="text-red-500 font-bold text-xs mb-6 ml-1">{forgotPhoneError}</Text> : <View className="h-4" />}

                                <TouchableOpacity 
                                    onPress={handleForgotSendOtp}
                                    disabled={loading || !forgotPhone}
                                    className={`w-full h-[52px] rounded-xl items-center flex-row justify-center shadow-sm ${(forgotPhone && !loading) ? 'bg-primary active:bg-[#15803D]' : 'bg-primary/50'}`}
                                >
                                    {loading ? <ActivityIndicator color="white" /> : (
                                        <>
                                            <Text className="text-white font-black text-lg mr-2">Send Reset Code</Text>
                                            <ChevronRight size={20} color="white" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        {forgotStep === 'otp' && (
                            <View>
                                <Text className="text-textSecondary font-bold mb-6">We sent a 6-digit code to +{callingCode} {forgotPhone}</Text>
                                
                                <View className="flex-row justify-between mb-6 px-2">
                                    {[0,1,2,3,4,5].map(i => (
                                        <TextInput 
                                            key={i}
                                            ref={(ref) => forgotOtpRefs.current[i] = ref}
                                            className={`w-12 h-14 bg-lightBackground border rounded-xl text-center text-xl font-black shadow-sm ${forgotOtp[i] ? 'border-primary text-primary' : 'border-border text-textPrimary'} ${forgotOtpError ? 'border-red-500' : ''}`}
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            value={forgotOtp[i]}
                                            onChangeText={(t) => handleForgotOtpChange(t, i)}
                                            onKeyPress={(e) => handleForgotOtpKeyPress(e, i)}
                                            editable={forgotCountdown > 0}
                                        />
                                    ))}
                                </View>
                                {forgotOtpError ? <Text className="text-red-500 font-bold text-xs mb-6 text-center">{forgotOtpError}</Text> : null}

                                <View className="flex-row justify-center items-center mb-6">
                                    {forgotCountdown > 0 ? (
                                        <Text className="text-textSecondary font-bold">Resend code in {forgotCountdown}s</Text>
                                    ) : (
                                        <TouchableOpacity onPress={handleForgotResendOtp}>
                                            <Text className="text-primary font-bold">Resend Code</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <TouchableOpacity 
                                    onPress={handleForgotVerifyOtp}
                                    disabled={loading || forgotOtp.join('').length !== 6 || forgotCountdown === 0}
                                    className={`w-full h-[52px] rounded-xl items-center flex-row justify-center shadow-sm ${(forgotOtp.join('').length === 6 && forgotCountdown > 0 && !loading) ? 'bg-primary active:bg-[#15803D]' : 'bg-primary/50'}`}
                                >
                                    {loading ? <ActivityIndicator color="white" /> : (
                                        <>
                                            <Text className="text-white font-black text-lg mr-2">Verify Code</Text>
                                            <ChevronRight size={20} color="white" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        {forgotStep === 'password' && (
                            <View>
                                <Text className="text-textSecondary font-bold mb-6">Create a strong new password to secure your account.</Text>
                                
                                <View className={`flex-row items-center bg-lightBackground border rounded-xl px-4 h-14 mb-4 ${forgotPasswordError ? 'border-red-500' : 'border-border'}`}>
                                    <Lock size={20} color="#64748B" />
                                    <TextInput 
                                        className="flex-1 font-bold text-base text-textPrimary ml-3" 
                                        placeholder="Enter new password" 
                                        placeholderTextColor="#94A3B8"
                                        secureTextEntry={!showPassword}
                                        value={forgotNewPassword}
                                        onChangeText={setForgotNewPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <EyeOff size={20} color="#64748B" /> : <Eye size={20} color="#64748B" />}
                                    </TouchableOpacity>
                                </View>

                                {forgotPasswordError ? <Text className="text-red-500 font-bold text-xs mb-4 ml-1">{forgotPasswordError}</Text> : null}

                                <View className="bg-lightBackground rounded-xl p-4 border border-border shadow-sm mb-6">
                                    <View className="flex-row items-center mb-2">
                                        <ShieldCheck size={16} color={forgotHasLength ? "#16A34A" : "#CBD5E1"} />
                                        <Text className={`ml-2 text-xs font-bold ${forgotHasLength ? 'text-primary' : 'text-textSecondary'}`}>At least 8 characters</Text>
                                    </View>
                                    <View className="flex-row items-center mb-2">
                                        <ShieldCheck size={16} color={forgotHasUpper ? "#16A34A" : "#CBD5E1"} />
                                        <Text className={`ml-2 text-xs font-bold ${forgotHasUpper ? 'text-primary' : 'text-textSecondary'}`}>One uppercase letter</Text>
                                    </View>
                                    <View className="flex-row items-center mb-2">
                                        <ShieldCheck size={16} color={forgotHasNumber ? "#16A34A" : "#CBD5E1"} />
                                        <Text className={`ml-2 text-xs font-bold ${forgotHasNumber ? 'text-primary' : 'text-textSecondary'}`}>One number</Text>
                                    </View>
                                    <View className="flex-row items-center">
                                        <ShieldCheck size={16} color={forgotHasSpecial ? "#16A34A" : "#CBD5E1"} />
                                        <Text className={`ml-2 text-xs font-bold ${forgotHasSpecial ? 'text-primary' : 'text-textSecondary'}`}>One special character</Text>
                                    </View>
                                </View>

                                <TouchableOpacity 
                                    onPress={handleForgotResetPassword}
                                    disabled={loading || !isForgotNewPasswordValid}
                                    className={`w-full h-[52px] rounded-xl items-center flex-row justify-center shadow-lg shadow-primary/30 ${(loading || !isForgotNewPasswordValid) ? 'bg-primary/50' : 'bg-primary active:bg-[#15803D]'}`}
                                >
                                    {loading ? <ActivityIndicator color="white" /> : (
                                        <>
                                            <Text className="text-white font-black text-lg mr-2">Reset Password</Text>
                                            <CheckCircle size={20} color="white" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}
