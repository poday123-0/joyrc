/**
 * Cloudinary CDN Integration
 * Uses Cloudinary's fetch API to optimize images from any URL
 * No upload required - transforms on-the-fly
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'rcjoy';

interface CloudinaryOptions {
  width?: number;
  height?: number;
  quality?: 'auto' | 'auto:low' | 'auto:eco' | 'auto:good' | 'auto:best' | number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'limit';
  gravity?: 'auto' | 'face' | 'center';
  dpr?: 'auto' | number;
}

/**
 * Generate an optimized Cloudinary URL for any image
 * Falls back to original URL if Cloudinary is not configured
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  options: CloudinaryOptions = {}
): string {
  // If no cloud name configured, return original URL
  if (!CLOUDINARY_CLOUD_NAME || !originalUrl) {
    return originalUrl;
  }

  // Skip if already a Cloudinary URL
  if (originalUrl.includes('res.cloudinary.com')) {
    return originalUrl;
  }

  // Skip data URLs and local assets
  if (originalUrl.startsWith('data:') || originalUrl.startsWith('/') || originalUrl.startsWith('blob:')) {
    return originalUrl;
  }

  // Build transformation string
  const transformations: string[] = [];

  // Always use auto format and quality for best optimization
  transformations.push(`f_${options.format || 'auto'}`);
  transformations.push(`q_${options.quality || 'auto'}`);

  // Add dimensions if specified
  if (options.width) {
    transformations.push(`w_${options.width}`);
  }
  if (options.height) {
    transformations.push(`h_${options.height}`);
  }

  // Add crop mode
  if (options.crop) {
    transformations.push(`c_${options.crop}`);
  }

  // Add gravity for smart cropping
  if (options.gravity) {
    transformations.push(`g_${options.gravity}`);
  }

  // Add DPR for retina displays
  if (options.dpr) {
    transformations.push(`dpr_${options.dpr}`);
  }

  const transformationString = transformations.join(',');

  // Use Cloudinary's fetch API to transform the image
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/${transformationString}/${encodeURIComponent(originalUrl)}`;
}

/**
 * Generate srcset for responsive images
 */
export function getResponsiveSrcSet(
  originalUrl: string,
  widths: number[] = [320, 640, 960, 1280, 1920],
  options: Omit<CloudinaryOptions, 'width'> = {}
): string {
  if (!CLOUDINARY_CLOUD_NAME || !originalUrl) {
    return '';
  }

  return widths
    .map(width => {
      const url = getOptimizedImageUrl(originalUrl, { ...options, width });
      return `${url} ${width}w`;
    })
    .join(', ');
}

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured(): boolean {
  return !!CLOUDINARY_CLOUD_NAME;
}
