import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SmsService } from './sms.service';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private smsService: SmsService
    ) { }

    @HttpCode(HttpStatus.OK)
    @Post('login')
    login(@Body() signInDto: Record<string, any>) {
        return this.authService.login(signInDto.phone, signInDto.password);
    }

    @Post('register')
    register(@Body() signUpDto: Record<string, any>) {
        return this.authService.register(
            signUpDto.phone,
            signUpDto.password,
            signUpDto.business_name,
            signUpDto.business_type,
            signUpDto.country_code
        );
    }

    @HttpCode(HttpStatus.OK)
    @Post('refresh')
    refresh(@Body() body: Record<string, any>) {
        return this.authService.refreshTokens(body.refresh_token);
    }

    @HttpCode(HttpStatus.OK)
    @Post('send-otp')
    async sendOtp(@Body() body: Record<string, any>) {
        if (!body.phone) {
            throw new BadRequestException('Phone number is required');
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
}
