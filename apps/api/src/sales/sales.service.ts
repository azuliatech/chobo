import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesService {
    constructor(private prisma: PrismaService) {}

    async syncData(changes: any, lastPulledAt: number, storeOwnerId: string) {
        if (changes?.sales?.created?.length > 0) {
            await this.prisma.sale.createMany({
                data: changes.sales.created.map((s: any) => ({
                    id: s.id,
                    userId: storeOwnerId, // Always attributed to the store owner
                    total: s.total,
                    discountAmount: s.discount_amount || s.discountAmount || 0,
                    paymentType: s.payment_type || s.paymentType,
                    synced: true,
                    timestamp: s.timestamp ? new Date(s.timestamp) : new Date(),
                })),
                skipDuplicates: true,
            });
        }

        if (changes?.saleItems?.created?.length > 0) {
            await this.prisma.saleItem.createMany({
                data: changes.saleItems.created.map((si: any) => ({
                    id: si.id,
                    saleId: si.sale_id || si.saleId,
                    productId: si.product_id || si.productId,
                    productName: si.product_name || si.productName,
                    quantity: si.quantity,
                    price: si.price,
                })),
                skipDuplicates: true,
            });
        }

        return { changes: {}, timestamp: Date.now() };
    }

    async getDailySummary(storeOwnerId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sales = await this.prisma.sale.findMany({
            where: {
                userId: storeOwnerId,
                timestamp: { gte: today },
            },
        });

        const totalRevenue = sales.reduce((sum: number, sale: any) => sum + sale.total, 0);
        const totalTransactions = sales.length;

        const breakdown = sales.reduce((acc: Record<string, number>, sale: any) => {
            acc[sale.paymentType] = (acc[sale.paymentType] || 0) + sale.total;
            return acc;
        }, {} as Record<string, number>);

        return {
            date: today,
            totalRevenue,
            totalTransactions,
            breakdown,
        };
    }
}
