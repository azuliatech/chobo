import React, { useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Dimensions,
} from 'react-native';
import { CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export type ModalType = 'success' | 'error' | 'warning' | 'info';

interface AppModalProps {
    visible: boolean;
    type: ModalType;
    title: string;
    subtitle?: string;
    primaryLabel?: string;
    onPrimary?: () => void;
    secondaryLabel?: string;
    onSecondary?: () => void;
    onDismiss?: () => void;
    autoDismiss?: boolean;
}

const TYPE_CONFIG = {
    success: {
        color: '#16A34A', // Emerald 600
        bgColor: '#F0FDF4', // Emerald 50
        Icon: CheckCircle2,
    },
    error: {
        color: '#DC2626', // Red 600
        bgColor: '#FEF2F2', // Red 50
        Icon: AlertCircle,
    },
    warning: {
        color: '#D97706', // Amber 600
        bgColor: '#FFFBEB', // Amber 50
        Icon: AlertTriangle,
    },
    info: {
        color: '#2563EB', // Blue 600
        bgColor: '#EFF6FF', // Blue 50
        Icon: Info,
    },
};

export default function AppModal({
    visible,
    type,
    title,
    subtitle,
    primaryLabel = 'Dismiss',
    onPrimary,
    secondaryLabel,
    onSecondary,
    onDismiss,
    autoDismiss = false,
}: AppModalProps) {
    const config = TYPE_CONFIG[type];

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (visible && autoDismiss && type === 'success') {
            timer = setTimeout(() => {
                if (onDismiss) {
                    onDismiss();
                } else if (onPrimary) {
                    onPrimary();
                }
            }, 2500);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [visible, autoDismiss, type, onDismiss, onPrimary]);

    const handlePrimary = () => {
        if (onPrimary) {
            onPrimary();
        } else if (onDismiss) {
            onDismiss();
        }
    };

    const handleSecondary = () => {
        if (onSecondary) {
            onSecondary();
        }
    };

    const handleBackdropPress = () => {
        if (onDismiss) {
            onDismiss();
        }
    };

    const Icon = config.Icon;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <TouchableWithoutFeedback onPress={handleBackdropPress}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.card}>
                            {/* Icon Circle */}
                            <View style={[styles.iconCircle, { backgroundColor: config.bgColor }]}>
                                <Icon size={28} color={config.color} />
                            </View>

                            {/* Content */}
                            <Text style={styles.title}>{title}</Text>
                            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

                            {/* Actions (Stacked Buttons) */}
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[styles.button, styles.primaryButton, { backgroundColor: config.color }]}
                                    onPress={handlePrimary}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
                                </TouchableOpacity>

                                {secondaryLabel && (
                                    <TouchableOpacity
                                        style={[styles.button, styles.secondaryButton]}
                                        onPress={handleSecondary}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)', // Slate 900 with 60% opacity
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        width: Math.min(width - 48, 360),
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 8,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A', // Slate 900
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#64748B', // Slate 500
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    button: {
        width: '100%',
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButton: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    primaryButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    secondaryButton: {
        backgroundColor: '#F8FAFC', // Slate 50
        borderWidth: 1,
        borderColor: '#E2E8F0', // Slate 200
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A', // Slate 900
    },
});
