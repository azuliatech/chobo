import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
    constructor(private prisma: PrismaService) { }

    async findAll(userId: string) {
        return this.prisma.userProduct.findMany({
            where: { userId },
            orderBy: { name: 'asc' },
        });
    }

    async restoreUserProducts(userId: string) {
        return this.prisma.userProduct.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        });
    }

    async syncUserProducts(userId: string, products: any[]) {
        const results = [];
        for (const p of products) {
            const result = await this.prisma.userProduct.upsert({
                where: { id: p.id },
                update: {
                    name: p.name,
                    sellingPrice: p.sellingPrice ?? p.price,
                    costPrice: p.costPrice ?? null,
                    stock: p.stock,
                    imageUrl: p.imageUrl ?? null,
                    barcode: p.barcode ?? null,
                    updatedAt: new Date(),
                },
                create: {
                    id: p.id,
                    userId: userId,
                    name: p.name,
                    sellingPrice: p.sellingPrice ?? p.price,
                    costPrice: p.costPrice ?? null,
                    stock: p.stock ?? 0,
                    imageUrl: p.imageUrl ?? null,
                    barcode: p.barcode ?? null,
                },
            });
            results.push(result);
        }
        return results;
    }

    async update(id: string, userId: string, data: any) {
        const product = await this.prisma.userProduct.findFirst({
            where: { id, userId },
        });
        if (!product) throw new ForbiddenException('Product not found or not yours');
        
        return this.prisma.userProduct.update({
            where: { id },
            data: {
                name: data.name,
                sellingPrice: data.sellingPrice ?? data.price,
                costPrice: data.costPrice,
                stock: data.stock,
                imageUrl: data.imageUrl,
                barcode: data.barcode,
            },
        });
    }

    async remove(id: string, userId: string) {
        const product = await this.prisma.userProduct.findFirst({
            where: { id, userId },
        });
        if (!product) throw new ForbiddenException('Product not found or not yours');
        
        return this.prisma.userProduct.delete({
            where: { id },
        });
    }
}
