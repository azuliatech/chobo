import { getProducts, getUnsyncedSales, markSalesAsSynced } from '../db';
import { useAuthStore } from '../store/authStore';
import { useSyncStore } from '../store/syncStore';
import { API_URL } from '../config';

async function pushProductsToBackend(token: string) {
    const products = await getProducts();
    if (products.length === 0) return;

    // Upsert-style: try to create each product, silently skip if already on backend
    for (const p of products) {
        try {
            await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    stock: p.stock,
                })
            });
        } catch (e) {
            console.warn('[Sync] Could not push product:', p.id, e);
        }
    }
    console.log(`[Sync] Products synced: ${products.length}`);
}

export async function pushSalesToBackend() {
    const { token } = useAuthStore.getState();
    const { isSyncing, setIsSyncing, setLastSyncedAt } = useSyncStore.getState();

    if (isSyncing) return;
    if (!token) {
        console.log("[Sync] Waiting for authentication...");
        return;
    }

    try {
        setIsSyncing(true);

        // Step 1: Sync products first so FK constraints are satisfied on backend
        await pushProductsToBackend(token);

        // Step 2: Push unsynced sales
        const { sales, saleItems } = await getUnsyncedSales();

        if (sales.length === 0) {
            console.log("[Sync] Everything is up to date.");
            return;
        }

        console.log(`[Sync] Found ${sales.length} sales to sync.`);

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

        if (!res.ok) {
            const errorData = await res.text();
            throw new Error(`Sync failed with status ${res.status}: ${errorData}`);
        }

        const saleIds = sales.map(s => s.id);
        await markSalesAsSynced(saleIds);

        setLastSyncedAt(new Date());
        console.log(`[Sync] Successfully pushed ${saleIds.length} sales.`);

    } catch (e: any) {
        console.error("[Sync Error]", e.message);
    } finally {
        setIsSyncing(false);
    }
}
