import { v2 as cloudinary } from 'cloudinary';

/**
 * Extracts public_id from a Cloudinary URL and deletes the asset.
 * Example URL: https://res.cloudinary.com/.../upload/v1716298374/idp_logos/logo-123.png
 * Extracted public_id: idp_logos/logo-123
 */
export async function deleteCloudinaryAsset(imageUrl: string): Promise<void> {
  try {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) return;

    const uploadIndex = imageUrl.indexOf('/upload/');
    if (uploadIndex === -1) return;

    // Grab everything after /upload/
    let pathAfterUpload = imageUrl.substring(uploadIndex + 8);

    // Strip out the version prefix (e.g., "v1716298374/")
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');

    // Strip out the file extension
    const dotIndex = pathAfterUpload.lastIndexOf('.');
    const publicId = dotIndex !== -1 ? pathAfterUpload.substring(0, dotIndex) : pathAfterUpload;

    // Delete the asset from Cloudinary
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Failed to delete orphaned Cloudinary asset:', err);
  }
}