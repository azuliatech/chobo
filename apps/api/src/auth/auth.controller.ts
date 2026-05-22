import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

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
}
