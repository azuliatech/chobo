import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SalesService } from './sales.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
    constructor(private readonly salesService: SalesService) {}

    // All roles can record sales
    @Roles('OWNER', 'MANAGER', 'CASHIER')
    @Post('sync')
    syncData(@Request() req: any, @Body() body: any) {
        const storeOwnerId = req.user.storeOwnerId || req.user.sub;
        return this.salesService.syncData(body.changes, body.lastPulledAt, storeOwnerId);
    }

    // Only owner and manager can see daily revenue summary
    @Roles('OWNER', 'MANAGER')
    @Get('daily-summary')
    getDailySummary(@Request() req: any) {
        const storeOwnerId = req.user.storeOwnerId || req.user.sub;
        return this.salesService.getDailySummary(storeOwnerId);
    }
}
