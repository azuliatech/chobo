import { getProducts, getUnsyncedSales, markSalesAsSynced, getUnsyncedPayments, markPaymentsAsSynced, getUnsyncedDebts, markDebtsAsSynced } from '../db';
import { useAuthStore } from '../store/authStore';
import { useSyncStore } from '../store/syncStore';
import { API_URL } from '../config';

async function pushProductsToBackend(token: string, userId: string) {
    if (!userId) return;
    const products = await getProducts(userId);
    if (products.length === 0) return;

    try {
        await fetch(`${API_URL}/user-products/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(products.map(p => ({
                id: p.id,
                name: p.name,
                sellingPrice: p.price,
                costPrice: p.cost_price ?? null,
                stock: p.stock,
                imageUrl: p.image_uri ?? null,
                barcode: p.barcode ?? null,
            })))
        });
    } catch (e) {
        console.warn('[Sync] Could not push products:', e);
    }
}

export async function pushSalesToBackend() {
    const { token, userId } = useAuthStore.getState();
    const { isSyncing, setIsSyncing, setLastSyncedAt } = useSyncStore.getState();

    if (isSyncing) return;
    if (!token || !userId) return;

    try {
        setIsSyncing(true);

        await pushProductsToBackend(token, userId);

        // Sync Sales
        const { sales, saleItems } = await getUnsyncedSales(userId);
        if (sales.length > 0) {
            const changes = {
                sales: {
                    created: sales.map(s => ({
                        id: s.id,
                        total: s.total,
                        paymentType: s.payment_type,
                        timestamp: s.timestamp
                    }))
                },
                saleItems: {
                    created: saleItems.map(si => ({
                        id: si.id,
                        saleId: si.sale_id,
                        productId: si.product_id,
                        quantity: si.quantity,
                        price: si.price
                    }))
                }
            };

            const res = await fetch(`${API_URL}/sales/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ changes, lastPulledAt: Date.now() })
            });

            if (res.ok) {
                await markSalesAsSynced(sales.map(s => s.id));
            }
        }

        // Sync Payments
        const payments = await getUnsyncedPayments();
        if (payments.length > 0) {
            for (const p of payments) {
                await fetch(`${API_URL}/payments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        id: p.id, amount: p.amount, senderName: p.sender_name, matched: p.matched === 1, saleId: p.sale_id
                    })
                });
            }
            await markPaymentsAsSynced(payments.map(p => p.id));
        }

        // Sync Debts
        const debts = await getUnsyncedDebts(userId);
        if (debts.length > 0) {
             for (const d of debts) {
                await fetch(`${API_URL}/debts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        id: d.id, customerId: d.customer_id, amountOwed: d.amount_owed, saleId: d.sale_id, status: d.status
                    })
                });
            }
            await markDebtsAsSynced(debts.map(d => d.id));
        }

        setLastSyncedAt(new Date());

    } catch (e: any) {
        console.error("[Sync Error]", e.message);
    } finally {
        setIsSyncing(false);
    }
}
