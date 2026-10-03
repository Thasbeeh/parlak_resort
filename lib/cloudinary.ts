import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary server-side instance
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Delete an image asset from Cloudinary by its public ID.
 * Triggered on Admin Panel photo deletion safeguard.
 */
export async function deleteCloudinaryImage(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Failed to delete image from Cloudinary:', error);
    throw new Error('Cloudinary deletion failed');
  }
}

/**
 * Generate a signed upload signature for secure direct browser-to-Cloudinary uploads.
 * This prevents exposing the API secret to the client.
 */
export function generateUploadSignature(paramsToSign: Record<string, string | number> = {}) {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      ...paramsToSign,
    },
    process.env.CLOUDINARY_API_SECRET || ''
  );

  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  };
}

/**
 * Helper to construct optimized Cloudinary delivery URLs on the fly
 * with automatic WebP/AVIF format and responsive sizing.
 */
export function getOptimizedImageUrl(
  publicIdOrUrl: string,
  options: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'scale' | 'fit' | 'thumb';
    quality?: string | number;
  } = {}
): string {
  // If it's already a full Cloudinary URL, insert the transforms
  if (publicIdOrUrl.startsWith('https://res.cloudinary.com/')) {
    const { width, height, crop = 'fill', quality = 'auto' } = options;
    const transformParts = ['f_auto', `q_${quality}`];
    if (width) transformParts.push(`w_${width}`);
    if (height) transformParts.push(`h_${height}`);
    if (width || height) transformParts.push(`c_${crop}`);

    const transformStr = transformParts.join(',');
    return publicIdOrUrl.replace('/upload/', `/upload/${transformStr}/`);
  }

  // Otherwise generate URL using the SDK
  return cloudinary.url(publicIdOrUrl, {
    fetch_format: 'auto',
    quality: 'auto',
    width: options.width,
    height: options.height,
    crop: options.crop || 'fill',
    secure: true,
  });
}

export default cloudinary;
