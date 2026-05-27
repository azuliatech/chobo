import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_REFRESH_SECRET must be defined in production!'); })() : 'kasham-refresh-secret-key');

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService
    ) { }

    private async generateTokens(userId: string, phone: string) {
        const payload = { sub: userId, phone };
        const [access_token, refresh_token] = await Promise.all([
            this.jwtService.signAsync(payload),
            this.jwtService.signAsync(payload, {
                secret: REFRESH_SECRET,
                expiresIn: '30d',
            }),
        ]);
        return { access_token, refresh_token };
    }

    async login(phone: string, pass: string) {
        const user = await this.prisma.user.findUnique({ where: { phone } });
        if (!user) throw new UnauthorizedException();
        const isMatch = await bcrypt.compare(pass, user.password);
        if (!isMatch) throw new UnauthorizedException();
        const tokens = await this.generateTokens(user.id, user.phone);
        return { ...tokens, user_id: user.id, shop_name: user.shopName, country_code: user.countryCode };
    }

    async register(phone: string, pass: string, shopName?: string, businessType?: string, countryCode?: string) {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(pass, salt);
        const user = await this.prisma.user.create({
            data: { phone, password: hashedPassword, shopName, businessType, countryCode: countryCode || 'NG' },
        });
        const tokens = await this.generateTokens(user.id, user.phone);
        return { ...tokens, user_id: user.id, shop_name: user.shopName, country_code: user.countryCode };
    }

    async refreshTokens(refreshToken: string) {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: REFRESH_SECRET,
            });
            // Verify user still exists
            const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
            if (!user) throw new UnauthorizedException();
            const tokens = await this.generateTokens(user.id, user.phone);
            return { ...tokens, user_id: user.id };
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }
}
