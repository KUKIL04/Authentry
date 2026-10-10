import { Request, Response, NextFunction } from 'express';
import { QueryService } from '../services/query.service.js';
import { CryptoService } from '../services/crypto.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { RequestUtil } from '../utils/request.util.js';
import { pool } from '../db/index.js';

export class TenantController {
  // Brand registration step
  static async registerTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        companyName, logoUrl, themeColor, 
        legalName, taxId, registrationNumber, industry, orgSize, 
        addressStreet, addressCity, addressState, addressPincode,
        adminEmail, adminPassword, 
        // These fields are only required if it's a brand new user
        adminFirstName, adminMiddleName, adminLastName, 
        adminMobile, adminCountryCode, customProfileData
      } = req.body;

      if (!companyName || !adminEmail || !adminPassword) {
        return res.status(400).json({ error: 'Company Name, Email, and Password are required' });
      }

      // Checks for Global Identity FIRST
      const existingUserCheck = await pool.query('SELECT * FROM users WHERE email = $1', [adminEmail]);
      const isGlobalIdentity = existingUserCheck.rows.length > 0;
      let targetUserId;

      if (isGlobalIdentity) {
        const existingUser = existingUserCheck.rows[0];
        const match = await CryptoService.verifyPassword(adminPassword, existingUser.password_hash);
        
        if (!match) {
          return res.status(400).json({ error: 'Global Identity found, but the master password was incorrect.' });
        }
        targetUserId = existingUser.id;
      } else {
        // Enforces full profile requirements for new users
        if (!adminFirstName || !adminLastName || !adminMobile) {
          return res.status(400).json({ error: 'Complete profile data is required for new accounts.' });
        }
      }

      // Safe to create the Tenant (Credentials are valid)
      const tenant = await QueryService.createTenant({
        companyName, logoUrl, themeColor,
        legalName, taxId, registrationNumber, industry, orgSize,
        addressStreet, addressCity, addressState, addressPincode
      });

      await QueryService.cloneSystemRolesToTenant(tenant.id);

      let finalAdminUser;

      // Connects the Identity
      if (isGlobalIdentity) {
        // Map existing user as the ACTIVE admin of the new tenant
        await pool.query(`
          INSERT INTO workspace_memberships (user_id, tenant_id, status, is_tenant_admin)
          VALUES ($1, $2, 'ACTIVE', true)
        `, [targetUserId, tenant.id]);

        finalAdminUser = { id: targetUserId, email: adminEmail };
      } else {
        // Creates brand new user
        const passwordHash = await CryptoService.hashPassword(adminPassword);
        finalAdminUser = await QueryService.createUser({
          tenantId: tenant.id,
          email: adminEmail,
          passwordHash,
          firstName: adminFirstName,
          middleName: adminMiddleName,
          lastName: adminLastName,
          countryCode: adminCountryCode || '91',
          mobileNo: adminMobile,
          isTenantAdmin: true,
          status: 'ACTIVE',
          customProfileData: customProfileData || {}
        });
      }

      // Logs the event
      await QueryService.logEvent(tenant.id, finalAdminUser.id, 'TENANT_ONBOARDED', RequestUtil.getIp(req), RequestUtil.getAgent(req), { companyName });

      return res.status(201).json({ message: 'Workspace provisioned successfully!', tenant, admin: finalAdminUser });
    } catch (err) {
      next(err);
    }
  }
}