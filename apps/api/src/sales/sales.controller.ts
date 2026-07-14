import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { SalesService } from './sales.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
    constructor(private readonly salesService: SalesService) {}

    @Roles('OWNER', 'MANAGER', 'STAFF')
    @Post('sync')
    syncData(@Request() req: any, @Body() body: any) {
        return this.salesService.syncData(
            body.changes,
            body.lastPulledAt,
            req.user.workspaceId,
            req.user.sub, // staffId — who is making the sale
        );
    }

    @Roles('OWNER', 'MANAGER')
    @Get('daily-summary')
    getDailySummary(@Request() req: any) {
        return this.salesService.getDailySummary(req.user.workspaceId);
    }

    @Roles('OWNER', 'MANAGER')
    @Get('analytics')
    getAnalytics(@Request() req: any, @Query('days') days: string) {
        return this.salesService.getAnalytics(req.user.workspaceId, days ? parseInt(days) : 7);
    }
}
