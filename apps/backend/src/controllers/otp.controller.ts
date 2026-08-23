import { Request, Response, NextFunction } from 'express';
import { OtpService } from '../services/otp.service.js';
import { pool } from '../db/index.js';

export class OtpController {
  
  static async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { target, type } = req.body;
      
      if (!target || !type) {
        return res.status(400).json({ error: 'Target destination and type are required' });
      }

      await OtpService.generateAndSend(target, type);

      return res.json({ success: true, message: `OTP dispatched to ${target}` });
    } catch (err) {
      next(err);
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { target, type, otp } = req.body;

      if (!target || !otp) {
        return res.status(400).json({ error: 'Target and OTP are required' });
      }

      // Validates the code strictly via Redis
      await OtpService.verifyOtp(target, type, otp);

      // Identity Check (Only for Emails)
      let userExists = false;
      if (type === 'EMAIL') {
        const check = await pool.query('SELECT id FROM users WHERE email = $1', [target]);
        userExists = check.rows.length > 0;
      }

      // Returns the userExists flag for the frontend to dynamically adjust the UI
      return res.json({ 
        success: true, 
        message: 'Verification successful',
        userExists 
      });

    } catch (err: any) {
      // Intercepts known client-side errors and return a 400 status directly
      if (err.message === 'Invalid OTP' || err.message === 'OTP has expired or does not exist') {
        return res.status(400).json({ error: err.message });
      }
      
      next(err); 
    }
  }
}