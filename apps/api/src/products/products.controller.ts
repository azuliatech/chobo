import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ProductsService } from './products.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('user-products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    @Roles('OWNER', 'MANAGER', 'STAFF')
    @Post('sync')
    syncUserProducts(@Request() req: any, @Body() products: any[]) {
        return this.productsService.syncUserProducts(req.user.workspaceId, products);
    }

    @Roles('OWNER', 'MANAGER', 'STAFF')
    @Get('restore')
    restoreUserProducts(@Request() req: any) {
        return this.productsService.restoreUserProducts(req.user.workspaceId);
    }

    @Roles('OWNER', 'MANAGER', 'STAFF')
    @Get()
    findAll(@Request() req: any) {
        return this.productsService.findAll(req.user.workspaceId);
    }

    @Roles('OWNER', 'MANAGER')
    @Patch(':id')
    update(@Param('id') id: string, @Request() req: any, @Body() updateProductDto: any) {
        return this.productsService.update(id, req.user.workspaceId, updateProductDto);
    }

    @Roles('OWNER')
    @Delete(':id')
    remove(@Param('id') id: string, @Request() req: any) {
        return this.productsService.remove(id, req.user.workspaceId);
    }
}
