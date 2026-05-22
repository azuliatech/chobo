import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
    constructor(private prisma: PrismaService) {}

    create(data: any) {
        return this.prisma.payment.upsert({
            where: { id: data.id },
            update: {
                amount: data.amount,
                senderName: data.senderName,
                matched: data.matched,
                saleId: data.saleId,
            },
            create: {
                id: data.id,
                amount: data.amount,
                senderName: data.senderName,
                matched: data.matched,
                saleId: data.saleId,
            }
        });
    }
}
