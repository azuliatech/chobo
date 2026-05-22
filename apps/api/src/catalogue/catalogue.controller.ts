import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('catalogue')
export class CatalogueController {
  constructor(private prisma: PrismaService) {}

  @Get('lookup/:barcode')
  async lookupByBarcode(@Param('barcode') barcode: string) {
    const product = await this.prisma.catalogueProduct.findUnique({
      where: { barcode },
    });
    return product ?? null;
  }

  @Get('search')
  async search(@Query('q') query: string) {
    if (!query || query.length < 2) return [];
    return this.prisma.catalogueProduct.findMany({
      where: { name: { contains: query, mode: 'insensitive' } },
      select: { barcode: true, name: true, brand: true, imageUrl: true, category: true },
      take: 10,
    });
  }

  @Post('contribute')
  async contribute(@Body() data: { barcode: string; name: string; brand?: string; imageUrl?: string; category?: string }) {
    return this.prisma.catalogueProduct.upsert({
      where: { barcode: data.barcode },
      update: {
        brand: data.brand ?? undefined,
        imageUrl: data.imageUrl ?? undefined,
        category: data.category ?? undefined,
      },
      create: {
        barcode: data.barcode,
        name: data.name,
        brand: data.brand ?? null,
        imageUrl: data.imageUrl ?? null,
        category: data.category ?? null,
      },
    });
  }
}
