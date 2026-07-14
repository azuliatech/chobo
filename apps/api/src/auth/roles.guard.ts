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
        const workspaceId = request.headers['x-workspace-id'] as string;

        if (!user) {
            throw new ForbiddenException('Unauthorized');
        }

        if (!workspaceId) {
            throw new ForbiddenException('x-workspace-id header is required');
        }

        // Verify the user is an active member of the requested workspace
        const member = await this.prisma.workspaceMember.findFirst({
            where: {
                workspaceId,
                userId: user.sub,
            },
            include: {
                workspace: { select: { id: true, status: true } },
            },
        });

        if (!member || member.status !== 'ACTIVE') {
            throw new ForbiddenException('You are not an active member of this workspace');
        }

        if (member.workspace.status !== 'ACTIVE') {
            throw new ForbiddenException('This workspace is suspended');
        }

        // Check if the member's role satisfies the required roles
        if (!requiredRoles.includes(member.role)) {
            throw new ForbiddenException(
                `This action requires one of: [${requiredRoles.join(', ')}]. Your role is: ${member.role}`,
            );
        }

        // Inject scoped context into request for downstream service use
        request['user'].workspaceId = workspaceId;
        request['user'].activeRole = member.role;
        return true;
    }
}
