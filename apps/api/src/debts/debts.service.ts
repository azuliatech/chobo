import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DebtsService {
    constructor(private prisma: PrismaService) {}

    create(data: any) {
        return this.prisma.debt.upsert({
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
            }
        });
    }
}
