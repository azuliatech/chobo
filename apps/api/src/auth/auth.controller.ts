import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
    BadRequestException,
    UseGuards,
    Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SmsService } from './sms.service';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private smsService: SmsService,
    ) {}

    // ---- Standard Auth ----

    @HttpCode(HttpStatus.OK)
    @Post('login')
    login(@Body() body: Record<string, any>) {
        return this.authService.login(body.phone, body.password);
    }

    @Post('register')
    register(@Body() body: Record<string, any>) {
        return this.authService.register(
            body.phone,
            body.password,
            body.business_name,
            body.business_type,
            body.country_code,
        );
    }

    @HttpCode(HttpStatus.OK)
    @Post('refresh')
    refresh(@Body() body: Record<string, any>) {
        return this.authService.refreshTokens(body.refresh_token);
    }

    // ---- OTP (Termii SMS) ----

    @HttpCode(HttpStatus.OK)
    @Post('send-otp')
    async sendOtp(@Body() body: Record<string, any>) {
        if (!body.phone) {
            throw new BadRequestException('Phone number is required');
        }
        const exists = await this.authService.checkPhoneRegistered(body.phone);
        if (exists) {
            throw new BadRequestException('This phone number is already registered');
        }
        try {
            const pinId = await this.smsService.sendOtp(body.phone);
            return { success: true, pinId };
        } catch (e: any) {
            throw new BadRequestException(e.message || 'Could not send SMS verification code');
        }
    }

    @HttpCode(HttpStatus.OK)
    @Post('verify-otp')
    async verifyOtp(@Body() body: Record<string, any>) {
        const pinId = body.pin_id || body.pinId;
        const pin = body.pin;

        if (!pinId || !pin) {
            throw new BadRequestException('Pin ID and verification code are required');
        }

        const isValid = await this.smsService.verifyOtp(pinId, pin);
        if (!isValid) {
            throw new UnauthorizedException('Verification code is invalid or expired');
        }

        return { success: true };
    }

    // ---- Staff Management (Owner-only routes) ----

    /**
     * GET /auth/me/stores
     * Returns all stores the logged-in user owns or is staff at.
     */
    @UseGuards(AuthGuard)
    @Get('me/stores')
    getMyStores(@Request() req: any) {
        return this.authService.getMyStores(req.user.sub);
    }

    /**
     * POST /auth/staff/add
     * Owner adds a staff member by phone number.
     * Body: { phone, role: 'MANAGER' | 'CASHIER', name? }
     */
    @UseGuards(AuthGuard)
    @Post('staff/add')
    addStaff(@Request() req: any, @Body() body: Record<string, any>) {
        if (!body.phone || !body.role) {
            throw new BadRequestException('Phone number and role are required');
        }
        return this.authService.addStaff(req.user.sub, body.phone, body.role, body.name);
    }

    /**
     * GET /auth/staff
     * Owner retrieves all active staff in their store.
     */
    @UseGuards(AuthGuard)
    @Get('staff')
    getStoreStaff(@Request() req: any) {
        return this.authService.getStoreStaff(req.user.sub);
    }

    /**
     * DELETE /auth/staff/:linkId
     * Owner removes a staff member from their store by StaffLink ID.
     */
    @UseGuards(AuthGuard)
    @Delete('staff/:linkId')
    removeStaff(@Request() req: any, @Param('linkId') linkId: string) {
        return this.authService.removeStaff(req.user.sub, linkId);
    }

    /**
     * DELETE /auth/staff/leave/:ownerId
     * Staff member independently exits a store.
     */
    @UseGuards(AuthGuard)
    @Delete('staff/leave/:ownerId')
    leaveStore(@Request() req: any, @Param('ownerId') ownerId: string) {
        return this.authService.leaveStore(req.user.sub, ownerId);
    }
}
