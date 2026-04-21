import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
    constructor(private prisma: PrismaService) { }

    create(createProductDto: any) {
        return this.prisma.product.upsert({
            where: { id: createProductDto.id || 'new' },
            update: {
                name: createProductDto.name,
                price: createProductDto.price,
                stock: createProductDto.stock,
            },
            create: {
                id: createProductDto.id,
                name: createProductDto.name,
                price: createProductDto.price,
                stock: createProductDto.stock,
            }
        });
    }

    findAll() {
        return this.prisma.product.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }

    update(id: string, updateProductDto: any) {
        return this.prisma.product.update({
            where: { id },
            data: updateProductDto,
        });
    }

    remove(id: string) {
        return this.prisma.product.delete({
            where: { id },
        });
    }
}
