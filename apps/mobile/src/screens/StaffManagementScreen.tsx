import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    TextInput,
    ActivityIndicator,
    Modal,
    ScrollView,
} from 'react-native';
import {
    ArrowLeft,
    UserPlus,
    Trash2,
    Users,
    ChevronRight,
    X,
    Mail,
    Send,
} from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { buildHeaders } from '../services/syncService';
import { API_URL } from '../config';
import StaffActivityScreen from './StaffActivityScreen';
import AppModal from '../components/AppModal';

interface StaffMember {
    memberId: string;
    userId: string;
    email: string;
    name: string | null;
    role: 'MANAGER' | 'STAFF';
    status: 'ACTIVE' | 'PENDING';
    joinedAt: string;
}

const ROLE_COLORS = {
    MANAGER: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
    STAFF: { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
};

interface Props {
    onBack: () => void;
}

export default function StaffManagementScreen({ onBack }: Props) {
    const { token, activeStoreOwnerId, activeRole } = useAuthStore();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);

    // Add staff form state
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState<'MANAGER' | 'STAFF'>('STAFF');
    const [adding, setAdding] = useState(false);
    const [modal, setModal] = useState<{ visible: boolean; type: 'success' | 'error' | 'warning' | 'info'; title: string; subtitle?: string; primaryLabel?: string; onPrimary?: () => void; secondaryLabel?: string; onSecondary?: () => void; autoDismiss?: boolean } | null>(null);

    const loadStaff = useCallback(async () => {
        if (!token || !activeStoreOwnerId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/workspaces/${activeStoreOwnerId}/members`, {
                headers: buildHeaders(token, activeStoreOwnerId),
            });
            if (res.ok) {
                const data = await res.json();
                // Filter out the OWNER (which is the business owner themselves)
                const nonOwners = data.filter((m: any) => m.role !== 'OWNER');
                setStaff(nonOwners);
            }
        } catch (e) {
            console.error('Failed to load staff', e);
        } finally {
            setLoading(false);
        }
    }, [token, activeStoreOwnerId]);

    useEffect(() => {
        loadStaff();
    }, [loadStaff]);

    const handleAddStaff = async () => {
        if (!newEmail.trim() || !newEmail.includes('@')) {
            setModal({ visible: true, type: 'error', title: 'Error', subtitle: 'Please enter a valid email address' });
            return;
        }

        setAdding(true);
        try {
            const res = await fetch(`${API_URL}/workspaces/${activeStoreOwnerId}/members`, {
                method: 'POST',
                headers: buildHeaders(token!, activeStoreOwnerId),
                body: JSON.stringify({
                    email: newEmail.trim().toLowerCase(),
                    role: newRole,
                }),
            });
            const data = await res.json();

            if (res.ok) {
                setModal({ visible: true, type: 'success', title: 'Invitation Sent ✓', subtitle: `An invitation has been sent to ${newEmail}. They must accept it to join your store.`, autoDismiss: true });
                setShowAddModal(false);
                setNewEmail('');
                setNewRole('STAFF');
                loadStaff();
            } else {
                setModal({ visible: true, type: 'error', title: 'Failed', subtitle: data.message || 'Could not add staff member' });
            }
        } catch {
            setModal({ visible: true, type: 'error', title: 'Network Error', subtitle: 'Could not reach the server' });
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = (member: StaffMember) => {
        setModal({
            visible: true,
            type: 'warning',
            title: 'Remove Staff',
            subtitle: `Remove ${member.name || member.email} from your store? They will lose access immediately.`,
            primaryLabel: 'Remove',
            onPrimary: async () => {
                try {
                    const res = await fetch(`${API_URL}/workspaces/${activeStoreOwnerId}/members/${member.memberId}`, {
                        method: 'DELETE',
                        headers: buildHeaders(token!, activeStoreOwnerId),
                    });
                    if (res.ok) {
                        loadStaff();
                    } else {
                        setModal({ visible: true, type: 'error', title: 'Error', subtitle: 'Could not remove staff member' });
                    }
                } catch {
                    setModal({ visible: true, type: 'error', title: 'Network Error', subtitle: 'Could not reach the server' });
                }
            },
            secondaryLabel: 'Cancel',
        });
    };

    const handleResend = (member: StaffMember) => {
        setModal({
            visible: true,
            type: 'info',
            title: 'Resend Invitation',
            subtitle: `Send a new invitation email to ${member.email}?`,
            primaryLabel: 'Resend',
            onPrimary: async () => {
                try {
                    const res = await fetch(`${API_URL}/workspaces/${activeStoreOwnerId}/members/${member.memberId}/resend`, {
                        method: 'POST',
                        headers: buildHeaders(token!, activeStoreOwnerId),
                    });
                    if (res.ok) {
                        setModal({ visible: true, type: 'success', title: 'Success', subtitle: 'Invitation resent successfully.', autoDismiss: true });
                        loadStaff();
                    } else {
                        setModal({ visible: true, type: 'error', title: 'Error', subtitle: 'Could not resend invitation.' });
                    }
                } catch {
                    setModal({ visible: true, type: 'error', title: 'Network Error', subtitle: 'Could not reach the server' });
                }
            },
            secondaryLabel: 'Cancel',
        });
    };

    const handleCancelInvite = (member: StaffMember) => {
        setModal({
            visible: true,
            type: 'warning',
            title: 'Cancel Invitation',
            subtitle: `Cancel the pending invitation for ${member.email}?`,
            primaryLabel: 'Cancel Invite',
            onPrimary: async () => {
                try {
                    const res = await fetch(`${API_URL}/workspaces/${activeStoreOwnerId}/members/${member.memberId}/cancel`, {
                        method: 'DELETE',
                        headers: buildHeaders(token!, activeStoreOwnerId),
                    });
                    if (res.ok) {
                        loadStaff();
                    } else {
                        setModal({ visible: true, type: 'error', title: 'Error', subtitle: 'Could not cancel invitation.' });
                    }
                } catch {
                    setModal({ visible: true, type: 'error', title: 'Network Error', subtitle: 'Could not reach the server' });
                }
            },
            secondaryLabel: 'Keep',
        });
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // Navigate to activity screen for tapped staff member
    if (selectedMember) {
        return (
            <StaffActivityScreen
                memberId={selectedMember.userId}
                memberName={selectedMember.name}
                memberRole={selectedMember.role}
                onBack={() => setSelectedMember(null)}
            />
        );
    }

    return (
        <View className="flex-1 bg-lightBackground">
            {/* Header */}
            <View className="bg-white px-6 pt-14 pb-5 border-b border-border flex-row items-center gap-4">
                <TouchableOpacity
                    onPress={onBack}
                    className="w-10 h-10 bg-lightBackground rounded-2xl items-center justify-center"
                >
                    <ArrowLeft size={20} color="#0F172A" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-xl font-black text-textPrimary">Staff Management</Text>
                    <Text className="text-textSecondary text-xs font-semibold">
                        {staff.length} active staff member{staff.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => setShowAddModal(true)}
                    className="bg-primary w-10 h-10 rounded-2xl items-center justify-center"
                >
                    <UserPlus size={18} color="white" />
                </TouchableOpacity>
            </View>

            {/* Staff List */}
            {loading ? (
                <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                    {[1, 2, 3].map(i => (
                        <View
                            key={i}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 16,
                                backgroundColor: '#FFFFFF',
                                borderRadius: 16,
                                marginBottom: 12,
                                borderWidth: 0.5,
                                borderColor: '#E5E7EB',
                            }}
                        >
                            {/* Avatar placeholder */}
                            <View style={{
                                width: 44, height: 44, borderRadius: 22,
                                backgroundColor: '#F1F5F9',
                            }} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                {/* Name placeholder */}
                                <View style={{
                                    height: 14, width: '60%',
                                    backgroundColor: '#F1F5F9', borderRadius: 7, marginBottom: 8,
                                }} />
                                {/* Role placeholder */}
                                <View style={{
                                    height: 10, width: '35%',
                                    backgroundColor: '#F1F5F9', borderRadius: 5,
                                }} />
                            </View>
                        </View>
                    ))}
                </View>
            ) : staff.length === 0 ? (
                <View className="flex-1 items-center justify-center px-8 opacity-50">
                    <Users size={64} color="#64748B" />
                    <Text className="font-black text-xl text-textPrimary mt-4 text-center">No staff yet</Text>
                    <Text className="text-textSecondary text-sm text-center mt-2 font-semibold">
                        Tap the + button to add a staff member or manager to your store
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={staff}
                    keyExtractor={item => item.memberId}
                    contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                    renderItem={({ item }) => {
                        const colors = ROLE_COLORS[item.role] || ROLE_COLORS.STAFF;
                        return (
                            <TouchableOpacity
                                className="bg-white rounded-2xl p-4 mb-3 border border-border shadow-sm flex-row items-center gap-4"
                                onPress={() => item.status === 'ACTIVE' && setSelectedMember(item)}
                                activeOpacity={0.75}
                            >
                                {/* Avatar */}
                                <View className="w-12 h-12 rounded-2xl bg-[#F0FDF4] items-center justify-center">
                                    <Text className="text-primary font-black text-lg">
                                        {(item.name || item.email).charAt(0).toUpperCase()}
                                    </Text>
                                </View>

                                {/* Info */}
                                <View className="flex-1">
                                    <View className="flex-row items-center gap-2">
                                        <Text className="font-black text-textPrimary text-sm" numberOfLines={1}>
                                            {item.name || 'Invited User'}
                                        </Text>
                                        {item.status === 'PENDING' && (
                                            <View className="bg-amber-100 px-1.5 py-0.5 rounded">
                                                <Text className="text-[9px] font-bold text-amber-700">PENDING</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View className="flex-row items-center gap-1 mt-0.5">
                                        <Mail size={10} color="#94A3B8" />
                                        <Text className="text-textSecondary text-[11px] font-semibold">
                                            {item.email}
                                        </Text>
                                    </View>
                                    <Text className="text-textSecondary text-[10px] mt-1">
                                        {item.status === 'PENDING' ? `Invited ${formatDate(item.joinedAt)}` : `Joined ${formatDate(item.joinedAt)}`}
                                    </Text>
                                </View>

                                {/* Role badge + Remove/Resend */}
                                <View className="items-end gap-2">
                                    <View
                                        style={{
                                            backgroundColor: colors.bg,
                                            borderColor: colors.border,
                                            borderWidth: 1,
                                            paddingHorizontal: 8,
                                            paddingVertical: 3,
                                            borderRadius: 8,
                                        }}
                                    >
                                        <Text
                                            style={{ color: colors.text, fontSize: 10, fontWeight: '800' }}
                                        >
                                            {item.role}
                                        </Text>
                                    </View>
                                    <View className="flex-row gap-2">
                                        {item.status === 'PENDING' && (
                                            <TouchableOpacity
                                                onPress={() => handleResend(item)}
                                                className="p-1.5 bg-blue-50 rounded-lg"
                                            >
                                                <Send size={14} color="#3B82F6" />
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            onPress={() => item.status === 'PENDING' ? handleCancelInvite(item) : handleRemove(item)}
                                            className="p-1.5 bg-red-50 rounded-lg"
                                        >
                                            <Trash2 size={14} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                {item.status === 'ACTIVE' && <ChevronRight size={14} color="#CBD5E1" />}
                            </TouchableOpacity>
                        );
                    }}
                />
            )}

            {/* Add Staff Modal */}
            <Modal visible={showAddModal} transparent animationType="slide">
                <View className="flex-1 bg-black/40 justify-end">
                    <View className="bg-white rounded-t-[40px] p-6 pb-12">
                        <View className="w-12 h-1.5 bg-border rounded-full self-center mb-6" />

                        {/* Modal Header */}
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-2xl font-black text-textPrimary">Add Staff Member</Text>
                            <TouchableOpacity
                                onPress={() => setShowAddModal(false)}
                                className="bg-lightBackground p-2 rounded-full"
                            >
                                <X size={22} color="#0F172A" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Email Address */}
                            <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wider mb-2">
                                Email Address *
                            </Text>
                            <TextInput
                                className="bg-lightBackground border border-border p-4 rounded-xl font-bold mb-4 text-textPrimary"
                                placeholder="e.g. staff@company.com"
                                placeholderTextColor="#94A3B8"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={newEmail}
                                onChangeText={setNewEmail}
                            />

                            {/* Role Picker */}
                            <Text className="text-textSecondary text-[10px] font-black uppercase tracking-wider mb-3">
                                Role
                            </Text>
                            <View className="flex-row gap-3 mb-6">
                                {(['STAFF', 'MANAGER'] as const).map(role => {
                                    const colors = ROLE_COLORS[role];
                                    const isSelected = newRole === role;
                                    return (
                                        <TouchableOpacity
                                            key={role}
                                            onPress={() => setNewRole(role)}
                                            className="flex-1 p-4 rounded-2xl border"
                                            style={{
                                                backgroundColor: isSelected ? colors.bg : '#F8FAFC',
                                                borderColor: isSelected ? colors.border : '#E2E8F0',
                                            }}
                                        >
                                            <Text
                                                className="font-black text-center text-sm"
                                                style={{ color: isSelected ? colors.text : '#64748B' }}
                                            >
                                                {role === 'STAFF' ? 'STAFF' : role}
                                            </Text>
                                            <Text
                                                className="text-center text-[10px] font-semibold mt-1"
                                                style={{ color: isSelected ? colors.text : '#94A3B8' }}
                                            >
                                                {role === 'STAFF'
                                                    ? 'Can sell, no financial data'
                                                    : 'Can sell + edit products'}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Info note */}
                            <View className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-6">
                                <Text className="text-blue-600 text-[11px] font-semibold leading-4">
                                    💡 They will receive an email invitation to join your store. If they don't have a KashAm account, they will be prompted to create one.
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={handleAddStaff}
                                disabled={adding}
                                className="bg-primary py-4 rounded-2xl items-center"
                            >
                                {adding ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-black text-lg">Add to My Store</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            <AppModal
                visible={modal?.visible ?? false}
                type={modal?.type ?? 'info'}
                title={modal?.title ?? ''}
                subtitle={modal?.subtitle}
                primaryLabel={modal?.primaryLabel}
                onPrimary={() => { modal?.onPrimary?.(); setModal(null); }}
                secondaryLabel={modal?.secondaryLabel}
                onSecondary={() => { modal?.onSecondary?.(); setModal(null); }}
                onDismiss={() => setModal(null)}
                autoDismiss={modal?.autoDismiss}
            />
        </View>
    );
}
