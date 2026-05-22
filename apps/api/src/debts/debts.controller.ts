import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { DebtsService } from './debts.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('debts')
export class DebtsController {
    constructor(private readonly debtsService: DebtsService) {}

    @Post()
    create(@Body() body: any) {
        return this.debtsService.create(body);
    }
}
