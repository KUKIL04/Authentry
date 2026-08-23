import dotenv from 'dotenv';
dotenv.config();

import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import path from 'path';

// 1. Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Configure Cloudinary Storage Engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Generates a secure, unique filename: tenantId-timestamp
    const tenantId = (req as any).user?.tenantId || 'unknown-tenant';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    
    return {
      folder: 'idp_logos', // Creates a specific folder in your Cloudinary media library
      public_id: `logo-${tenantId}-${uniqueSuffix}`, // File extension is handled automatically
      allowed_formats: ['jpeg', 'jpg', 'png', 'webp', 'svg'],
    };
  },
});

// 3. Create the upload instance with file validation
export const uploadLogo = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, WEBP, SVG) are allowed'));
    }
  }
});