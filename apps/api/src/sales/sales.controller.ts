import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('sales')
export class SalesController {
    constructor(private readonly salesService: SalesService) { }

    @Post('sync')
    syncData(@Body() body: any) {
        return this.salesService.syncData(body.changes, body.lastPulledAt);
    }

    @Get('daily-summary')
    getDailySummary() {
        return this.salesService.getDailySummary();
    }
}
