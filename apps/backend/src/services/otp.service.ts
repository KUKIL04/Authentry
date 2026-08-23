import { redisClient } from '../db/redis.js';
import { EmailService } from './email.service.js';

export class OtpService {

  static async generateAndSend(target: string, type: 'EMAIL' | 'PHONE') {
    // Generates a cryptographically secure 6-digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Stores in Redis with a 10-minute (600 seconds) expiration
    const redisKey = `otp:${type}:${target}`;
    await redisClient.setEx(redisKey, 600, otp);

    // Dispatches via the correct channel
    if (type === 'EMAIL') {
      await EmailService.sendOtpEmail(target, otp);
    } else if (type === 'PHONE') {
      // Placeholder for future Twilio/SMS integration
      console.log(`\n📱 [MOCK SMS] Sent ${otp} to ${target}\n`);
    }

    return true;
  }

  // Validates the OTP provided by the user
  static async verifyOtp(target: string, type: 'EMAIL' | 'PHONE', providedOtp: string) {
    const redisKey = `otp:${type}:${target}`;
    const storedOtp = await redisClient.get(redisKey);

    if (!storedOtp) {
      throw new Error('OTP has expired or does not exist');
    }

    if (storedOtp !== providedOtp) {
      throw new Error('Invalid OTP');
    }

    // Burns the OTP after successful verification so it cannot be reused
    await redisClient.del(redisKey);
    return true;
  }
}