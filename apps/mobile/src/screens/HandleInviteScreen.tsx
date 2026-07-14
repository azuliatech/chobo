import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import {
    Users,
    CheckCircle,
    XCircle,
    AlertTriangle,
    LogIn,
} from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../config';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InviteDetails {
    workspaceName: string;
    role: string;
    email: string;
    emailExists: boolean;
    hasGoogleAccount: boolean;
}

type ScreenState =
    | 'loading'
    | 'loaded'
    | 'accepting'
    | 'accepted'
    | 'declining'
    | 'declined'
    | 'error';

interface Props {
    inviteToken: string;
    onClose: () => void;
    onLoginRequired: () => void;   // navigate to login screen
    onRegisterRequired: () => void; // navigate to register screen (pre-fill email)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
    MANAGER: 'Manager',
    STAFF: 'Staff Member',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function HandleInviteScreen({
    inviteToken,
    onClose,
    onLoginRequired,
    onRegisterRequired,
}: Props) {
    const { token: authToken, setStores, stores } = useAuthStore();
    const isLoggedIn = !!authToken;

    const [state, setState] = useState<ScreenState>('loading');
    const [invite, setInvite] = useState<InviteDetails | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    // ── Load Invite Details ────────────────────────────────────────────────────

    useEffect(() => {
        if (!inviteToken) {
            setErrorMessage('Invalid invite link.');
            setState('error');
            return;
        }
        loadInvite();
    }, [inviteToken]);

    const loadInvite = async () => {
        setState('loading');
        try {
            const res = await fetch(`${API_URL}/auth/invite?token=${inviteToken}`);
            const data = await res.json();

            if (!res.ok) {
                setErrorMessage(data.message || 'This invite link is invalid or has expired.');
                setState('error');
                return;
            }

            setInvite(data);
            setState('loaded');
        } catch {
            setErrorMessage('Could not load invite details. Check your connection.');
            setState('error');
        }
    };

    // ── Accept ─────────────────────────────────────────────────────────────────

    const handleAccept = async () => {
        if (!isLoggedIn) {
            // Redirect to login/register based on account state
            invite?.emailExists ? onLoginRequired() : onRegisterRequired();
            return;
        }

        setState('accepting');
        try {
            const res = await fetch(`${API_URL}/auth/invite/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({ token: inviteToken }),
            });
            const data = await res.json();

            if (res.ok) {
                // Add the new workspace to the stores list immediately
                if (invite) {
                    const newWorkspace = {
                        ownerId: data.workspaceId,
                        shopName: data.workspaceName,
                        role: invite.role as 'OWNER' | 'MANAGER' | 'STAFF',
                        status: 'ACTIVE',
                    };
                    setStores([...stores, newWorkspace]);
                }
                setState('accepted');
            } else {
                setErrorMessage(data.message || 'Failed to accept the invitation.');
                setState('error');
            }
        } catch {
            setErrorMessage('Could not connect to the server. Please try again.');
            setState('error');
        }
    };

    // ── Decline ────────────────────────────────────────────────────────────────

    const handleDecline = async () => {
        setState('declining');
        try {
            await fetch(`${API_URL}/auth/invite/decline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: inviteToken }),
            });
        } catch {
            // Swallow — even if the network call fails, show declined state
        }
        setState('declined');
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    const roleLabel = invite ? (ROLE_LABELS[invite.role] ?? invite.role) : '';

    return (
        <View className="flex-1 bg-lightBackground">
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Loading ── */}
                {state === 'loading' && (
                    <View className="items-center gap-4">
                        <ActivityIndicator size="large" color="#16A34A" />
                        <Text className="text-textSecondary font-semibold text-sm text-center">
                            Loading invite details...
                        </Text>
                    </View>
                )}

                {/* ── Loaded — Show Invite Card ── */}
                {(state === 'loaded' || state === 'accepting' || state === 'declining') && invite && (
                    <View className="items-center">
                        {/* Chobo Logo Badge */}
                        <View className="w-20 h-20 rounded-3xl bg-primary items-center justify-center mb-6 shadow-lg">
                            <Text className="text-white text-4xl font-black">C</Text>
                        </View>

                        <Text className="text-3xl font-black text-textPrimary text-center mb-2">
                            Workspace Invitation
                        </Text>
                        <Text className="text-textSecondary text-center text-base font-semibold mb-8 px-4">
                            You've been invited to join a workspace on Chobo
                        </Text>

                        {/* Invite Details Card */}
                        <View className="w-full bg-white rounded-3xl p-6 border border-border shadow-sm mb-6">
                            <View className="flex-row items-center gap-3 mb-4">
                                <View className="w-12 h-12 bg-primary rounded-2xl items-center justify-center">
                                    <Users size={22} color="white" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xl font-black text-textPrimary">
                                        {invite.workspaceName}
                                    </Text>
                                    <Text className="text-textSecondary text-sm font-semibold">
                                        Invited as {roleLabel}
                                    </Text>
                                </View>
                            </View>

                            <View className="bg-lightBackground rounded-2xl p-4">
                                <Text className="text-textSecondary text-xs font-black uppercase tracking-widest mb-1">
                                    Invitation sent to
                                </Text>
                                <Text className="text-textPrimary font-bold text-sm">
                                    {invite.email}
                                </Text>
                            </View>
                        </View>

                        {/* Login prompt if not logged in */}
                        {!isLoggedIn && (
                            <View className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
                                <View className="flex-row items-center gap-2 mb-1">
                                    <LogIn size={16} color="#D97706" />
                                    <Text className="text-amber-700 font-black text-sm">
                                        {invite.emailExists ? 'Sign in required' : 'Create an account'}
                                    </Text>
                                </View>
                                <Text className="text-amber-600 text-xs font-semibold">
                                    {invite.emailExists
                                        ? 'You already have a Chobo account. Sign in to accept this invitation.'
                                        : 'You don\'t have a Chobo account yet. Create one to accept this invitation.'}
                                </Text>
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View className="w-full gap-3">
                            <TouchableOpacity
                                onPress={handleAccept}
                                disabled={state === 'accepting' || state === 'declining'}
                                className="bg-primary py-4 rounded-2xl items-center shadow-sm"
                                style={{ opacity: state === 'accepting' ? 0.7 : 1 }}
                            >
                                {state === 'accepting' ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-black text-base">
                                        {isLoggedIn ? 'Accept Invitation' : invite.emailExists ? 'Sign In to Accept' : 'Create Account to Accept'}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleDecline}
                                disabled={state === 'accepting' || state === 'declining'}
                                className="bg-white border border-border py-4 rounded-2xl items-center"
                                style={{ opacity: state === 'declining' ? 0.5 : 1 }}
                            >
                                {state === 'declining' ? (
                                    <ActivityIndicator color="#64748B" />
                                ) : (
                                    <Text className="text-textSecondary font-bold text-base">
                                        Decline
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── Accepted ── */}
                {state === 'accepted' && (
                    <View className="items-center">
                        <View className="w-24 h-24 bg-green-100 rounded-full items-center justify-center mb-6">
                            <CheckCircle size={52} color="#16A34A" />
                        </View>
                        <Text className="text-2xl font-black text-textPrimary text-center mb-2">
                            Invitation Accepted
                        </Text>
                        <Text className="text-textSecondary text-center font-semibold mb-8 px-4">
                            You've joined {invite?.workspaceName} as a {roleLabel}. Switch to it from the workspace switcher.
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
                            className="bg-primary px-8 py-4 rounded-2xl shadow-sm"
                        >
                            <Text className="text-white font-black text-base">Go to App</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Declined ── */}
                {state === 'declined' && (
                    <View className="items-center">
                        <View className="w-24 h-24 bg-slate-100 rounded-full items-center justify-center mb-6">
                            <XCircle size={52} color="#64748B" />
                        </View>
                        <Text className="text-2xl font-black text-textPrimary text-center mb-2">
                            Invitation Declined
                        </Text>
                        <Text className="text-textSecondary text-center font-semibold mb-8 px-4">
                            You've declined the invitation to join {invite?.workspaceName}.
                        </Text>
                        <TouchableOpacity onPress={onClose} className="bg-lightBackground border border-border px-8 py-4 rounded-2xl">
                            <Text className="text-textPrimary font-bold text-base">Close</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Error ── */}
                {state === 'error' && (
                    <View className="items-center">
                        <View className="w-24 h-24 bg-red-50 rounded-full items-center justify-center mb-6">
                            <AlertTriangle size={52} color="#EF4444" />
                        </View>
                        <Text className="text-2xl font-black text-textPrimary text-center mb-2">
                            Invite Not Found
                        </Text>
                        <Text className="text-textSecondary text-center font-semibold mb-8 px-4">
                            {errorMessage}
                        </Text>
                        <TouchableOpacity onPress={onClose} className="bg-lightBackground border border-border px-8 py-4 rounded-2xl">
                            <Text className="text-textPrimary font-bold text-base">Go Back</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
