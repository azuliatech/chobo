import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { DebtsService } from './debts.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('debts')
export class DebtsController {
    constructor(private readonly debtsService: DebtsService) {}

    // Cashiers can record debts (credit sales) at checkout
    @Roles('OWNER', 'MANAGER', 'CASHIER')
    @Post()
    create(@Request() req: any, @Body() body: any) {
        const storeOwnerId = req.user.storeOwnerId || req.user.sub;
        return this.debtsService.create({ ...body, storeOwnerId });
    }
}
