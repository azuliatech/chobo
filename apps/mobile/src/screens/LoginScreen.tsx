import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView, Modal } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, ArrowLeft, Lock, Store, Eye, EyeOff, ShieldCheck, CheckCircle, Wallet, Package, Sparkles, X, Mail, User } from 'lucide-react-native';
import CountryPicker, { CountryCode } from 'react-native-country-picker-modal';
import { saveCountryCode } from '../hooks/useCurrency';

type Step = 'welcome' | 'login' | 'signup' | 'verify_email';

const BUSINESS_TYPES = [
    'Provision Store',
    'Supermarket Minimart',
    'Pharmacy',
    'Food Vendor',
    'Boutique Clothing Store',
    'Electronics Phone Accessories',
    'Other'
];

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
    
    // Auth inputs
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
    const [otherBusinessType, setOtherBusinessType] = useState('');
    const [countryCode, setCountryCode] = useState<CountryCode>('NG');
    const [callingCode, setCallingCode] = useState('234');
    const [tosAccepted, setTosAccepted] = useState(true);
    
    // Eye toggles
    const [showPassword, setShowPassword] = useState(false);
    
    // UI states
    const [loading, setLoading] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [signupError, setSignupError] = useState('');
    const [verifyEmailAddress, setVerifyEmailAddress] = useState('');
    const [resendStatus, setResendStatus] = useState('');
    
    // Walkthrough states
    const [showSplash, setShowSplash] = useState(true);
    const [showWalkthrough, setShowWalkthrough] = useState(false);
    const [walkthroughPage, setWalkthroughPage] = useState(0);
    
    // Dropdown/Preseter states
    const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

    // Forgot Password States
    const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotError, setForgotError] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);

    const { login } = useAuthStore();
    const insets = useSafeAreaInsets();

    // Password validation rules
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const isPasswordValid = hasLength && hasUpper && hasNumber && hasSpecial;

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSplash(false);
            setShowWalkthrough(true);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    // ── Login Action ─────────────────────────────────────────────────────────
    const handleLogin = async () => {
        setLoginError('');
        if (!email.trim() || !password) {
            setLoginError('Email and password are required');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase().trim(), password })
            });
            const data = await res.json();
            
            if (res.status === 403) {
                // Email unverified -> redirect to verification warning screen
                setVerifyEmailAddress(email.toLowerCase().trim());
                setStep('verify_email');
            } else if (res.ok && data.access_token) {
                // Map workspaces array to the frontend's expected stores format
                const workspacesMapped = (data.workspaces || []).map((w: any) => ({
                    ownerId: w.workspaceId,
                    shopName: w.name,
                    role: w.role,
                    status: w.status,
                }));
                await saveCountryCode(data.country_code || countryCode);
                await login(data.access_token, data.refresh_token, data.user_id, data.businessName, workspacesMapped);
            } else {
                setLoginError(data.message || 'Invalid email or password');
            }
        } catch (e) {
            setLoginError('Could not reach the server. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    // ── Register Action ──────────────────────────────────────────────────────
    const handleRegister = async () => {
        setSignupError('');
        if (!email.trim() || !password || !name.trim() || !businessName.trim()) {
            setSignupError('All fields are required');
            return;
        }
        if (!isPasswordValid) {
            setSignupError('Password does not meet requirements');
            return;
        }
        if (!tosAccepted) {
            setSignupError('You must accept the terms to create an account');
            return;
        }

        const finalType = businessType === 'Other' ? otherBusinessType : businessType;
        if (!finalType.trim()) {
            setSignupError('Please specify your business type');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    password,
                    name: name.trim(),
                    business_name: businessName.trim(),
                    business_type: finalType,
                    country_code: countryCode,
                    tos_accepted: tosAccepted
                })
            });
            const data = await res.json();
            
            if (res.ok) {
                setVerifyEmailAddress(email.toLowerCase().trim());
                setStep('verify_email');
                Alert.alert('Verification Sent', 'Please check your inbox for the verification email.');
            } else {
                setSignupError(data.message || 'Registration failed');
            }
        } catch (e) {
            setSignupError('Could not reach the server. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    // ── Resend Verification Email ─────────────────────────────────────────────
    const handleResendVerification = async () => {
        setResendStatus('');
        try {
            const res = await fetch(`${API_URL}/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: verifyEmailAddress })
            });
            const data = await res.json();
            if (res.ok) {
                setResendStatus('Verification email sent successfully!');
            } else {
                setResendStatus(data.message || 'Failed to resend verification email.');
            }
        } catch (e) {
            setResendStatus('Could not reach the server. Check your connection.');
        }
    };

    // ── Forgot Password Action ────────────────────────────────────────────────
    const handleForgotPassword = async () => {
        setForgotError('');
        if (!forgotEmail.trim()) {
            setForgotError('Please enter your email address');
            return;
        }

        setForgotLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail.toLowerCase().trim() })
            });
            const data = await res.json();
            if (res.ok) {
                Alert.alert('Email Sent', 'If an account exists, a password reset link has been sent to your email.');
                setForgotPasswordVisible(false);
                setForgotEmail('');
            } else {
                setForgotError(data.message || 'Failed to send reset link');
            }
        } catch (e) {
            setForgotError('Could not reach the server. Check your connection.');
        } finally {
            setForgotLoading(false);
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
                    onPress={() => setStep('signup')}
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
                <Text className="text-textSecondary text-xs font-black uppercase mb-2">Email Address</Text>
                <View className={`flex-row items-center bg-white border rounded-xl px-4 h-14 shadow-sm border-border`}>
                    <Mail size={20} color="#94A3B8" className="mr-3" />
                    <TextInput 
                        className="flex-1 font-bold text-base text-textPrimary" 
                        placeholder="e.g. name@company.com" 
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={(t) => { setEmail(t); setLoginError(''); }}
                    />
                </View>
            </View>

            <View className="mb-4">
                <Text className="text-textSecondary text-xs font-black uppercase mb-2">Password</Text>
                <View className={`flex-row items-center bg-white border rounded-xl px-4 h-14 shadow-sm border-border`}>
                    <Lock size={20} color="#94A3B8" className="mr-3" />
                    <TextInput 
                        className="flex-1 font-bold text-base text-textPrimary" 
                        placeholder="Enter password" 
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={(t) => { setPassword(t); setLoginError(''); }}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity 
                onPress={() => setForgotPasswordVisible(true)}
                className="align-self-end mb-8"
            >
                <Text className="text-primary font-bold text-sm text-right">Forgot Password?</Text>
            </TouchableOpacity>

            {loginError ? <Text className="text-red-500 font-bold text-xs mb-6 text-center">{loginError}</Text> : null}

            <TouchableOpacity 
                onPress={handleLogin}
                disabled={loading}
                className="w-full h-14 bg-primary rounded-xl items-center justify-center shadow-lg shadow-primary/20 mb-6"
            >
                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg">Log In</Text>}
            </TouchableOpacity>
        </View>
    );

    const renderSignup = () => (
        <ScrollView className="flex-1 bg-lightBackground px-6 pt-12" showsVerticalScrollIndicator={false}>
            <TouchableOpacity onPress={() => setStep('welcome')} className="w-10 h-10 bg-white items-center justify-center rounded-full mb-6 shadow-sm">
                <ArrowLeft size={20} color="#0F172A" />
            </TouchableOpacity>
            
            <Text className="text-3xl font-black text-textPrimary mb-2">Register Store</Text>
            <Text className="text-textSecondary font-bold mb-8">Set up your business and account credentials.</Text>

            {/* Name */}
            <View className="mb-5">
                <Text className="text-textSecondary text-xs font-black uppercase mb-2">Full Name</Text>
                <View className="flex-row items-center bg-white border border-border rounded-xl px-4 h-14 shadow-sm">
                    <User size={20} color="#94A3B8" className="mr-3" />
                    <TextInput 
                        className="flex-1 font-bold text-base text-textPrimary" 
                        placeholder="e.g. John Doe" 
                        placeholderTextColor="#94A3B8"
                        value={name}
                        onChangeText={setName}
                    />
                </View>
            </View>

            {/* Email */}
            <View className="mb-5">
                <Text className="text-textSecondary text-xs font-black uppercase mb-2">Email Address</Text>
                <View className="flex-row items-center bg-white border border-border rounded-xl px-4 h-14 shadow-sm">
                    <Mail size={20} color="#94A3B8" className="mr-3" />
                    <TextInput 
                        className="flex-1 font-bold text-base text-textPrimary" 
                        placeholder="e.g. name@company.com" 
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                    />
                </View>
            </View>

            {/* Business Name */}
            <View className="mb-5">
                <Text className="text-textSecondary text-xs font-black uppercase mb-2">Business Name</Text>
                <View className="flex-row items-center bg-white border border-border rounded-xl px-4 h-14 shadow-sm">
                    <Store size={20} color="#94A3B8" className="mr-3" />
                    <TextInput 
                        className="flex-1 font-bold text-base text-textPrimary" 
                        placeholder="e.g. Joyful Provisions" 
                        placeholderTextColor="#94A3B8"
                        value={businessName}
                        onChangeText={setBusinessName}
                    />
                </View>
            </View>

            {/* Business Type */}
            <View className="mb-5 relative z-50">
                <Text className="text-textSecondary text-xs font-black uppercase mb-2">Business Type</Text>
                <TouchableOpacity 
                    onPress={() => setTypeDropdownOpen(!typeDropdownOpen)}
                    className="flex-row justify-between items-center bg-white border border-border rounded-xl px-4 h-14 shadow-sm"
                >
                    <Text className="font-bold text-base text-textPrimary">{businessType}</Text>
                    <ChevronRight size={20} color="#94A3B8" style={{ transform: [{ rotate: typeDropdownOpen ? '90deg' : '0deg' }] }} />
                </TouchableOpacity>

                {typeDropdownOpen && (
                    <View className="absolute top-[80px] left-0 right-0 bg-white border border-border rounded-xl shadow-lg z-50 p-2">
                        {BUSINESS_TYPES.map((type) => (
                            <TouchableOpacity 
                                key={type} 
                                className="py-3 px-4 rounded-lg active:bg-lightBackground"
                                onPress={() => {
                                    setBusinessType(type);
                                    setTypeDropdownOpen(false);
                                }}
                            >
                                <Text className="font-bold text-textPrimary">{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {businessType === 'Other' && (
                <View className="mb-5">
                    <Text className="text-textSecondary text-xs font-black uppercase mb-2">Specify Business Type</Text>
                    <View className="bg-white border border-border rounded-xl px-4 h-14 shadow-sm justify-center">
                        <TextInput 
                            className="font-bold text-base text-textPrimary" 
                            placeholder="What do you sell?" 
                            placeholderTextColor="#94A3B8"
                            value={otherBusinessType}
                            onChangeText={setOtherBusinessType}
                        />
                    </View>
                </View>
            )}

            {/* Country Picker */}
            <View className="mb-5">
                <Text className="text-textSecondary text-xs font-black uppercase mb-2">Country</Text>
                <View className="flex-row items-center bg-white border border-border rounded-xl px-4 h-14 shadow-sm">
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
                    <Text className="font-bold text-base text-textPrimary ml-3">{countryCode === 'NG' ? 'Nigeria' : countryCode === 'GH' ? 'Ghana' : 'Other'}</Text>
                </View>
            </View>

            {/* Password */}
            <View className="mb-5">
                <Text className="text-textSecondary text-xs font-black uppercase mb-2">Password</Text>
                <View className="flex-row items-center bg-white border border-border rounded-xl px-4 h-14 shadow-sm mb-2">
                    <Lock size={20} color="#94A3B8" className="mr-3" />
                    <TextInput 
                        className="flex-1 font-bold text-base text-textPrimary" 
                        placeholder="Create password" 
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
                    </TouchableOpacity>
                </View>

                {/* Password Strength Checklist */}
                {password.length > 0 && (
                    <View className="bg-white border border-border rounded-xl p-4 mt-2">
                        <Text className="text-textSecondary text-[11px] font-black uppercase mb-2">Password Requirements</Text>
                        <View className="flex-row items-center mb-1">
                            <CheckCircle size={14} color={hasLength ? '#16A34A' : '#94A3B8'} />
                            <Text className={`text-xs ml-2 font-bold ${hasLength ? 'text-primary' : 'text-textSecondary'}`}>At least 8 characters</Text>
                        </View>
                        <View className="flex-row items-center mb-1">
                            <CheckCircle size={14} color={hasUpper ? '#16A34A' : '#94A3B8'} />
                            <Text className={`text-xs ml-2 font-bold ${hasUpper ? 'text-primary' : 'text-textSecondary'}`}>At least 1 uppercase letter</Text>
                        </View>
                        <View className="flex-row items-center mb-1">
                            <CheckCircle size={14} color={hasNumber ? '#16A34A' : '#94A3B8'} />
                            <Text className={`text-xs ml-2 font-bold ${hasNumber ? 'text-primary' : 'text-textSecondary'}`}>At least 1 number</Text>
                        </View>
                        <View className="flex-row items-center">
                            <CheckCircle size={14} color={hasSpecial ? '#16A34A' : '#94A3B8'} />
                            <Text className={`text-xs ml-2 font-bold ${hasSpecial ? 'text-primary' : 'text-textSecondary'}`}>At least 1 special character</Text>
                        </View>
                    </View>
                )}
            </View>

            {signupError ? <Text className="text-red-500 font-bold text-xs mb-6 text-center">{signupError}</Text> : null}

            <TouchableOpacity 
                onPress={handleRegister}
                disabled={loading}
                className="w-full h-14 bg-primary rounded-xl items-center justify-center shadow-lg shadow-primary/20 mb-12"
            >
                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg">Create Store</Text>}
            </TouchableOpacity>
        </ScrollView>
    );

    const renderVerifyEmail = () => (
        <View className="flex-1 bg-lightBackground px-6 justify-center items-center">
            <View className="w-20 h-20 bg-green-50 rounded-full items-center justify-center mb-8">
                <Mail size={40} color="#16A34A" />
            </View>
            <Text className="text-2xl font-black text-textPrimary text-center mb-3">Verify Your Email</Text>
            <Text className="text-textSecondary font-bold text-center mb-6 max-w-[280px]">
                We sent a verification link to <Text className="text-textPrimary">{verifyEmailAddress}</Text>. Check your inbox to activate your account.
            </Text>

            <TouchableOpacity 
                onPress={handleResendVerification}
                className="bg-white border border-border w-full h-[52px] rounded-xl items-center justify-center shadow-sm mb-4"
            >
                <Text className="text-textPrimary font-bold text-base">Resend Verification Link</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                onPress={() => setStep('login')}
                className="w-full h-[52px] rounded-xl items-center justify-center"
            >
                <Text className="text-primary font-black text-base">Back to Login</Text>
            </TouchableOpacity>

            {resendStatus ? <Text className="text-primary font-bold text-xs mt-6 text-center">{resendStatus}</Text> : null}
        </View>
    );

    const renderWalkthrough = () => {
        const slide = WALKTHROUGH_SLIDES[walkthroughPage];
        const SlideIcon = slide.icon;
        return (
            <View className="flex-1 bg-white justify-between px-6 pb-12 pt-16">
                <View className="items-end">
                    <TouchableOpacity onPress={() => { setShowWalkthrough(false); setStep('welcome'); }}>
                        <Text className="text-textSecondary font-black text-base">Skip</Text>
                    </TouchableOpacity>
                </View>

                <View className="items-center px-4">
                    <View className="w-24 h-24 bg-green-50 rounded-[32px] items-center justify-center mb-10">
                        <SlideIcon size={48} color="#16A34A" />
                    </View>
                    <Text className="text-3xl font-black text-textPrimary text-center mb-4 leading-9">{slide.title}</Text>
                    <Text className="text-textSecondary font-bold text-base text-center leading-6">{slide.description}</Text>
                </View>

                <View>
                    {/* Indicator dots */}
                    <View className="flex-row justify-center mb-10">
                        {WALKTHROUGH_SLIDES.map((_, i) => (
                            <View 
                                key={i} 
                                className={`h-2 rounded-full mx-1.5 ${walkthroughPage === i ? 'w-6 bg-primary' : 'w-2 bg-border'}`} 
                            />
                        ))}
                    </View>

                    <TouchableOpacity 
                        onPress={() => {
                            if (walkthroughPage < WALKTHROUGH_SLIDES.length - 1) {
                                setWalkthroughPage(p => p + 1);
                            } else {
                                setShowWalkthrough(false);
                                setStep('welcome');
                            }
                        }}
                        className="w-full h-14 bg-primary rounded-xl items-center justify-center flex-row shadow-lg shadow-primary/20"
                    >
                        <Text className="text-white font-black text-lg mr-2">
                            {walkthroughPage === WALKTHROUGH_SLIDES.length - 1 ? 'Get Started' : 'Next'}
                        </Text>
                        <ChevronRight size={20} color="white" />
                    </TouchableOpacity>
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
                    {step === 'signup' && renderSignup()}
                    {step === 'verify_email' && renderVerifyEmail()}
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
                                onPress={() => { setForgotPasswordVisible(false); setForgotEmail(''); setForgotError(''); }} 
                                className="bg-lightBackground p-2 rounded-full"
                            >
                                <X size={20} color="#0F172A" />
                            </TouchableOpacity>
                        </View>

                        <View>
                            <Text className="text-textSecondary font-bold mb-6">Enter your registered email address to receive a secure password reset link.</Text>
                            
                            <View className={`flex-row items-center bg-lightBackground border rounded-xl px-4 h-14 mb-2 ${forgotError ? 'border-red-500' : 'border-border'}`}>
                                <Mail size={20} color="#94A3B8" className="mr-3" />
                                <TextInput 
                                    className="flex-1 font-bold text-base text-textPrimary" 
                                    placeholder="e.g. name@company.com" 
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={forgotEmail}
                                    onChangeText={(t) => { setForgotEmail(t); if (forgotError) setForgotError(''); }}
                                    autoFocus
                                />
                            </View>
                            {forgotError ? <Text className="text-red-500 font-bold text-xs mb-6 ml-1">{forgotError}</Text> : <View className="h-4" />}

                            <TouchableOpacity 
                                onPress={handleForgotPassword}
                                disabled={forgotLoading || !forgotEmail}
                                className={`w-full h-[52px] rounded-xl items-center flex-row justify-center shadow-sm ${(forgotEmail && !forgotLoading) ? 'bg-primary active:bg-[#15803D]' : 'bg-primary/50'}`}
                            >
                                {forgotLoading ? <ActivityIndicator color="white" /> : (
                                    <>
                                        <Text className="text-white font-black text-lg mr-2">Send Reset Link</Text>
                                        <ChevronRight size={20} color="white" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}
