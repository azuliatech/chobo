import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    // All roles can record payments (bank transfers matched to sales)
    @Roles('OWNER', 'MANAGER', 'CASHIER')
    @Post()
    create(@Request() req: any, @Body() body: any) {
        const storeOwnerId = req.user.storeOwnerId || req.user.sub;
        return this.paymentsService.create({ ...body, storeOwnerId });
    }
}
