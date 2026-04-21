import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService
    ) { }

    async login(username: string, pass: string) {
        const user = await this.prisma.user.findUnique({ where: { username } });
        if (!user) {
            throw new UnauthorizedException();
        }
        const isMatch = await bcrypt.compare(pass, user.password);
        if (!isMatch) {
            throw new UnauthorizedException();
        }
        const payload = { sub: user.id, username: user.username };
        return {
            access_token: await this.jwtService.signAsync(payload),
        };
    }

    async register(username: string, pass: string) {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(pass, salt);
        const user = await this.prisma.user.create({
            data: { username, password: hashedPassword },
        });
        const payload = { sub: user.id, username: user.username };
        return {
            access_token: await this.jwtService.signAsync(payload),
        };
    }
}
