import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ProductsService } from './products.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('user-products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    // Cashiers can sync sales (decrement stock), managers/owners can add products
    @Roles('OWNER', 'MANAGER', 'CASHIER')
    @Post('sync')
    syncUserProducts(@Request() req: any, @Body() products: any[]) {
        const storeOwnerId = req.user.storeOwnerId || req.user.sub;
        return this.productsService.syncUserProducts(storeOwnerId, products);
    }

    // Cashiers can restore/view the product catalog to make sales
    @Roles('OWNER', 'MANAGER', 'CASHIER')
    @Get('restore')
    restoreUserProducts(@Request() req: any) {
        const storeOwnerId = req.user.storeOwnerId || req.user.sub;
        return this.productsService.restoreUserProducts(storeOwnerId);
    }

    // Cashiers can view product list
    @Roles('OWNER', 'MANAGER', 'CASHIER')
    @Get()
    findAll(@Request() req: any) {
        const storeOwnerId = req.user.storeOwnerId || req.user.sub;
        return this.productsService.findAll(storeOwnerId);
    }

    // Only owner and manager can edit a product
    @Roles('OWNER', 'MANAGER')
    @Patch(':id')
    update(@Param('id') id: string, @Request() req: any, @Body() updateProductDto: any) {
        const storeOwnerId = req.user.storeOwnerId || req.user.sub;
        return this.productsService.update(id, storeOwnerId, updateProductDto);
    }

    // Only owner can delete a product
    @Roles('OWNER')
    @Delete(':id')
    remove(@Param('id') id: string, @Request() req: any) {
        const storeOwnerId = req.user.storeOwnerId || req.user.sub;
        return this.productsService.remove(id, storeOwnerId);
    }
}
