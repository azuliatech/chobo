import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { EmailService } from './email.service';
import { JwtModule } from '@nestjs/jwt';
import { RolesGuard } from './roles.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret:
        process.env.JWT_SECRET ||
        (process.env.NODE_ENV === 'production'
          ? (() => {
              throw new Error('JWT_SECRET must be defined in production!');
            })()
          : 'dev-jwt-secret-only'),
      signOptions: { expiresIn: '15m' }, // short-lived access tokens
    }),
    PrismaModule,
  ],
  providers: [AuthService, EmailService, RolesGuard],
  controllers: [AuthController],
  exports: [AuthService, EmailService, RolesGuard],
})
export class AuthModule {}
