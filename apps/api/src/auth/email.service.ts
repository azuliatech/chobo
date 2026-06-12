import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly resend: Resend;
    private readonly fromEmail: string;

    constructor() {
        this.resend = new Resend(process.env.RESEND_API_KEY);
        this.fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    }

    async sendVerificationEmail(email: string, name: string | null, token: string): Promise<void> {
        const verifyUrl = `${process.env.APP_URL || 'https://kasham-api-staging.onrender.com'}/api/v1/auth/verify-email?token=${token}`;

        try {
            await this.resend.emails.send({
                from: `KashAm <${this.fromEmail}>`,
                to: email,
                subject: 'Verify your KashAm account',
                html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
                        <h2 style="color: #16a34a; margin-bottom: 8px;">Welcome to KashAm${name ? `, ${name}` : ''}! 👋</h2>
                        <p style="color: #374151; margin-bottom: 24px;">Click the button below to verify your email address and activate your account.</p>
                        <a href="${verifyUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-bottom: 24px;">Verify Email Address</a>
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

    async sendPasswordResetEmail(email: string, name: string | null, token: string): Promise<void> {
        const resetUrl = `${process.env.APP_URL || 'https://kasham-api-staging.onrender.com'}/api/v1/auth/reset-password?token=${token}`;

        try {
            await this.resend.emails.send({
                from: `KashAm <${this.fromEmail}>`,
                to: email,
                subject: 'Reset your KashAm password',
                html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
                        <h2 style="color: #16a34a; margin-bottom: 8px;">Password Reset Request</h2>
                        <p style="color: #374151; margin-bottom: 24px;">Hi${name ? ` ${name}` : ''}! We received a request to reset your KashAm password. Click below to set a new one.</p>
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

    async sendStaffInviteEmail(email: string, workspaceName: string, inviterName: string | null, tempPassword: string): Promise<void> {
        try {
            await this.resend.emails.send({
                from: `KashAm <${this.fromEmail}>`,
                to: email,
                subject: `You've been added to ${workspaceName} on KashAm`,
                html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
                        <h2 style="color: #16a34a; margin-bottom: 8px;">You've been added to ${workspaceName}! 🎉</h2>
                        <p style="color: #374151; margin-bottom: 8px;">${inviterName || 'A store owner'} has added you as a staff member on KashAm.</p>
                        <p style="color: #374151; margin-bottom: 24px;">Download KashAm and log in with your email and the temporary password below. Please change your password after your first login.</p>
                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                            <p style="margin: 0; color: #374151;"><strong>Email:</strong> ${email}</p>
                            <p style="margin: 8px 0 0; color: #374151;"><strong>Temporary Password:</strong> <code style="background: #dcfce7; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
                        </div>
                        <p style="color: #6b7280; font-size: 13px;">If you didn't expect this invitation, you can safely ignore this email.</p>
                    </div>
                `,
            });
            this.logger.log(`[Resend] Staff invite email sent to ${email}`);
        } catch (err: any) {
            this.logger.error(`[Resend] Failed to send invite email to ${email}: ${err.message}`);
            // Non-blocking — don't throw, staff is already added to DB
        }
    }
}
