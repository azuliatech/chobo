import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../auth/email.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class WorkspaceService {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
    ) {}

    // ── Create Workspace ───────────────────────────────────────────────────────
    async create(ownerId: string, name: string, businessType?: string, countryCode?: string) {
        // Tier gate: Free users can only own 1 workspace
        const existingOwned = await this.prisma.workspace.count({
            where: { ownerId, status: 'ACTIVE' },
        });

        if (existingOwned >= 1) {
            // Check if owner has a Pro or Enterprise membership somewhere
            const ownerMembership = await this.prisma.workspaceMember.findFirst({
                where: { userId: ownerId, role: 'OWNER', status: 'ACTIVE' },
                include: { workspace: { select: { tier: true } } },
            });
            const tier = ownerMembership?.workspace.tier || 'FREE';

            if (tier === 'FREE' || tier === 'PRO') {
                throw new ForbiddenException(
                    'Your current plan only allows 1 store. Upgrade to Enterprise to create unlimited stores.',
                );
            }
        }

        // Create workspace and add owner as OWNER member in a transaction
        const workspace = await this.prisma.$transaction(async (tx) => {
            const ws = await tx.workspace.create({
                data: {
                    name,
                    businessType,
                    countryCode: countryCode || 'NG',
                    ownerId,
                    tier: 'FREE',
                    status: 'ACTIVE',
                },
            });

            await tx.workspaceMember.create({
                data: {
                    workspaceId: ws.id,
                    userId: ownerId,
                    role: 'OWNER',
                    status: 'ACTIVE',
                },
            });

            return ws;
        });

        return workspace;
    }

    // ── Get All Workspaces for User ────────────────────────────────────────────
    async getMyWorkspaces(userId: string) {
        const memberships = await this.prisma.workspaceMember.findMany({
            where: { userId, status: 'ACTIVE' },
            include: {
                workspace: {
                    select: {
                        id: true,
                        name: true,
                        businessType: true,
                        tier: true,
                        status: true,
                        ownerId: true,
                        createdAt: true,
                    },
                },
            },
        });

        return memberships.map((m) => ({
            workspaceId: m.workspaceId,
            name: m.workspace.name,
            businessType: m.workspace.businessType,
            tier: m.workspace.tier,
            status: m.workspace.status,
            isOwner: m.workspace.ownerId === userId,
            role: m.role,
            joinedAt: m.createdAt,
        }));
    }

    // ── Get Workspace Members ──────────────────────────────────────────────────
    async getMembers(workspaceId: string) {
        const members = await this.prisma.workspaceMember.findMany({
            where: { workspaceId, status: 'ACTIVE' },
            include: {
                user: { select: { id: true, email: true, name: true, expoPushToken: true } },
            },
            orderBy: { createdAt: 'asc' },
        });

        return members.map((m) => ({
            memberId: m.id,
            userId: m.userId,
            email: m.user.email,
            name: m.user.name,
            role: m.role,
            status: m.status,
            joinedAt: m.createdAt,
        }));
    }

    // ── Invite Staff by Email ──────────────────────────────────────────────────
    async inviteMember(workspaceId: string, inviterUserId: string, email: string, role: string) {
        if (!['MANAGER', 'STAFF'].includes(role)) {
            throw new BadRequestException('Role must be MANAGER or STAFF');
        }

        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { owner: { select: { name: true } } },
        });
        if (!workspace) throw new NotFoundException('Workspace not found');

        // Staff limit check
        const memberCount = await this.prisma.workspaceMember.count({
            where: { workspaceId, status: 'ACTIVE' },
        });

        if (workspace.tier === 'FREE' && memberCount >= 1) {
            throw new ForbiddenException('Free plan only allows the owner. Upgrade to Pro to add staff.');
        }
        if (workspace.tier === 'PRO' && memberCount >= 3) {
            throw new ForbiddenException('Pro plan allows up to 3 members. Upgrade to Enterprise for unlimited staff.');
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Can't invite yourself
        const inviter = await this.prisma.user.findUnique({ where: { id: inviterUserId } });
        if (inviter?.email === normalizedEmail) {
            throw new BadRequestException('You cannot invite yourself');
        }

        // Generate temp password for new users
        const tempPassword = randomBytes(4).toString('hex'); // 8-char random hex
        let isNewUser = false;

        // Find or create user
        let staffUser = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!staffUser) {
            const salt = await bcrypt.genSalt();
            const hashedPassword = await bcrypt.hash(tempPassword, salt);
            staffUser = await this.prisma.user.create({
                data: {
                    email: normalizedEmail,
                    password: hashedPassword,
                    emailVerified: true, // Invited staff are pre-verified
                    tosAccepted: true,
                    countryCode: 'NG',
                },
            });
            isNewUser = true;
        }

        // Add or re-activate membership
        try {
            const member = await this.prisma.workspaceMember.upsert({
                where: { workspaceId_userId: { workspaceId, userId: staffUser.id } },
                update: { role, status: 'ACTIVE' },
                create: { workspaceId, userId: staffUser.id, role, status: 'ACTIVE' },
            });

            // Send invite email
            await this.emailService.sendStaffInviteEmail(
                normalizedEmail,
                workspace.name,
                inviter?.name || null,
                isNewUser ? tempPassword : '(use your existing password)',
            );

            return {
                success: true,
                memberId: member.id,
                userId: staffUser.id,
                email: normalizedEmail,
                role,
                isNewUser,
            };
        } catch (e: any) {
            if (e.code === 'P2002') throw new ConflictException('This user is already a member of this workspace');
            throw e;
        }
    }

    // ── Change Member Role ─────────────────────────────────────────────────────
    async updateMemberRole(workspaceId: string, memberId: string, role: string) {
        if (!['MANAGER', 'STAFF'].includes(role)) {
            throw new BadRequestException('Role must be MANAGER or STAFF');
        }

        const member = await this.prisma.workspaceMember.findFirst({
            where: { id: memberId, workspaceId },
        });
        if (!member) throw new NotFoundException('Member not found in this workspace');
        if (member.role === 'OWNER') throw new ForbiddenException('Cannot change the role of the workspace owner');

        return this.prisma.workspaceMember.update({
            where: { id: memberId },
            data: { role },
        });
    }

    // ── Remove Member ──────────────────────────────────────────────────────────
    async removeMember(workspaceId: string, memberId: string) {
        const member = await this.prisma.workspaceMember.findFirst({
            where: { id: memberId, workspaceId },
        });
        if (!member) throw new NotFoundException('Member not found');
        if (member.role === 'OWNER') throw new ForbiddenException('Cannot remove the workspace owner');

        await this.prisma.workspaceMember.update({
            where: { id: memberId },
            data: { status: 'REMOVED' },
        });

        return { success: true, message: 'Member removed from workspace' };
    }

    // ── Leave Workspace (Self-Exit) ────────────────────────────────────────────
    async leaveWorkspace(workspaceId: string, userId: string) {
        const member = await this.prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } },
        });
        if (!member) throw new NotFoundException('You are not a member of this workspace');
        if (member.role === 'OWNER') {
            throw new ForbiddenException(
                'Workspace owners cannot leave. Transfer ownership or delete the workspace first.',
            );
        }

        await this.prisma.workspaceMember.delete({
            where: { workspaceId_userId: { workspaceId, userId } },
        });

        return { success: true, message: 'You have left this workspace' };
    }

    // ── Delete Workspace ───────────────────────────────────────────────────────
    async deleteWorkspace(workspaceId: string, ownerId: string) {
        const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
        if (!workspace) throw new NotFoundException('Workspace not found');
        if (workspace.ownerId !== ownerId) throw new ForbiddenException('Only the owner can delete this workspace');

        // Soft delete — mark as suspended (preserves all historical data)
        await this.prisma.workspace.update({
            where: { id: workspaceId },
            data: { status: 'SUSPENDED' },
        });

        return { success: true, message: 'Workspace has been deactivated' };
    }

    // ── Upgrade Workspace Tier ─────────────────────────────────────────────────
    async upgradeTier(workspaceId: string, tier: 'FREE' | 'PRO' | 'ENTERPRISE') {
        const workspace = await this.prisma.workspace.update({
            where: { id: workspaceId },
            data: { tier },
        });
        return { success: true, workspace };
    }
}
