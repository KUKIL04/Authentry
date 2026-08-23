import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { QueryService } from '../services/query.service.js';
import { CryptoService } from '../services/crypto.service.js';
import { AuthController } from './auth.controller.js';

export class UserController {
  // Checks current profile status (Useful for the Waiting Room)
  static async getMyProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      
      if (!tenantId || !userId) return res.status(400).json({ error: 'Context lost' });

      const profile = await QueryService.getUserByIdAndTenant(userId, tenantId);
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      return res.json(profile);
    } catch (err) {
      next(err);
    }
  }

  // REPLACES: getMyModules
  // Returns the calculated entitlements tree for the frontend Launchpad UI
  static async getMyAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      
      if (!tenantId || !userId) return res.status(400).json({ error: 'Context lost' });

      // The aggregator does all the heavy lifting (Roles + Overrides + Allocations)
      const accessContext = await QueryService.getUserAccessContext(userId, tenantId);
      
      return res.json({
        roles: accessContext.roles,
        entitlements: accessContext.entitlements
      });
    } catch (err) {
      next(err);
    }
  }

  // --- FETCHES SCHEMA FOR PROGRESSIVE PROFILING ---
  static async getOnboardingSchema(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ error: 'Context lost' });
      
      const context = await QueryService.getTenantOnboardingContext(tenantId);
      return res.json({ schema: context?.onboarding_schema || [] });
    } catch (err) {
      next(err);
    }
  }

  // --- SUBMIT MISSING PROFILE DATA ---
  static async completeProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const tenantId = req.user?.tenantId;
      const { customProfileData } = req.body;
      
      if (!userId || !tenantId) return res.status(401).json({ error: 'Unauthorized' });

      // Validates against current schema
      const tenantContext = await QueryService.getTenantOnboardingContext(tenantId);

      if (AuthController.isProfileMissingRequiredFields(tenantContext?.onboarding_schema, customProfileData)) {
        return res.status(400).json({ error: 'Please fill out all required fields.' });
      }

      // Saves data
      await QueryService.updateUserProfileData(userId, tenantId, customProfileData);
      
      // Issues a FRESH, untrapped JWT instantly!
      const accessContext = await QueryService.getUserAccessContext(userId, tenantId);
      const userRecord = await QueryService.getUserByIdAndTenant(userId, tenantId);
      
      const userPayload = {
        userId: userId,
        id: userId,
        tenantId,
        email: userRecord.email,
        firstName: userRecord.first_name,
        lastName: userRecord.last_name,
        status: userRecord.status || 'ACTIVE',
        isAdmin: userRecord.is_tenant_admin || false,
        roles: accessContext.roles,
        entitlements: accessContext.entitlements,
        isProfileIncomplete: false, // FREEDOM!
        isProfileEnforced: tenantContext?.enforce_profile_completion
      };

      const newAccessToken = CryptoService.generateAccessToken(userPayload);

      return res.json({ success: true, accessToken: newAccessToken, user: userPayload, message: 'Profile updated.' });
    } catch (err) { next(err); }
  }

  // --- UPDATE GLOBAL PLATFORM DETAILS (NAME / MOBILE) ---
  static async updatePlatformProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const tenantId = req.user?.tenantId;
      const { firstName, middleName, lastName, mobileNo } = req.body;

      if (!userId || !tenantId) return res.status(401).json({ error: 'Unauthorized' });
      if (!firstName || !lastName) return res.status(400).json({ error: 'First and Last name are required.' });

      // Updates core user record
      const updatedUser = await QueryService.updateUserPlatformDetails(userId, { firstName, middleName, lastName, mobileNo });

      // Re-aggregates context to issue a fresh JWT with updated name claims
      const accessContext = await QueryService.getUserAccessContext(userId, tenantId);
      const tenantContext = await QueryService.getTenantOnboardingContext(tenantId);
      const profileData = await QueryService.getUserProfileData(userId, tenantId);

      const isProfileIncomplete = AuthController.isProfileMissingRequiredFields(tenantContext?.onboarding_schema, profileData);

      const userPayload = {
        userId: userId,
        id: userId,
        tenantId,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        status: req.user?.status || 'ACTIVE',
        isAdmin: req.user?.isAdmin || false,
        roles: accessContext.roles,
        entitlements: accessContext.entitlements,
        isProfileIncomplete,
        isProfileEnforced: tenantContext?.enforce_profile_completion
      };

      const newAccessToken = CryptoService.generateAccessToken(userPayload);

      return res.json({
        success: true,
        accessToken: newAccessToken,
        user: userPayload,
        message: 'Platform details updated successfully.'
      });
    } catch (err: any) {
      if (err.code === '23505' && err.constraint?.includes('mobile_no')) {
        return res.status(400).json({ error: 'This mobile number is already registered to another user.' });
      }
      next(err);
    }
  }
}