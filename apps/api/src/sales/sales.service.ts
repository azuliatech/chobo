import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesService {
    constructor(private prisma: PrismaService) { }

    async syncData(changes: any, lastPulledAt: number) {
        if (changes?.sales?.created?.length > 0) {
            await this.prisma.sale.createMany({
                data: changes.sales.created.map((s: any) => ({
                    id: s.id,
                    total: s.total,
                    paymentType: s.paymentType,
                    synced: true,
                    timestamp: s.timestamp ? new Date(s.timestamp) : new Date(),
                })),
                skipDuplicates: true
            });
        }

        if (changes?.saleItems?.created?.length > 0) {
            await this.prisma.saleItem.createMany({
                data: changes.saleItems.created.map((si: any) => ({
                    id: si.id,
                    saleId: si.sale_id || si.saleId,
                    productId: si.product_id || si.productId,
                    quantity: si.quantity,
                    price: si.price,
                })),
                skipDuplicates: true
            });
        }

        return { changes: {}, timestamp: Date.now() };
    }

    async getDailySummary() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sales = await this.prisma.sale.findMany({
            where: {
                timestamp: {
                    gte: today,
                },
            },
        });

        const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
        const totalTransactions = sales.length;

        const breakdown = sales.reduce((acc, sale) => {
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
