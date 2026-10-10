import nodemailer from 'nodemailer';
import { Telemetry } from '../utils/telemetry.util.js';

export class EmailService {
  private static transporter: nodemailer.Transporter;

  private static getTransporter() {
    if (!this.transporter) {
      // Direct environmental switch: In production/staging, we hook up the actual SMTP cluster
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST, // or smtp.sendgrid.net, email-smtp.us-east-1.amazonaws.com
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
          auth: {
            user: process.env.SMTP_USER, // Our verified provider access key
            pass: process.env.SMTP_PASSWORD, // Our provider secret key
          },
        });
        console.log(`🚀 Production SMTP Mail Pool initialized via ${process.env.SMTP_HOST}`);
      } else {
        // Fallback to local sandbox fallback if environment variables are missing
        console.warn('⚠️ SMTP credentials missing. Falling back to Ethereal Sandbox.');
        return this.initializeEtherealTransporter();
      }
    }
    return this.transporter;
  }

  private static async initializeEtherealTransporter() {
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️ Cloud Sandbox Enabled: Using Mock JSON Transporter to bypass firewall blocks.');
      this.transporter = nodemailer.createTransport({
        jsonTransport: true
      });
      return this.transporter;
    }

    // This remains for local development on our machine
    const testAccount = await nodemailer.createTestAccount();
    this.transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log(`✉️ Local Dev Sandbox Enabled. Ethereal Inbox: ${testAccount.user}`);
    return this.transporter;
  }

  // --- 1. OTP Email ---
  static async sendOtpEmail(to: string, otp: string) {
    try {
      const transporter = await this.getTransporter();

      const info = await Telemetry.track('email', 'send_otp', async() => {
        return await transporter.sendMail({
          from: '"Workspace Security" <security@authentry.com>',
          to,
          subject: 'Your Matrix Security Code',
          text: `Your verification code is: ${otp}. It expires in 10 minutes.`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #334155;">
              <h2 style="color: #e49b0f;">Workspace Security</h2>
              <p>You requested a secure action on your account.</p>
              <p>Your verification code is: <strong style="font-size: 24px; letter-spacing: 4px;">${otp}</strong></p>
              <p style="font-size: 12px; color: #64748b; margin-top: 20px;">This code expires in 10 minutes. If you did not request this, please contact your administrator.</p>
            </div>
          `
        });
      });

      console.log("\n-----------------------------------------");
      console.log(`📩 [MOCK EMAIL] OTP sent to ${to}`);
      console.log(`🔑 SECURITY CODE: ${otp}`); // Prints the OTP for Render testing!
      
      const testUrl = nodemailer.getTestMessageUrl(info);
      if (testUrl) console.log("🔗 Preview URL: %s", testUrl);
      console.log("-----------------------------------------\n");
    } catch (error) {
      console.error("Failed to send OTP email:", error);
      throw new Error("Email dispatch failed");
    }
  }

  // --- 2. Invitation Email ---
  static async sendInviteEmail(to: string, inviteLink: string) {
    try {
      const transporter = await this.getTransporter();
      const info = await Telemetry.track('email', 'send_invite', async() => {
        return await transporter.sendMail({
          from: '"HR Command" <hr@authentry.com>',
          to,
          subject: 'Invitation to Join Workspace',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #334155;">
              <h2 style="color: #e49b0f;">Welcome to the Team!</h2>
              <p>You have been invited to set up your corporate workspace account.</p>
              <a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background-color: #e49b0f; color: white; text-decoration: none; font-weight: bold; border-radius: 8px; margin: 20px 0;">Accept Invitation</a>
              <p style="font-size: 12px; color: #64748b;">This link will expire securely. Do not share it with anyone.</p>
            </div>
          `
        });
      });  
      console.log("\n-----------------------------------------");
      console.log(`📩 [MOCK EMAIL] Invite sent to ${to}`);
      console.log(`🔗 SECURE INVITE LINK: ${inviteLink}`);
      
      const testUrl = nodemailer.getTestMessageUrl(info);
      if (testUrl) console.log("🔗 Ethereal Preview URL: %s", testUrl);
      console.log("-----------------------------------------\n");
    } catch (error) {
      console.error("Failed to send invite email:", error);
    }
  }

  // --- 3. Workspace Added Notification (Global Identity) ---
  static async sendWorkspaceAddedNotification(to: string, tenantName: string) {
    try {
      const transporter = await this.getTransporter();
      
      const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
      
      const info = await Telemetry.track('email', 'send_workspace_added', async () => {
        return await transporter.sendMail({
          from: '"HR Command" <hr@authentry.com>',
          to,
          subject: `You have been added to ${tenantName}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #334155;">
              <h2 style="color: #e49b0f;">Workspace Assignment Update</h2>
              <p>Your global account has been successfully linked to the <strong>${tenantName}</strong> workspace.</p>
              <p>You have been placed in the secure Waiting Room. You can log in at any time to check your module provisioning status.</p>
              <a href="${loginLink}" style="display: inline-block; padding: 12px 24px; background-color: #e49b0f; color: white; text-decoration: none; font-weight: bold; border-radius: 8px; margin: 20px 0;">Log In to Platform</a>
              <p style="font-size: 12px; color: #64748b;">Powered by AUTHENTRY</p>
            </div>
          `
        });
      });  
      console.log("\n-----------------------------------------");
      console.log(`📩 [MOCK EMAIL] Workspace notification sent to ${to}`);
      console.log(`🔗 LOGIN LINK: ${loginLink}`);
      
      const testUrl = nodemailer.getTestMessageUrl(info);
      if (testUrl) console.log("🔗 Ethereal Preview URL: %s", testUrl);
      console.log("-----------------------------------------\n");
    } catch (error) {
      console.error("Failed to send workspace added notification email:", error);
    }
  }

  // --- 4. Status Change Notification ---
  static async sendStatusChangeEmail(to: string, newStatus: string) {
    try {
      const transporter = await this.getTransporter();
      const info = await Telemetry.track('email', 'send_status_change', async() => {
        return await transporter.sendMail({
          from: '"Workspace Admin" <admin@authentry.com>',
          to,
          subject: 'Account Status Update',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #334155;">
              <h2 style="color: #e49b0f;">Account Update</h2>
              <p>Your workspace account is <strong style="text-transform: uppercase;">${newStatus}</strong></p>
              <p style="font-size: 12px; color: #64748b; margin-top: 20px;">If you have questions, please contact your HR department.</p>
            </div>
          `
        });
      });  
      console.log(`\n📩 Status update sent to ${to}\n🔗 Preview: %s\n`, nodemailer.getTestMessageUrl(info));
    } catch (error) {
      console.error("Failed to send status email:", error);
    }
  }

  // --- 5. Account Unlocked Notification ---
  static async sendLockoutClearedEmail(to: string) {
    try {
      const transporter = await this.getTransporter();
      const info = await Telemetry.track('email', 'send_lockout_cleared', async () => {
        return await transporter.sendMail({
          from: '"Workspace Security" <security@authentry.com>',
          to,
          subject: 'Account Unlocked',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #334155;">
              <h2 style="color: #16a34a;">Account Unlocked</h2>
              <p>Your workspace administrator has successfully cleared your security lockout.</p>
              <p>You may now return to the login portal and securely access your account.</p>
              <p style="font-size: 12px; color: #64748b; margin-top: 20px;">If you do not remember your password, please use the Forgot Password link on the login screen.</p>
            </div>
          `
        });
      });  
      console.log(`\n📩 Lockout cleared email sent to ${to}\n🔗 Preview: %s\n`, nodemailer.getTestMessageUrl(info));
    } catch (error) {
      console.error("Failed to send lockout cleared email:", error);
    }
  }

  // --- 6. Force Password Reset Notification ---
  static async sendForceResetNotification(to: string) {
    try {
      const transporter = await this.getTransporter();
      const info = await Telemetry.track('email', 'send_force_reset', async () => {
          return await transporter.sendMail({
          from: '"Workspace Security" <security@authentry.com>',
          to,
          subject: 'Mandatory Password Reset Required',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #334155;">
              <h2 style="color: #ef4444;">Security Alert: Password Reset Required</h2>
              <p>Your workspace administrator has invalidated your current password for security reasons.</p>
              <p><strong>All your active network sessions have been terminated.</strong></p>
              <p style="margin-top: 20px;">Please navigate to the portal and use the <strong>Forgot Password</strong> link to set up a new secure credential.</p>
            </div>
          `
        });
      });  
      console.log(`\n📩 Force reset notification sent to ${to}\n🔗 Preview: %s\n`, nodemailer.getTestMessageUrl(info));
    } catch (error) {
      console.error("Failed to send force reset email:", error);
    }
  }
  
  // --- 7. Tenant Freeze/Activate Notification ---
  static async sendTenantStatusNotification(to: string, tenantName: string, status: string) {
    try {
      const transporter = await this.getTransporter();
      const isFrozen = status === 'FROZEN';
      
      const info = await Telemetry.track('email', 'send_tenant_status', async () => {
        return await transporter.sendMail({
          from: '"Platform Security" <security@authentry.com>',
          to,
          subject: `URGENT: Workspace ${isFrozen ? 'Suspended' : 'Restored'}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #334155;">
              <h2 style="color: ${isFrozen ? '#ef4444' : '#10b981'};">Workspace ${isFrozen ? 'Suspension' : 'Restoration'} Notice</h2>
              <p>Your workspace <strong>${tenantName}</strong> has been <strong>${status}</strong> by Platform Administrator.</p>
              ${isFrozen 
                ? '<p><strong>All active user sessions have been immediately terminated.</strong> Your API endpoints will now return 403 Forbidden. Please contact enterprise support immediately to resolve this issue.</p>' 
                : '<p>Network access has been fully restored. Your users may now log in normally.</p>'}
            </div>
          `
        });
      });
      console.log(`\n📩 Workspace Status (${status}) sent to ${to}\n🔗 Preview: %s\n`, nodemailer.getTestMessageUrl(info));
    } catch (error) {
      console.error("Failed to send workspace status email:", error);
    }
  }

  // --- 8. Global Blacklist Notification ---
  static async sendGlobalBlacklistNotification(to: string, isBlacklisted: boolean) {
    try {
      const transporter = await this.getTransporter();
      const action = isBlacklisted ? 'Suspended' : 'Restored';
      const color = isBlacklisted ? '#ef4444' : '#10b981';

      const info = await Telemetry.track('email', 'send_global_blacklist', async () => {
        return await transporter.sendMail({
          from: '"Platform Security" <security@authentry.com>',
          to,
          subject: `URGENT: Global Identity ${action}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #334155;">
              <h2 style="color: ${color};">Identity Network ${action}</h2>
              <p>Your global platform identity has been <strong>${action.toLowerCase()}</strong> by Platform Administrator.</p>
              ${isBlacklisted 
                ? '<p><strong>All your active network sessions across all workspaces have been terminated.</strong> You will no longer be able to access any corporate environments associated with this email address.</p>' 
                : '<p>Your global network access has been fully restored. You may now log in normally to your associated workspaces.</p>'}
              <p style="font-size: 12px; color: #64748b; margin-top: 20px;">If you believe this is an error, please contact platform support.</p>
            </div>
          `
        });
      });
      console.log(`\n📩 Global Blacklist Status (${action}) sent to ${to}\n🔗 Preview: %s\n`, nodemailer.getTestMessageUrl(info));
    } catch (error) {
      console.error("Failed to send global blacklist email:", error);
    }
  }

  // --- 9. Plan Upgrade Notification ---
  static async sendPlanUpgradeEmail(to: string, planName: string, maxMau: number | null, maxApiRequests: number | null) {
    try {
      const transporter = await this.getTransporter();
      const info = await Telemetry.track('email', 'send_plan_upgrade', async () => {
        return await transporter.sendMail({
          from: '"Workspace Billing" <billing@authentry.com>',
          to,
          subject: `Workspace Upgraded to ${planName}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #334155;">
              <h2 style="color: #10b981;">Subscription Upgraded 🚀</h2>
              <p>Your workspace has been successfully upgraded to the <strong>${planName}</strong> tier.</p>
              
              <h3 style="margin-top: 20px; color: #475569;">New Plan Limits:</h3>
              <ul style="background-color: #f8fafc; padding: 15px 15px 15px 35px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <li style="margin-bottom: 8px;"><strong>Active Users (MAU):</strong> ${maxMau === null ? 'Unlimited' : maxMau}</li>
                <li><strong>API Requests:</strong> ${maxApiRequests === null ? 'Unlimited' : maxApiRequests}</li>
              </ul>
              
              <p style="margin-top: 20px;">All previously restricted features for this tier (such as advanced RBAC and custom branding) are now unlocked and available in your admin dashboard.</p>
              <p style="font-size: 12px; color: #64748b; margin-top: 30px;">Thank you for growing with AUTHENTRY.</p>
            </div>
          `
        });
      });
      console.log(`\n📩 Plan upgrade email sent to ${to}\n🔗 Preview: %s\n`, nodemailer.getTestMessageUrl(info));
    } catch (error) {
      console.error("Failed to send plan upgrade email:", error);
    }
  }

  // --- 10. Suspicious Login/Refresh Attempt Notification ---
  static async sendSuspiciousActivityEmail(
    to: string, 
    location: string, 
    ipAddress: string, 
    device: string
  ) {
    try {
      const transporter = await this.getTransporter();
      const timestamp = new Date().toUTCString();

      const info = await Telemetry.track('email', 'send_suspicious_activity', async () => {
        return await transporter.sendMail({
          from: '"Workspace Security" <security@authentry.com>',
          to,
          subject: 'Security Alert: Suspicious Activity Blocked',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0;">
              <h2 style="color: #dc2626; margin-top: 0; font-size: 20px;">Suspicious Activity Intercepted</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                A session refresh request occurred with anomalous security parameters (sudden geographical discrepancy). For your security, this session was terminated immediately.
              </p>
              
              <div style="background-color: #ffffff; border: 1px solid #fee2e2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; width: 110px;">Device / Client:</td>
                    <td style="padding: 6px 0; font-family: monospace;">${device}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600;">Location:</td>
                    <td style="padding: 6px 0;">${location}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600;">IP Address:</td>
                    <td style="padding: 6px 0; font-family: monospace;">${ipAddress}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600;">Timestamp:</td>
                    <td style="padding: 6px 0;">${timestamp}</td>
                  </tr>
                </table>
              </div>
              
              <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin-bottom: 0;">
                If this was you switching to a VPN or travelling, please log in again. If you did not initiate this action, someone may possess your expired session artifacts; change your password immediately.
              </p>
            </div>
          `
        });
      });
      console.log(`\n📩 Suspicious activity email sent to ${to}\n🔗 Preview: %s\n`, nodemailer.getTestMessageUrl(info));
    } catch (error) {
      console.error("Failed to send suspicious activity email:", error);
    }
  }

  // --- 11. Token Theft Replay Alert Notification ---
  static async sendTokenTheftAlertEmail(
    to: string, 
    ipAddress: string, 
    device: string, 
    location: string
  ) {
    try {
      const transporter = await this.getTransporter();
      const timestamp = new Date().toUTCString();

      const info = await Telemetry.track('email', 'send_token_theft', async () => {
        return await transporter.sendMail({
          from: '"Workspace Security" <security@authentry.com>',
          to,
          subject: 'CRITICAL: Potential Session Hijacking Blocked',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0;">
              <h2 style="color: #b91c1c; margin-top: 0; font-size: 20px;">CRITICAL: Token Replay Attack Intercepted</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                Our security perimeter detected a <strong>Token Reuse Attempt</strong>. A previously rotated, invalidated cryptographic refresh token was presented to our API.
              </p>
              
              <div style="background-color: #fef2f2; border: 1px solid #f87171; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #991b1b;">
                  Action Taken: ALL active sessions across all devices were terminated immediately.
                </p>
                <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 4px 0; font-weight: 600; width: 110px;">Attacker Device:</td>
                    <td style="padding: 4px 0; font-family: monospace;">${device}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-weight: 600;">Origin Location:</td>
                    <td style="padding: 4px 0;">${location}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-weight: 600;">Origin IP:</td>
                    <td style="padding: 4px 0; font-family: monospace;">${ipAddress}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-weight: 600;">Time:</td>
                    <td style="padding: 4px 0;">${timestamp}</td>
                  </tr>
                </table>
              </div>
              
              <p style="font-size: 13px; color: #64748b;">
                Please log in through the official portal and immediately change your password to secure your credentials.
              </p>
            </div>
          `
        });
      });
      console.log(`\n📩 Token theft email sent to ${to}\n🔗 Preview: %s\n`, nodemailer.getTestMessageUrl(info));
    } catch (error) {
      console.error("Failed to send token theft email:", error);
    }
  }
}