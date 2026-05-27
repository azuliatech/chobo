import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);
    private readonly apiKey = process.env.TERMII_API_KEY;
    private readonly senderId = process.env.TERMII_SENDER_ID || 'N-Alert';
    private readonly channel = process.env.TERMII_CHANNEL || 'generic';
    private readonly baseUrl = 'https://api.ng.termii.com/api';

    // In-memory fallback cache for Mock Mode
    private readonly mockOtpCache = new Map<string, { pin: string; expiresAt: number }>();

    /**
     * Sends a 6-digit verification OTP to the target phone number.
     * Returns a unique session/pin ID.
     */
    async sendOtp(phone: string): Promise<string> {
        // Clean phone number format for Nigerian local number to international
        let cleanedPhone = phone.replace(/\s+/g, '').replace(/[+\-]/g, '');
        if (cleanedPhone.startsWith('0')) {
            cleanedPhone = '234' + cleanedPhone.slice(1);
        }

        // 1. Mock Mode Fallback if API key is not configured or set to mock
        if (!this.apiKey || this.apiKey === 'mock') {
            const mockPin = Math.floor(100000 + Math.random() * 900000).toString();
            const mockPinId = `mock_session_${Math.random().toString(36).substring(2, 15)}`;
            
            // Cache locally for 5 minutes
            this.mockOtpCache.set(mockPinId, {
                pin: mockPin,
                expiresAt: Date.now() + 5 * 60 * 1000,
            });

            this.logger.warn(`[SMS MOCK MODE] OTP Pin for ${phone} is: [ ${mockPin} ]`);
            return mockPinId;
        }

        // 2. Real Termii Integration with Robust Retries and WhatsApp Fallback
        try {
            return await this.sendWithRetryAndFallback(cleanedPhone, this.channel);
        } catch (e: any) {
            this.logger.error(`[Termii Exception] All retry and fallback pathways failed: ${e.message}`);
            throw new Error(`SMS gateway delivery error: ${e.message}`);
        }
    }

    /**
     * Executes a fetch with retries, exponential backoff, and optional WhatsApp channel fallback on failure.
     */
    private async sendWithRetryAndFallback(cleanedPhone: string, channel: string, retriesLeft = 2): Promise<string> {
        try {
            this.logger.log(`[Termii] Attempting to send OTP to ${cleanedPhone} using channel: ${channel}. Retries left: ${retriesLeft}`);
            
            const res = await fetch(`${this.baseUrl}/sms/otp/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: this.apiKey,
                    message_type: 'NUMERIC',
                    to: cleanedPhone,
                    from: this.senderId,
                    channel: channel,
                    pin_attempts: 3,
                    pin_ttl: 5,
                    pin_size: 6,
                    pin_placeholder: 'Your KashAm verification code is < 123456 >. Valid for 5 minutes.',
                    pin_type: 'NUMERIC',
                }),
            });

            const data = await res.json();
            if (!res.ok || data.status !== 200 || !data.pinId) {
                this.logger.error(`[Termii Channel Error] Delivery failed on channel ${channel}: ${JSON.stringify(data)}`);
                throw new Error(data.message || `Failed to trigger Termii verification code on channel ${channel}`);
            }

            this.logger.log(`[Termii] OTP successfully delivered to ${cleanedPhone} via ${channel}. PinID: ${data.pinId}`);
            return data.pinId;
        } catch (e: any) {
            this.logger.error(`[Termii Try Error] Error on channel ${channel}: ${e.message}`);
            
            // If we have retries left for the current channel, retry after a short delay
            if (retriesLeft > 0) {
                const backoffDelay = (3 - retriesLeft) * 1000; // 1s, 2s
                this.logger.warn(`[Termii Retry] Retrying channel ${channel} in ${backoffDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                return this.sendWithRetryAndFallback(cleanedPhone, channel, retriesLeft - 1);
            }

            // If we exhausted retries on standard channel, fall back to WhatsApp channel
            if (channel !== 'whatsapp') {
                this.logger.warn(`[Termii Fallback] Standard SMS exhausted. Initiating WhatsApp channel fallback for ${cleanedPhone}...`);
                // Wait 1s before fallback
                await new Promise(resolve => setTimeout(resolve, 1000));
                // Call with whatsapp channel, resetting retries to 1 for whatsapp
                return this.sendWithRetryAndFallback(cleanedPhone, 'whatsapp', 1);
            }

            throw e;
        }
    }

    /**
     * Verifies the user-submitted code against the stored session ID.
     */
    async verifyOtp(pinId: string, pin: string): Promise<boolean> {
        // 1. Mock Mode Verification
        if (pinId.startsWith('mock_session_') || !this.apiKey || this.apiKey === 'mock') {
            const cached = this.mockOtpCache.get(pinId);
            if (!cached) return false;
            
            // Expiry check
            if (Date.now() > cached.expiresAt) {
                this.mockOtpCache.delete(pinId);
                return false;
            }

            // Standard bypass: '123456' is always valid in dev, or matches logged pin
            const isValid = pin === cached.pin || pin === '123456';
            if (isValid) {
                this.mockOtpCache.delete(pinId); // consume pin
            }
            return isValid;
        }

        // 2. Real Termii Verification
        try {
            const res = await fetch(`${this.baseUrl}/sms/otp/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: this.apiKey,
                    pin_id: pinId,
                    pin: pin,
                }),
            });

            const data = await res.json();
            
            // Termii returns verified: true or verified: "true"
            const isVerified = res.ok && (data.verified === true || data.verified === 'true');
            if (isVerified) {
                this.logger.log(`[Termii] PIN ${pinId} successfully verified!`);
                return true;
            }

            this.logger.warn(`[Termii] Failed PIN verification for ${pinId}: ${JSON.stringify(data)}`);
            return false;
        } catch (e: any) {
            this.logger.error(`[Termii Verification Exception] Could not verify: ${e.message}`);
            return false;
        }
    }
}
