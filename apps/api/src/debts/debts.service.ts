import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StaffActivityAction } from '../workspace/workspace.service';

@Injectable()
export class DebtsService {
    constructor(private prisma: PrismaService) {}

    async create(data: any) {
        // Verify customer belongs to this workspace
        const customer = await this.prisma.customer.findFirst({
            where: { id: data.customerId, workspaceId: data.workspaceId },
        });
        if (!customer) {
            throw new BadRequestException('Customer does not belong to this workspace');
        }

        // Verify sale (if provided) belongs to this workspace
        if (data.saleId) {
            const sale = await this.prisma.sale.findFirst({
                where: { id: data.saleId, workspaceId: data.workspaceId },
            });
            if (!sale) {
                throw new BadRequestException('Sale does not belong to this workspace');
            }
        }

        const debt = await this.prisma.debt.upsert({
            where: { id: data.id },
            update: {
                customerId: data.customerId,
                amountOwed: data.amountOwed,
                saleId: data.saleId,
                status: data.status,
            },
            create: {
                id: data.id,
                customerId: data.customerId,
                amountOwed: data.amountOwed,
                saleId: data.saleId,
                status: data.status,
            },
        });

        // Log DEBT_CREATED activity (non-blocking, only on create — not on status update)
        if (data.status !== 'PAID') {
            this.prisma.staffActivity.create({
                data: {
                    workspaceId: data.workspaceId,
                    userId: data.staffId || data.workspaceId, // staffId if provided, fallback to workspaceId
                    action: StaffActivityAction.DEBT_CREATED,
                    details: {
                        customerName: customer.name || customer.phone || 'Unknown',
                        amount: data.amountOwed,
                    },
                },
            }).catch(() => {/* non-blocking */});
        }

        return debt;
    }
}

