import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ||
    (process.env.NODE_ENV === 'production'
        ? (() => {
              throw new Error('JWT_REFRESH_SECRET must be defined in production!');
          })()
        : 'kasham-refresh-secret-key');

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) {}

    // ---- Token helpers ----
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

    // ---- Build the list of stores a user has access to ----
    private async getUserStores(userId: string) {
        // 1. Their own store (if they are an OWNER with a shopName)
        const self = await this.prisma.user.findUnique({ where: { id: userId } });

        const stores: Array<{
            ownerId: string;
            shopName: string | null;
            role: string;
            status: string;
        }> = [];

        if (self?.shopName) {
            stores.push({
                ownerId: self.id,
                shopName: self.shopName,
                role: 'OWNER',
                status: 'ACTIVE',
            });
        }

        // 2. All stores they are staff at
        const links = await this.prisma.staffLink.findMany({
            where: { userId, status: 'ACTIVE' },
            include: { owner: { select: { id: true, shopName: true } } },
        });

        for (const link of links) {
            stores.push({
                ownerId: link.ownerId,
                shopName: link.owner.shopName,
                role: link.role,
                status: link.status,
            });
        }

        return stores;
    }

    // ---- Auth ----
    async login(phone: string, pass: string) {
        const user = await this.prisma.user.findUnique({ where: { phone } });
        if (!user) throw new UnauthorizedException('Invalid credentials');
        const isMatch = await bcrypt.compare(pass, user.password);
        if (!isMatch) throw new UnauthorizedException('Invalid credentials');
        const tokens = await this.generateTokens(user.id, user.phone);
        const stores = await this.getUserStores(user.id);
        return {
            ...tokens,
            user_id: user.id,
            shop_name: user.shopName,
            country_code: user.countryCode,
            role: user.role,
            stores,
        };
    }

    async register(
        phone: string,
        pass: string,
        shopName?: string,
        businessType?: string,
        countryCode?: string,
    ) {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(pass, salt);
        const user = await this.prisma.user.create({
            data: {
                phone,
                password: hashedPassword,
                shopName,
                businessType,
                countryCode: countryCode || 'NG',
                role: 'OWNER',
            },
        });
        const tokens = await this.generateTokens(user.id, user.phone);
        const stores = await this.getUserStores(user.id);
        return {
            ...tokens,
            user_id: user.id,
            shop_name: user.shopName,
            country_code: user.countryCode,
            role: user.role,
            stores,
        };
    }

    async refreshTokens(refreshToken: string) {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: REFRESH_SECRET,
            });
            const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
            if (!user) throw new UnauthorizedException();
            const tokens = await this.generateTokens(user.id, user.phone);
            const stores = await this.getUserStores(user.id);
            return { ...tokens, user_id: user.id, stores };
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }

    // ---- Staff Management ----

    /**
     * Owner adds a new staff member by phone number.
     * Creates a User account for them if they don't have one.
     */
    async addStaff(
        ownerId: string,
        phone: string,
        role: 'MANAGER' | 'CASHIER',
        name?: string,
    ) {
        if (!['MANAGER', 'CASHIER'].includes(role)) {
            throw new BadRequestException('Role must be MANAGER or CASHIER');
        }

        // Clean phone number format
        let cleanedPhone = phone.replace(/\s+/g, '').replace(/[+\-]/g, '');
        if (cleanedPhone.startsWith('0')) {
            cleanedPhone = '234' + cleanedPhone.slice(1);
        }
        // Ensure + prefix for storage consistency
        const formattedPhone = `+${cleanedPhone}`;

        // Can't add yourself
        const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
        if (owner?.phone === formattedPhone) {
            throw new BadRequestException('You cannot add yourself as a staff member');
        }

        // Find or create the staff user account
        let staffUser = await this.prisma.user.findUnique({ where: { phone: formattedPhone } });

        if (!staffUser) {
            // Create a new account with a temporary password (phone number digits)
            const tempPassword = cleanedPhone.slice(-6); // Last 6 digits of phone
            const salt = await bcrypt.genSalt();
            const hashedPassword = await bcrypt.hash(tempPassword, salt);
            staffUser = await this.prisma.user.create({
                data: {
                    phone: formattedPhone,
                    password: hashedPassword,
                    shopName: name || null,
                    role: 'CASHIER', // Their default role on their own account
                    countryCode: 'NG',
                },
            });
        }

        // Create or update the StaffLink
        try {
            const link = await this.prisma.staffLink.upsert({
                where: { userId_ownerId: { userId: staffUser.id, ownerId } },
                update: { role, status: 'ACTIVE' },
                create: { userId: staffUser.id, ownerId, role, status: 'ACTIVE' },
                include: {
                    user: { select: { id: true, phone: true, shopName: true } },
                },
            });
            return {
                success: true,
                message: `Staff member added successfully`,
                staffId: link.id,
                userId: staffUser.id,
                phone: staffUser.phone,
                role,
                isNewAccount: !staffUser.shopName, // hint: they may need to set a password
            };
        } catch (e: any) {
            if (e.code === 'P2002') {
                throw new ConflictException('This user is already a staff member of your store');
            }
            throw e;
        }
    }

    /**
     * Returns all active staff members for the owner's store.
     */
    async getStoreStaff(ownerId: string) {
        const links = await this.prisma.staffLink.findMany({
            where: { ownerId, status: 'ACTIVE' },
            include: {
                user: { select: { id: true, phone: true, shopName: true, role: true, createdAt: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return links.map((l) => ({
            linkId: l.id,
            userId: l.userId,
            phone: l.user.phone,
            name: l.user.shopName,
            role: l.role,
            status: l.status,
            joinedAt: l.createdAt,
        }));
    }

    /**
     * Owner removes a staff member by StaffLink ID.
     */
    async removeStaff(ownerId: string, linkId: string) {
        const link = await this.prisma.staffLink.findFirst({
            where: { id: linkId, ownerId },
        });
        if (!link) throw new NotFoundException('Staff link not found');
        await this.prisma.staffLink.update({
            where: { id: linkId },
            data: { status: 'REMOVED' },
        });
        return { success: true, message: 'Staff member removed from your store' };
    }

    /**
     * Staff member self-exits from a store.
     */
    async leaveStore(userId: string, ownerId: string) {
        const link = await this.prisma.staffLink.findUnique({
            where: { userId_ownerId: { userId, ownerId } },
        });
        if (!link) throw new NotFoundException('You are not linked to this store');
        await this.prisma.staffLink.delete({
            where: { userId_ownerId: { userId, ownerId } },
        });
        return { success: true, message: 'You have successfully left this store' };
    }

    /**
     * Checks if a phone number is already registered in the database.
     */
    async checkPhoneRegistered(phone: string): Promise<boolean> {
        const formatted = phone.startsWith('+') ? phone : `+${phone.replace(/\D/g, '')}`;
        const user = await this.prisma.user.findUnique({ where: { phone: formatted } });
        return !!user;
    }

    /**
     * Returns all stores a user has access to (own + staff links).
     */
    async getMyStores(userId: string) {
        return this.getUserStores(userId);
    }
}
