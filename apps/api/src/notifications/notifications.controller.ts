import { Controller, Get, Post, Body, HttpCode, HttpStatus, BadRequestException, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationsController {
    constructor(private notificationsService: NotificationsService) {}

    @Get()
    getNotifications(@Request() req: any) {
        return this.notificationsService.getNotifications(req.user.sub);
    }

    @HttpCode(HttpStatus.OK)
    @Post('mark-read')
    markAllRead(@Request() req: any) {
        return this.notificationsService.markAllRead(req.user.sub);
    }
}
