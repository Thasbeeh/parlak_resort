import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary server-side instance
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinarySignatureResult {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder?: string;
}

/**
 * Extracts Cloudinary publicId from a full delivery URL.
 * e.g. "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/dome_main.webp" -> "units/dome_main"
 * e.g. "https://res.cloudinary.com/parlak-resort/image/upload/w_400,h_300/v12345/units/dome_01.jpg" -> "units/dome_01"
 */
export function extractPublicIdFromUrl(url: string): string | null {
  if (!url || typeof url !== 'string' || !url.includes('/upload/')) {
    return null;
  }

  try {
    const [baseUrl] = url.split(/[?#]/);
    const afterUpload = baseUrl.split('/upload/')[1];
    if (!afterUpload) return null;

    const segments = afterUpload.split('/');
    const pathSegments: string[] = [];

    for (const segment of segments) {
      // Skip Cloudinary version segment (e.g. v1, v1720000000)
      if (segment.match(/^v\d+$/)) {
        continue;
      }
      // Skip transformation segments containing comma-separated commands or format/quality flags (e.g. w_400,h_300,c_fill,q_auto:best)
      if (
        segment.includes(',') ||
        segment.match(/^(?:[a-z]{1,3}_[a-zA-Z0-9_:.]+)+$/)
      ) {
        continue;
      }
      pathSegments.push(segment);
    }

    if (pathSegments.length === 0) return null;

    const fullPath = pathSegments.join('/');
    const dotIndex = fullPath.lastIndexOf('.');
    return dotIndex !== -1 ? fullPath.substring(0, dotIndex) : fullPath;
  } catch {
    return null;
  }
}

/**
 * Delete an image asset from Cloudinary by its public ID or full URL.
 * Triggered on Admin Panel photo deletion safeguard.
 */
export async function deleteCloudinaryImage(publicIdOrUrl: string): Promise<boolean> {
  try {
    if (!publicIdOrUrl || typeof publicIdOrUrl !== 'string') return false;
    const cleanTarget = publicIdOrUrl.trim();
    const publicId = cleanTarget.startsWith('http')
      ? extractPublicIdFromUrl(cleanTarget)
      : cleanTarget;

    if (!publicId) return false;

    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Failed to delete image from Cloudinary:', error);
    return false;
  }
}

/**
 * Generate a signed upload signature for secure direct browser-to-Cloudinary uploads.
 * Bypasses Vercel's 4.5MB serverless payload limit without exposing the API secret.
 *
 * Parameters disallowed by Cloudinary in signature calculation ('file', 'cloud_name',
 * 'resource_type', 'api_key', 'signature') are safely stripped.
 */
export function generateCloudinarySignature(
  paramsToSign: Record<string, string | number | boolean> = {}
): CloudinarySignatureResult {
  const timestamp =
    typeof paramsToSign.timestamp === 'number'
      ? paramsToSign.timestamp
      : Math.round(new Date().getTime() / 1000);

  // Cloudinary explicitly requires that 'file', 'cloud_name', 'resource_type', 'api_key',
  // and 'signature' NOT be included in the signed string payload.
  const disallowedKeys = new Set([
    'file',
    'cloud_name',
    'resource_type',
    'api_key',
    'signature',
  ]);

  const cleanParams: Record<string, string | number | boolean> = {};
  for (const [key, val] of Object.entries(paramsToSign)) {
    if (!disallowedKeys.has(key) && val !== undefined && val !== null) {
      cleanParams[key] = val;
    }
  }
  cleanParams.timestamp = timestamp;

  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';

  const signature = cloudinary.utils.api_sign_request(cleanParams, apiSecret);

  return {
    timestamp,
    signature,
    apiKey,
    cloudName,
    folder: typeof paramsToSign.folder === 'string' ? paramsToSign.folder : undefined,
  };
}

/**
 * Backward-compatible alias for generateCloudinarySignature
 */
export const generateUploadSignature = generateCloudinarySignature;

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
  if (!publicIdOrUrl || typeof publicIdOrUrl !== 'string') {
    return '';
  }

  // If it's already a full Cloudinary URL, insert the transforms
  if (
    publicIdOrUrl.startsWith('https://res.cloudinary.com/') ||
    publicIdOrUrl.startsWith('http://res.cloudinary.com/')
  ) {
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
