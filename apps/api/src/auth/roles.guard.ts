import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // If no @Roles() decorator, allow anyone who passed AuthGuard
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request['user']; // Populated by AuthGuard
        const activeOwnerId = request.headers['x-active-owner-id'] as string;

        if (!user) {
            throw new ForbiddenException('Unauthorized');
        }

        // Case 1: User is acting as the owner of their own store
        // (No x-active-owner-id header, or it matches their own ID)
        if (!activeOwnerId || activeOwnerId === user.sub) {
            // Grant OWNER-level access when operating on your own store
            if (requiredRoles.includes('OWNER')) {
                request['user'].storeOwnerId = user.sub;
                request['user'].activeRole = 'OWNER';
                return true;
            }
            // Even managers & cashiers need OWNER when on their own store
            if (requiredRoles.includes('MANAGER') || requiredRoles.includes('CASHIER')) {
                request['user'].storeOwnerId = user.sub;
                request['user'].activeRole = 'OWNER';
                return true;
            }
            throw new ForbiddenException('Insufficient permissions');
        }

        // Case 2: User is operating on someone else's store — verify StaffLink
        const link = await this.prisma.staffLink.findUnique({
            where: {
                userId_ownerId: {
                    userId: user.sub,
                    ownerId: activeOwnerId,
                },
            },
        });

        if (!link || link.status !== 'ACTIVE') {
            throw new ForbiddenException(
                'You are not an active staff member of this store',
            );
        }

        // Check if the staff member's role satisfies the required roles
        if (!requiredRoles.includes(link.role)) {
            throw new ForbiddenException(
                `This action requires one of: [${requiredRoles.join(', ')}]. Your role is: ${link.role}`,
            );
        }

        // Inject scoped context into request for downstream service use
        request['user'].storeOwnerId = activeOwnerId;
        request['user'].activeRole = link.role;
        return true;
    }
}
