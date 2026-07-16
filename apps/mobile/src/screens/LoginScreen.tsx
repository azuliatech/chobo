import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView,
    Modal,
    Linking,
    StyleSheet,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ChevronRight,
    ArrowLeft,
    Lock,
    Store,
    Eye,
    EyeOff,
    ShieldCheck,
    CheckCircle,
    Wallet,
    Package,
    X,
    Mail,
    User,
    Sparkles,
} from 'lucide-react-native';
import CountryPicker, { CountryCode } from 'react-native-country-picker-modal';
import { saveCountryCode } from '../hooks/useCurrency';
import AppModal from '../components/AppModal';

WebBrowser.maybeCompleteAuthSession();

type Step = 'welcome' | 'login' | 'signup_step1' | 'verify_email' | 'signup_step2' | 'reset_password';

const BUSINESS_TYPES = [
    'Provision Store',
    'Supermarket Minimart',
    'Pharmacy',
    'Food Vendor',
    'Boutique Clothing Store',
    'Electronics Phone Accessories',
    'Other',
];

const WALKTHROUGH_SLIDES = [
    {
        title: 'Stop losing your money to memory',
        description:
            'Every day, little sales slip away because you forgot to write them down. Chobo tracks every single Cedi and Naira instantly, so you go home knowing your exact profit.',
        icon: Wallet,
    },
    {
        title: "Never tell a customer \"It's finished\"",
        description:
            'Turning a customer away is like throwing away money. Chobo alerts you before your fastest-moving items run empty, keeping your shelves full and your shop busy.',
        icon: Package,
    },
    {
        title: 'Get paid back without the awkward talks',
        description:
            'Chasing customer debts feels stressful and awkward. Chobo keeps accurate, indisputable records of who owes you and lets you send polite, friendly reminders with one tap.',
        icon: ShieldCheck,
    },
];

interface LoginScreenProps {
    resetToken?: string | null;
    onClearResetToken?: () => void;
}

const GoogleIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

