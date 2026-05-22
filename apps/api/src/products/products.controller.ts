import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('user-products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Post('sync')
    syncUserProducts(@Request() req: any, @Body() products: any[]) {
        return this.productsService.syncUserProducts(req.user.sub, products);
    }

    @Get('restore')
    restoreUserProducts(@Request() req: any) {
        return this.productsService.restoreUserProducts(req.user.sub);
    }

    @Get()
    findAll(@Request() req: any) {
        return this.productsService.findAll(req.user.sub);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Request() req: any, @Body() updateProductDto: any) {
        return this.productsService.update(id, req.user.sub, updateProductDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req: any) {
        return this.productsService.remove(id, req.user.sub);
    }
}
