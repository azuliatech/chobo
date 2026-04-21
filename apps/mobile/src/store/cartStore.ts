import { create } from 'zustand';

export type PaymentType = 'CASH' | 'TRANSFER' | 'POS';

export interface CartItem {
    productId: string;
    name: string;
    price: number;
    quantity: number;
}

interface CartStore {
    items: CartItem[];
    total: number;
    addItem: (product: { id: string; name: string; price: number }) => void;
    removeItem: (productId: string) => void;
    clearCart: () => void;
}

export const useCartStore = create<CartStore>((set, get) => ({
    items: [],
    total: 0,

    addItem: (product) => {
        const items = get().items;
        const existing = items.find((i) => i.productId === product.id);
        let newItems: CartItem[];

        if (existing) {
            newItems = items.map((i) =>
                i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
            );
        } else {
            newItems = [...items, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
        }

        const total = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        set({ items: newItems, total });
    },

    removeItem: (productId) => {
        const items = get().items.filter((i) => i.productId !== productId);
        const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        set({ items, total });
    },

    clearCart: () => set({ items: [], total: 0 }),
}));
