/**
 * Centralized formatting utilities for Chobo.
 */

export const formatCurrency = (amount: number, symbol: string = '₦'): string => {
    // Ensure we handle negative numbers or non-numbers gracefully
    const val = isNaN(amount) ? 0 : amount;
    const formatted = Math.floor(Math.abs(val)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${val < 0 ? '-' : ''}${symbol}${formatted}`;
};

export const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
};

export const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-NG', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

export const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-NG', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};