export default function LoginScreen({ resetToken, onClearResetToken }: LoginScreenProps) {
    const [step, setStep] = useState<Step>('welcome');

    // Auth inputs
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
    const [otherBusinessType, setOtherBusinessType] = useState('');
    const [countryCode, setCountryCode] = useState<CountryCode>('NG');
    const [callingCode, setCallingCode] = useState('234');
    const [tosAccepted, setTosAccepted] = useState(true);

    // Eye toggles
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // OTP State
    const [otpCode, setOtpCode] = useState('');
    const [countdown, setCountdown] = useState(60);
    const [verifyEmailAddress, setVerifyEmailAddress] = useState('');
    const [resendStatus, setResendStatus] = useState('');

    // Reset Password inputs
    const [newPassword, setNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);

    // Temp Auth Data (holds verified token + user ID to use in step 2 before completing signup)
    const [tempAuthData, setTempAuthData] = useState<any>(null);

    // UI states
    const [loading, setLoading] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [signupError, setSignupError] = useState('');
    const [resetError, setResetError] = useState('');

    // Inline Auth Error States
    const [loginEmailError, setLoginEmailError] = useState('');
    const [loginPasswordError, setLoginPasswordError] = useState('');
    const [signupNameError, setSignupNameError] = useState('');
    const [signupEmailError, setSignupEmailError] = useState('');
    const [signupPasswordError, setSignupPasswordError] = useState('');
    const [signupConfirmPasswordError, setSignupConfirmPasswordError] = useState('');

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

    // Custom AppModal State
    const [modalConfig, setModalConfig] = useState<{
        visible: boolean;
        type: 'success' | 'error' | 'warning' | 'info';
        title: string;
        subtitle?: string;
    }>({
        visible: false,
        type: 'info',
        title: '',
    });

    const { login } = useAuthStore();
    const insets = useSafeAreaInsets();

    // Password validation rules
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const isPasswordValid = hasLength && hasUpper && hasNumber && hasSpecial;

    // Reset password validation
    const hasResetLength = newPassword.length >= 8;
    const hasResetUpper = /[A-Z]/.test(newPassword);
    const hasResetNumber = /[0-9]/.test(newPassword);
    const hasResetSpecial = /[^A-Za-z0-9]/.test(newPassword);
    const isResetPasswordValid = hasResetLength && hasResetUpper && hasResetNumber && hasResetSpecial;

    // Splash timeout
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSplash(false);
            setShowWalkthrough(true);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    // OTP Countdown Timer
    useEffect(() => {
        if (step !== 'verify_email') return;
        if (countdown <= 0) return;
        const timer = setInterval(() => {
            setCountdown((c) => c - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [countdown, step]);

    // Handle deep linked resetToken
    useEffect(() => {
        if (resetToken) {
            setStep('reset_password');
        }
    }, [resetToken]);

    // Google OAuth setup
    const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'chobo',
        path: 'oauthredirect',
    });

    const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        redirectUri,
    });

    useEffect(() => {
        if (googleResponse?.type === 'success') {
            const idToken = googleResponse.authentication?.idToken;
            if (!idToken) {
                setModalConfig({
                    visible: true,
                    type: 'error',
                    title: 'Google sign-in failed',
                    subtitle: 'Could not get authentication token. Please try again.',
                });
                return;
            }
            handleGoogleAuth(idToken);
        }
    }, [googleResponse]);

    const handleGoogleAuth = async (idToken: string) => {
        setLoading(true);
        setLoginError('');
        setSignupError('');
        try {
            const res = await fetch(`${API_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_token: idToken }),
            });
            const data = await res.json();
            if (res.ok) {
                if (data.isNewUser) {
                    setTempAuthData(data);
                    setStep('signup_step2');
                } else {
                    const workspacesMapped = (data.workspaces || []).map((w: any) => ({
                        ownerId: w.workspaceId,
                        shopName: w.name,
                        role: w.role,
                        status: w.status,
                        tier: w.tier,
                    }));
                    await saveCountryCode(data.country_code || 'NG');
                    await login(data.access_token, data.refresh_token, data.user_id, data.businessName, workspacesMapped);
                }
            } else {
                setModalConfig({
                    visible: true,
                    type: 'error',
                    title: 'Google sign-in failed',
                    subtitle: 'Please try again or use email instead',
                });
            }
        } catch (e) {
            setModalConfig({
                visible: true,
                type: 'error',
                title: 'Google sign-in failed',
                subtitle: 'Please try again or use email instead',
            });
        } finally {
            setLoading(false);
        }
    };

    const validateEmail = (val: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!val.trim() || !emailRegex.test(val.trim())) {
            setLoginEmailError('Enter a valid email address');
            return false;
        }
        setLoginEmailError('');
        return true;
    };

    const validatePassword = (val: string) => {
        if (!val.trim()) {
            setLoginPasswordError('Password is required');
            return false;
        }
        setLoginPasswordError('');
        return true;
    };

    const validateSignupName = (val: string) => {
        if (!val.trim()) {
            setSignupNameError('Full name is required');
            return false;
        }
        setSignupNameError('');
        return true;
    };

    const validateSignupEmail = (val: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!val.trim() || !emailRegex.test(val.trim())) {
            setSignupEmailError('Enter a valid email address');
            return false;
        }
        setSignupEmailError('');
        return true;
    };

    const validateSignupPassword = (val: string) => {
        if (!val.trim()) {
            setSignupPasswordError('Password is required');
            return false;
        }
        if (!isPasswordValid) {
            setSignupPasswordError('Password does not meet requirements');
            return false;
        }
        setSignupPasswordError('');
        return true;
    };

    const validateSignupConfirmPassword = (val: string) => {
        if (!val.trim()) {
            setSignupConfirmPasswordError('Please confirm your password');
            return false;
        }
        if (val !== password) {
            setSignupConfirmPasswordError('Passwords do not match');
            return false;
        }
        setSignupConfirmPasswordError('');
        return true;
    };

    // ── Login Action ─────────────────────────────────────────────────────────
    const handleLogin = async () => {
        setLoginEmailError('');
        setLoginPasswordError('');

        const isEmailValid = validateEmail(email);
        const isPassValid = validatePassword(password);

        if (!isEmailValid || !isPassValid) {
            return;
        }

        setLoading(true);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
                signal: controller.signal,
            });
            const data = await res.json();

            if (res.status === 403) {
                setVerifyEmailAddress(email.toLowerCase().trim());
                setCountdown(60);
                setStep('verify_email');
            } else if (res.ok && data.access_token) {
                const workspacesMapped = (data.workspaces || []).map((w: any) => ({
                    ownerId: w.workspaceId,
                    shopName: w.name,
                    role: w.role,
                    status: w.status,
                    tier: w.tier,
                }));
                await saveCountryCode(data.country_code || countryCode);
                await login(data.access_token, data.refresh_token, data.user_id, data.businessName, workspacesMapped);
            } else {
                setLoginPasswordError('Incorrect email or password');
            }
        } catch (e: any) {
            if (e?.name === 'AbortError') {
                setLoginPasswordError('Server is waking up — please try again in a moment.');
            } else {
                setLoginPasswordError('Could not reach the server. Please check your connection.');
            }
        } finally {
            clearTimeout(timeout);
            setLoading(false);
        }
    };

    // ── Signup Step 1 Action ──────────────────────────────────────────────────
    const handleSignupStep1 = async () => {
        setSignupError('');
        setSignupNameError('');
        setSignupEmailError('');
        setSignupPasswordError('');
        setSignupConfirmPasswordError('');

        const isNameValid = validateSignupName(name);
        const isEmailValid = validateSignupEmail(email);
        const isPassValid = validateSignupPassword(password);
        const isConfirmValid = validateSignupConfirmPassword(confirmPassword);

        if (!isNameValid || !isEmailValid || !isPassValid || !isConfirmValid) {
            return;
        }
        if (!tosAccepted) {
            setSignupError('You must accept the terms to create an account');
            return;
        }

        setLoading(true);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    password,
                    name: name.trim(),
                    country_code: countryCode,
                    tos_accepted: tosAccepted,
                    business_name: `${name.trim()}'s Store`,
                    business_type: 'Other',
                }),
                signal: controller.signal,
            });
            const data = await res.json();

            if (res.ok) {
                setVerifyEmailAddress(email.toLowerCase().trim());
                setCountdown(60);
                setOtpCode('');
                setStep('verify_email');
                setModalConfig({
                    visible: true,
                    type: 'success',
                    title: 'Verification Code Sent',
                    subtitle: 'A 6-digit verification code has been sent to your email.',
                });
            } else {
                setSignupError(data.message || 'Registration failed');
            }
        } catch (e: any) {
            if (e?.name === 'AbortError') {
                setSignupError('Server is waking up — please try again in a moment.');
            } else {
                setSignupError('Could not reach the server. Please check your connection.');
            }
        } finally {
            clearTimeout(timeout);
            setLoading(false);
        }
    };

    // ── Verify OTP Action ─────────────────────────────────────────────────────
    const handleVerifyOtp = async (code: string) => {
        setLoading(true);
        setSignupError('');
        try {
            const res = await fetch(`${API_URL}/auth/verify-email-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: verifyEmailAddress, code }),
            });
            const data = await res.json();

            if (res.ok) {
                // Email verified! Auto login using password from state
                const loginRes = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: verifyEmailAddress, password }),
                });
                const loginData = await loginRes.json();
                if (loginRes.ok) {
                    setTempAuthData(loginData);
                    setStep('signup_step2');
                } else {
                    setModalConfig({
                        visible: true,
                        type: 'success',
                        title: 'Email Verified',
                        subtitle: 'Please log in with your credentials to set up your business details.',
                    });
                    setStep('login');
                }
            } else {
                setSignupError(data.message || 'OTP verification failed.');
            }
        } catch (e) {
            setSignupError('Could not reach the server. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    // ── Resend Verification OTP ───────────────────────────────────────────────
    const handleResendOtp = async () => {
        setResendStatus('');
        try {
            const res = await fetch(`${API_URL}/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: verifyEmailAddress }),
            });
            const data = await res.json();
            if (res.ok) {
                setCountdown(60);
                setOtpCode('');
                setResendStatus('Verification code resent successfully!');
            } else {
                setResendStatus(data.message || 'Failed to resend code.');
            }
        } catch (e) {
            setResendStatus('Connection error. Check your network.');
        }
    };

    // ── Complete Setup (Step 2) Action ────────────────────────────────────────
    const handleCompleteSetup = async () => {
        setSignupError('');
        if (!businessName.trim()) {
            setSignupError('Business Name is required');
            return;
        }

        const finalType = businessType === 'Other' ? otherBusinessType : businessType;
        if (!finalType.trim()) {
            setSignupError('Please specify your business type');
            return;
        }

        setLoading(true);
        try {
            const activeWorkspaceId = tempAuthData.workspaces[0]?.workspaceId;
            const res = await fetch(`${API_URL}/workspaces/${activeWorkspaceId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${tempAuthData.access_token}`,
                    'x-workspace-id': activeWorkspaceId,
                },
                body: JSON.stringify({
                    name: businessName.trim(),
                    business_type: finalType,
                }),
            });

            if (res.ok) {
                const workspacesMapped = (tempAuthData.workspaces || []).map((w: any) => ({
                    ownerId: w.workspaceId,
                    shopName: w.workspaceId === activeWorkspaceId ? businessName.trim() : w.name,
                    role: w.role,
                    status: w.status,
                    tier: w.tier,
                }));
                await saveCountryCode(tempAuthData.country_code || countryCode);
                await login(
                    tempAuthData.access_token,
                    tempAuthData.refresh_token,
                    tempAuthData.user_id,
                    businessName.trim(),
                    workspacesMapped
                );
            } else {
                setSignupError('Failed to save store details. Please try again.');
            }
        } catch (e) {
            setSignupError('Network error while completing setup.');
        } finally {
            setLoading(false);
        }
    };

    // ── Reset Password Action ─────────────────────────────────────────────────
    const handleResetPassword = async () => {
        setResetError('');
        if (!newPassword.trim()) {
            setResetError('Please enter a new password');
            return;
        }
        if (!isResetPasswordValid) {
            setResetError('Password does not meet complexity requirements');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: resetToken, new_password: newPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setModalConfig({
                    visible: true,
                    type: 'success',
                    title: 'Password Updated',
                    subtitle: 'Your password has been reset successfully. You can now log in.',
                });
                onClearResetToken?.();
                setStep('login');
            } else {
                setResetError(data.message || 'Failed to reset password.');
            }
        } catch (e) {
            setResetError('Connection error. Could not reset password.');
        } finally {
            setLoading(false);
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
                body: JSON.stringify({ email: forgotEmail.toLowerCase().trim() }),
            });
            if (res.ok) {
                setModalConfig({
                    visible: true,
                    type: 'success',
                    title: 'Email Sent',
                    subtitle: 'If an account exists, a password reset link has been sent to your email.',
                });
                setForgotPasswordVisible(false);
                setForgotEmail('');
            } else {
                const data = await res.json();
                setForgotError(data.message || 'Failed to send reset link');
            }
        } catch (e) {
            setForgotError('Connection error. Try again.');
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
                <Text className="text-white font-black text-5xl tracking-tight text-center mb-2">Chobo</Text>
                <Text className="text-white/80 font-bold text-base text-center max-w-[280px]">
                    Know your money. Track your stock. Never forget who owes you.
                </Text>
            </View>

            <View className="mb-12">
                <TouchableOpacity
                    onPress={() => setStep('signup_step1')}
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
            <TouchableOpacity
                onPress={() => setStep('welcome')}
                className="w-10 h-10 bg-white items-center justify-center rounded-full mb-8 shadow-sm"
            >
                <ArrowLeft size={20} color="#0F172A" />
            </TouchableOpacity>
            <Text className="text-3xl font-black text-textPrimary mb-2">Welcome Back</Text>
            <Text className="text-textSecondary font-bold mb-8">Enter your details to access your store.</Text>

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
                        onChangeText={(t) => {
                            setEmail(t);
                            setLoginEmailError('');
                        }}
                        onBlur={() => validateEmail(email)}
                    />
                </View>
                {loginEmailError ? (
                    <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{loginEmailError}</Text>
                ) : null}
            </View>

            <View className="mb-4">
                <Text className="text-textSecondary text-xs font-black uppercase mb-2">Password</Text>
                <View className="flex-row items-center bg-white border border-border rounded-xl px-4 h-14 shadow-sm">
                    <Lock size={20} color="#94A3B8" className="mr-3" />
                    <TextInput
                        className="flex-1 font-bold text-base text-textPrimary"
                        placeholder="Enter password"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={(t) => {
                            setPassword(t);
                            setLoginPasswordError('');
                        }}
                        onBlur={() => validatePassword(password)}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
                    </TouchableOpacity>
                </View>
                {loginPasswordError ? (
                    <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{loginPasswordError}</Text>
                ) : null}
            </View>

            <TouchableOpacity onPress={() => setForgotPasswordVisible(true)} className="align-self-end mb-8">
                <Text className="text-primary font-bold text-sm text-right">Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={handleLogin}
                disabled={loading || !email.trim() || !password.trim()}
                className={`w-full h-14 rounded-xl items-center justify-center shadow-lg shadow-primary/20 mb-6 ${
                    loading || !email.trim() || !password.trim() ? 'bg-primary/50' : 'bg-primary'
                }`}
            >
                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg">Log In</Text>}
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => googlePromptAsync()}
                disabled={!googleRequest || loading}
                className="w-full h-14 bg-white border border-border rounded-xl items-center justify-center flex-row shadow-sm"
                style={{ gap: 12 }}
            >
                <GoogleIcon size={20} />
                <Text className="text-textPrimary font-bold text-base">Continue with Google</Text>
            </TouchableOpacity>
        </View>
    );

    const renderSignupStep1 = () => (
        <ScrollView className="flex-1 bg-lightBackground px-6 pt-12" showsVerticalScrollIndicator={false}>
            <TouchableOpacity
                onPress={() => setStep('welcome')}
                className="w-10 h-10 bg-white items-center justify-center rounded-full mb-6 shadow-sm"
            >
                <ArrowLeft size={20} color="#0F172A" />
            </TouchableOpacity>

            <Text className="text-3xl font-black text-textPrimary mb-2">Create Account</Text>
            <Text className="text-textSecondary font-bold mb-8">Register credentials for your Chobo account.</Text>

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
                        onChangeText={(t) => {
                            setName(t);
                            setSignupNameError('');
                        }}
                        onBlur={() => validateSignupName(name)}
                    />
                </View>
                {signupNameError ? (
                    <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{signupNameError}</Text>
                ) : null}
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
                        onChangeText={(t) => {
                            setEmail(t);
                            setSignupEmailError('');
                        }}
                        onBlur={() => validateSignupEmail(email)}
                    />
                </View>
                {signupEmailError ? (
                    <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{signupEmailError}</Text>
                ) : null}
            </View>

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
                    <Text className="font-bold text-base text-textPrimary ml-3">
                        {countryCode === 'NG' ? 'Nigeria' : countryCode === 'GH' ? 'Ghana' : 'Other'}
                    </Text>
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
                        onChangeText={(t) => {
                            setPassword(t);
                            setSignupPasswordError('');
                        }}
                        onBlur={() => validateSignupPassword(password)}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
                    </TouchableOpacity>
                </View>
                {signupPasswordError ? (
                    <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{signupPasswordError}</Text>
                ) : null}

                {/* Password Strength Checklist */}
                {password.length > 0 && (
                    <View className="bg-white border border-border rounded-xl p-4 mt-2">
                        <Text className="text-textSecondary text-[11px] font-black uppercase mb-2">
                            Password Requirements
                        </Text>
                        <View className="flex-row items-center mb-1">
                            <CheckCircle size={14} color={hasLength ? '#16A34A' : '#94A3B8'} />
                            <Text className={`text-xs ml-2 font-bold ${hasLength ? 'text-primary' : 'text-textSecondary'}`}>
                                At least 8 characters
                            </Text>
                        </View>
                        <View className="flex-row items-center mb-1">
                            <CheckCircle size={14} color={hasUpper ? '#16A34A' : '#94A3B8'} />
                            <Text className={`text-xs ml-2 font-bold ${hasUpper ? 'text-primary' : 'text-textSecondary'}`}>
                                At least 1 uppercase letter
                            </Text>
                        </View>
                        <View className="flex-row items-center mb-1">
                            <CheckCircle size={14} color={hasNumber ? '#16A34A' : '#94A3B8'} />
                            <Text className={`text-xs ml-2 font-bold ${hasNumber ? 'text-primary' : 'text-textSecondary'}`}>
                                At least 1 number
                            </Text>
                        </View>
                        <View className="flex-row items-center">
                            <CheckCircle size={14} color={hasSpecial ? '#16A34A' : '#94A3B8'} />
                            <Text className={`text-xs ml-2 font-bold ${hasSpecial ? 'text-primary' : 'text-textSecondary'}`}>
                                At least 1 special character
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Confirm Password */}
            <View className="mb-5">
                <Text className="text-textSecondary text-xs font-black uppercase mb-2">Confirm Password</Text>
                <View className="flex-row items-center bg-white border border-border rounded-xl px-4 h-14 shadow-sm">
                    <Lock size={20} color="#94A3B8" className="mr-3" />
                    <TextInput
                        className="flex-1 font-bold text-base text-textPrimary"
                        placeholder="Confirm password"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showConfirmPassword}
                        value={confirmPassword}
                        onChangeText={(t) => {
                            setConfirmPassword(t);
                            setSignupConfirmPasswordError('');
                        }}
                        onBlur={() => validateSignupConfirmPassword(confirmPassword)}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
                    </TouchableOpacity>
                </View>
                {signupConfirmPasswordError ? (
                    <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{signupConfirmPasswordError}</Text>
                ) : null}
            </View>

            {signupError ? <Text className="text-red-500 font-bold text-xs mb-6 text-center">{signupError}</Text> : null}

            <TouchableOpacity
                onPress={handleSignupStep1}
                disabled={loading || !name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()}
                className={`w-full h-14 rounded-xl items-center justify-center shadow-lg shadow-primary/20 mb-4 ${
                    loading || !name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() ? 'bg-primary/50' : 'bg-primary'
                }`}
            >
                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg">Next Step</Text>}
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => googlePromptAsync()}
                disabled={!googleRequest || loading}
                className="w-full h-14 bg-white border border-border rounded-xl items-center justify-center flex-row shadow-sm mb-12"
            >
                <Text className="text-textPrimary font-bold text-base ml-2">Sign up with Google</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    const renderVerifyEmail = () => {
        const boxes = [];
        for (let i = 0; i < 6; i++) {
            const char = otpCode[i] || '';
            const isFocused = otpCode.length === i;
            boxes.push(
                <View
                    key={i}
                    className={`w-12 h-14 bg-white border-2 rounded-xl items-center justify-center ${
                        isFocused ? 'border-primary' : 'border-border'
                    }`}
                >
                    <Text className="text-xl font-bold text-textPrimary">{char}</Text>
                </View>
            );
        }

        return (
            <View className="flex-1 bg-lightBackground px-6 justify-center items-center">
                <View className="w-20 h-20 bg-green-50 rounded-full items-center justify-center mb-8">
                    <Mail size={40} color="#16A34A" />
                </View>
                <Text className="text-2xl font-black text-textPrimary text-center mb-3">Verify Your Email</Text>
                <Text className="text-textSecondary font-bold text-center mb-8 max-w-[280px]">
                    Enter the 6-digit verification code sent to <Text className="text-textPrimary">{verifyEmailAddress}</Text>
                </Text>

                {/* OTP Boxes Grid */}
                <View className="relative w-full items-center mb-8">
                    <View className="flex-row justify-center gap-2">{boxes}</View>
                    <TextInput
                        style={StyleSheet.absoluteFill}
                        value={otpCode}
                        onChangeText={(t) => {
                            const clean = t.replace(/[^0-9]/g, '').slice(0, 6);
                            setOtpCode(clean);
                            if (clean.length === 6) {
                                handleVerifyOtp(clean);
                            }
                        }}
                        keyboardType="number-pad"
                        maxLength={6}
                        caretHidden
                    />
                </View>

                {countdown > 0 ? (
                    <Text className="text-textSecondary font-bold text-sm mb-6">
                        Resend code in <Text className="text-primary font-black">{countdown}s</Text>
                    </Text>
                ) : (
                    <TouchableOpacity onPress={handleResendOtp} className="mb-6">
                        <Text className="text-primary font-black text-sm">Resend Verification Code</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    onPress={() => Linking.openURL('mailto:').catch(() => {})}
                    className="bg-white border border-border w-full h-[52px] rounded-xl items-center justify-center shadow-sm mb-4"
                >
                    <Text className="text-textPrimary font-bold text-base">Open Email App</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep('login')} className="w-full h-[52px] rounded-xl items-center justify-center">
                    <Text className="text-primary font-black text-base">Back to Login</Text>
                </TouchableOpacity>

                {resendStatus ? (
                    <Text className="text-primary font-bold text-xs mt-6 text-center">{resendStatus}</Text>
                ) : null}
            </View>
        );
    };

    const renderSignupStep2 = () => (
        <ScrollView className="flex-1 bg-lightBackground px-6 pt-12" showsVerticalScrollIndicator={false}>
            <Text className="text-3xl font-black text-textPrimary mb-2">Setup Business</Text>
            <Text className="text-textSecondary font-bold mb-8">Enter your business details to configure your store.</Text>

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
                    <ChevronRight
                        size={20}
                        color="#94A3B8"
                        style={{ transform: [{ rotate: typeDropdownOpen ? '90deg' : '0deg' }] }}
                    />
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

            {signupError ? <Text className="text-red-500 font-bold text-xs mb-6 text-center">{signupError}</Text> : null}

            <TouchableOpacity
                onPress={handleCompleteSetup}
                disabled={loading}
                className="w-full h-14 bg-primary rounded-xl items-center justify-center shadow-lg shadow-primary/20 mb-12"
            >
                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg">Complete Setup</Text>}
            </TouchableOpacity>
        </ScrollView>
    );

    const renderResetPassword = () => (
        <View className="flex-1 bg-lightBackground px-6 pt-12">
            <Text className="text-3xl font-black text-textPrimary mb-2">Set New Password</Text>
            <Text className="text-textSecondary font-bold mb-8">Enter your new password to secure your account.</Text>

            <View className="mb-5">
                <Text className="text-textSecondary text-xs font-black uppercase mb-2">New Password</Text>
                <View className="flex-row items-center bg-white border border-border rounded-xl px-4 h-14 shadow-sm">
                    <Lock size={20} color="#94A3B8" className="mr-3" />
                    <TextInput
                        className="flex-1 font-bold text-base text-textPrimary"
                        placeholder="At least 8 characters"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showNewPassword}
                        value={newPassword}
                        onChangeText={setNewPassword}
                    />
                    <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
                    </TouchableOpacity>
                </View>

                {/* Password Strength Checklist */}
                {newPassword.length > 0 && (
                    <View className="bg-white border border-border rounded-xl p-4 mt-4">
                        <Text className="text-textSecondary text-[11px] font-black uppercase mb-2">
                            Password Requirements
                        </Text>
                        <View className="flex-row items-center mb-1">
                            <CheckCircle size={14} color={hasResetLength ? '#16A34A' : '#94A3B8'} />
                            <Text className={`text-xs ml-2 font-bold ${hasResetLength ? 'text-primary' : 'text-textSecondary'}`}>
                                At least 8 characters
                            </Text>
                        </View>
                        <View className="flex-row items-center mb-1">
                            <CheckCircle size={14} color={hasResetUpper ? '#16A34A' : '#94A3B8'} />
                            <Text className={`text-xs ml-2 font-bold ${hasResetUpper ? 'text-primary' : 'text-textSecondary'}`}>
                                At least 1 uppercase letter
                            </Text>
                        </View>
                        <View className="flex-row items-center mb-1">
                            <CheckCircle size={14} color={hasResetNumber ? '#16A34A' : '#94A3B8'} />
                            <Text className={`text-xs ml-2 font-bold ${hasResetNumber ? 'text-primary' : 'text-textSecondary'}`}>
                                At least 1 number
                            </Text>
                        </View>
                        <View className="flex-row items-center">
                            <CheckCircle size={14} color={hasResetSpecial ? '#16A34A' : '#94A3B8'} />
                            <Text className={`text-xs ml-2 font-bold ${hasResetSpecial ? 'text-primary' : 'text-textSecondary'}`}>
                                At least 1 special character
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {resetError ? <Text className="text-red-500 font-bold text-xs mb-6 text-center">{resetError}</Text> : null}

            <TouchableOpacity
                onPress={handleResetPassword}
                disabled={loading}
                className="w-full h-14 bg-primary rounded-xl items-center justify-center shadow-lg shadow-primary/20 mb-6"
            >
                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg">Update Password</Text>}
            </TouchableOpacity>
        </View>
    );

    const renderWalkthrough = () => {
        const slide = WALKTHROUGH_SLIDES[walkthroughPage];
        const SlideIcon = slide.icon;
        return (
            <View className="flex-1 bg-white justify-between px-6 pb-12 pt-16">
                <View className="items-end">
                    <TouchableOpacity
                        onPress={() => {
                            setShowWalkthrough(false);
                            setStep('welcome');
                        }}
                    >
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
                                className={`h-2 rounded-full mx-1.5 ${
                                    walkthroughPage === i ? 'w-6 bg-primary' : 'w-2 bg-border'
                                }`}
                            />
                        ))}
                    </View>

                    <TouchableOpacity
                        onPress={() => {
                            if (walkthroughPage < WALKTHROUGH_SLIDES.length - 1) {
                                setWalkthroughPage((p) => p + 1);
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
                    <Text className="text-white font-black text-5xl tracking-tight">Chobo</Text>
                    <Text className="text-white/80 font-bold text-sm mt-3 uppercase tracking-widest">
                        Store POS & Stock
                    </Text>
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
                <View
                    style={{
                        paddingTop: insets.top,
                        flex: 1,
                        backgroundColor: step === 'welcome' ? '#16A34A' : '#F8FAFC',
                    }}
                >
                    {step === 'welcome' && renderWelcome()}
                    {step === 'login' && renderLogin()}
                    {step === 'signup_step1' && renderSignupStep1()}
                    {step === 'verify_email' && renderVerifyEmail()}
                    {step === 'signup_step2' && renderSignupStep2()}
                    {step === 'reset_password' && renderResetPassword()}
                </View>
            </ScrollView>

            {/* Forgot Password Modal Sheet */}
            <Modal visible={forgotPasswordVisible} transparent animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    className="flex-1 bg-black/60 justify-end"
                >
                    <ScrollView 
                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <TouchableOpacity activeOpacity={1} className="flex-1" onPress={() => {
                            setForgotPasswordVisible(false);
                            setForgotEmail('');
                            setForgotError('');
                        }} />
                        <View
                            className="bg-white rounded-t-[40px] p-6"
                            style={{ paddingBottom: Math.max(insets.bottom, 24) }}
                        >
                            <View className="w-12 h-1.5 bg-border rounded-full self-center mb-6" />

                            <View className="flex-row justify-between items-center mb-6">
                                <Text className="text-2xl font-black text-textPrimary">Reset Password</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setForgotPasswordVisible(false);
                                        setForgotEmail('');
                                        setForgotError('');
                                    }}
                                    className="bg-lightBackground p-2 rounded-full"
                                >
                                    <X size={20} color="#0F172A" />
                                </TouchableOpacity>
                            </View>

                            <View>
                                <Text className="text-textSecondary font-bold mb-6">
                                    Enter your registered email address to receive a secure password reset link.
                                </Text>

                                <View
                                    className={`flex-row items-center bg-lightBackground border rounded-xl px-4 h-14 mb-2 ${
                                        forgotError ? 'border-red-500' : 'border-border'
                                    }`}
                                >
                                    <Mail size={20} color="#94A3B8" className="mr-3" />
                                    <TextInput
                                        className="flex-1 font-bold text-base text-textPrimary"
                                        placeholder="e.g. name@company.com"
                                        placeholderTextColor="#94A3B8"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={forgotEmail}
                                        onChangeText={(t) => {
                                            setForgotEmail(t);
                                            if (forgotError) setForgotError('');
                                        }}
                                        autoFocus
                                    />
                                </View>
                                {forgotError ? (
                                    <Text className="text-red-500 font-bold text-xs mb-6 ml-1">{forgotError}</Text>
                                ) : (
                                    <View className="h-4" />
                                )}

                                <TouchableOpacity
                                    onPress={handleForgotPassword}
                                    disabled={forgotLoading || !forgotEmail}
                                    className={`w-full h-[52px] rounded-xl items-center flex-row justify-center shadow-sm ${
                                        forgotEmail && !forgotLoading ? 'bg-primary active:bg-[#15803D]' : 'bg-primary/50'
                                    }`}
                                >
                                    {forgotLoading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <>
                                            <Text className="text-white font-black text-lg mr-2">Send Reset Link</Text>
                                            <ChevronRight size={20} color="white" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>

            <AppModal
                visible={modalConfig.visible}
                type={modalConfig.type}
                title={modalConfig.title}
                subtitle={modalConfig.subtitle}
                onDismiss={() => setModalConfig((prev) => ({ ...prev, visible: false }))}
            />
        </KeyboardAvoidingView>
    );
}
