import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

const APP_URL = process.env.APP_URL || 'https://kasham-api-staging.onrender.com';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly resend: Resend;
    private readonly fromEmail: string;

    constructor() {
        this.resend = new Resend(process.env.RESEND_API_KEY);
        this.fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    }

    // ── Email Verification ─────────────────────────────────────────────────────
    async sendVerificationEmail(email: string, name: string | null, token: string, code?: string): Promise<void> {
        const verifyUrl = `${APP_URL}/api/v1/auth/verify-email?token=${token}`;
        const deepLink = `kasham://verify?token=${token}`;

        try {
            await this.resend.emails.send({
                from: `KashAm <${this.fromEmail}>`,
                to: email,
                subject: 'Verify your KashAm account',
                html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
                        <h2 style="color: #16a34a; margin-bottom: 8px;">Welcome to KashAm${name ? `, ${name}` : ''}!</h2>
                        <p style="color: #374151; margin-bottom: 24px;">Click the button below to verify your email address and activate your account.</p>
                        <a href="${verifyUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-bottom: 16px;">Verify Email Address</a>
                        
                        ${code ? `
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 16px;">
                            <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Verification Code</p>
                            <h3 style="margin: 0; font-size: 32px; letter-spacing: 6px; color: #0f172a; font-family: monospace;">${code}</h3>
                        </div>
                        ` : ''}

                        <p style="color: #374151; margin-bottom: 16px; font-size: 14px;">Or, open the app directly to verify:</p>
                        <a href="${deepLink}" style="display: inline-block; background: #0f172a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-bottom: 24px;">Verify in KashAm App</a>

                        <p style="color: #6b7280; font-size: 13px;">This link expires in 24 hours. If you didn't create a KashAm account, you can safely ignore this email.</p>
                    </div>
                `,
            });
            this.logger.log(`[Resend] Verification email sent to ${email}`);
        } catch (err: any) {
            this.logger.error(`[Resend] Failed to send verification email to ${email}: ${err.message}`);
            throw new Error('Failed to send verification email. Please try again.');
        }
    }

    // ── Password Reset ─────────────────────────────────────────────────────────
    async sendPasswordResetEmail(email: string, name: string | null, token: string): Promise<void> {
        const resetUrl = `kasham://reset-password?token=${token}`;

        try {
            await this.resend.emails.send({
                from: `KashAm <${this.fromEmail}>`,
                to: email,
                subject: 'Reset your KashAm password',
                html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
                        <h2 style="color: #16a34a; margin-bottom: 8px;">Password Reset Request</h2>
                        <p style="color: #374151; margin-bottom: 24px;">Hi${name ? ` ${name}` : ''}! We received a request to reset your KashAm password. Click below to set a new one in the app.</p>
                        <a href="${resetUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-bottom: 24px;">Reset Password</a>
                        <p style="color: #6b7280; font-size: 13px;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
                    </div>
                `,
            });
            this.logger.log(`[Resend] Password reset email sent to ${email}`);
        } catch (err: any) {
            this.logger.error(`[Resend] Failed to send reset email to ${email}: ${err.message}`);
            throw new Error('Failed to send password reset email. Please try again.');
        }
    }

    // ── Staff Invite: New User ─────────────────────────────────────────────────
    /**
     * Invite someone who does NOT have a KashAm account yet.
     * Deep link opens the app directly to the registration screen with the
     * invite token embedded so they can sign up and auto-join the workspace.
     */
    async sendNewUserInvite(params: {
        toEmail: string;
        workspaceName: string;
        role: string;
        inviteToken: string;
    }): Promise<void> {
        const { toEmail, workspaceName, role, inviteToken } = params;
        const deepLink = `kasham://invite?token=${inviteToken}`;
        const roleLabel = role === 'MANAGER' ? 'Manager' : 'Staff Member';

        try {
            await this.resend.emails.send({
                from: `KashAm <${this.fromEmail}>`,
                to: toEmail,
                subject: `You've been invited to join ${workspaceName} on KashAm`,
                html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <div style="display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; text-align: center;">K</div>
                        </div>
                        <h2 style="color: #0f172a; text-align: center; margin-bottom: 8px;">You're invited to KashAm</h2>
                        <p style="color: #64748b; text-align: center; margin-bottom: 24px;">You've been invited to join <strong style="color: #0f172a;">${workspaceName}</strong> as a <strong style="color: #16a34a;">${roleLabel}</strong>.</p>
                        
                        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                            <p style="color: #374151; margin: 0 0 12px; font-size: 14px;">
                                KashAm is a business management app that helps you track sales, manage inventory, and more.
                                To join <strong>${workspaceName}</strong>, download KashAm and tap the button below to accept this invitation.
                            </p>
                            <a href="${deepLink}" style="display: block; text-align: center; background: #16a34a; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px;">
                                Accept Invitation
                            </a>
                        </div>
                        
                        <p style="color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.5;">
                            This invitation expires in 7 days.<br>
                            If you don't have KashAm installed, download it first, then tap Accept Invitation.<br>
                            If you didn't expect this invitation, you can safely ignore this email.
                        </p>
                    </div>
                `,
            });
            this.logger.log(`[Resend] New-user invite email sent to ${toEmail}`);
        } catch (err: any) {
            this.logger.error(`[Resend] Failed to send new-user invite to ${toEmail}: ${err.message}`);
            // Non-blocking — member record already created in DB
        }
    }

    // ── Staff Invite: Existing User ────────────────────────────────────────────
    /**
     * Invite someone who ALREADY has a KashAm account.
     * Deep link opens the app directly to a confirmation screen.
     * No passwords are sent. No accounts are created.
     */
    async sendExistingUserInvite(params: {
        toEmail: string;
        toName: string | null;
        workspaceName: string;
        role: string;
        inviteToken: string;
    }): Promise<void> {
        const { toEmail, toName, workspaceName, role, inviteToken } = params;
        const deepLink = `kasham://invite?token=${inviteToken}`;
        const roleLabel = role === 'MANAGER' ? 'Manager' : 'Staff Member';
        const greeting = toName ? `Hi ${toName},` : 'Hello,';

        try {
            await this.resend.emails.send({
                from: `KashAm <${this.fromEmail}>`,
                to: toEmail,
                subject: `You've been invited to join ${workspaceName} on KashAm`,
                html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <div style="display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 28px; text-align: center;">K</div>
                        </div>
                        <h2 style="color: #0f172a; text-align: center; margin-bottom: 8px;">New Workspace Invitation</h2>
                        <p style="color: #374151; margin-bottom: 24px;">${greeting} You've been invited to join <strong>${workspaceName}</strong> as a <strong style="color: #16a34a;">${roleLabel}</strong>.</p>
                        
                        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                            <p style="color: #374151; margin: 0 0 16px; font-size: 14px;">
                                Since you already have a KashAm account, simply open the app and tap the button below to accept or decline this invitation.
                            </p>
                            <a href="${deepLink}" style="display: block; text-align: center; background: #16a34a; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px;">
                                Open in KashAm
                            </a>
                        </div>
                        
                        <p style="color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.5;">
                            This invitation expires in 7 days.<br>
                            If you didn't expect this invitation, you can safely ignore this email.
                        </p>
                    </div>
                `,
            });
            this.logger.log(`[Resend] Existing-user invite email sent to ${toEmail}`);
        } catch (err: any) {
            this.logger.error(`[Resend] Failed to send existing-user invite to ${toEmail}: ${err.message}`);
        }
    }

    /**
     * @deprecated Use sendNewUserInvite or sendExistingUserInvite instead.
     * Kept for backwards compatibility during transition.
     */
    async sendStaffInviteEmail(email: string, workspaceName: string, inviterName: string | null, tempPassword: string): Promise<void> {
        this.logger.warn('[EmailService] sendStaffInviteEmail is deprecated — use sendNewUserInvite or sendExistingUserInvite');
        // no-op: old flow is replaced
    }
}
