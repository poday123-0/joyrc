/**
 * Image Optimization Utilities
 * Uses Supabase Storage transformations for fast image delivery
 */

interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
}

/**
 * Get optimized image URL using Supabase Storage transformations
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  options: ImageOptions = {}
): string {
  if (!originalUrl) return originalUrl;

  // Skip non-Supabase URLs, data URLs, and local assets
  if (
    !originalUrl.includes('supabase.co/storage') ||
    originalUrl.startsWith('data:') ||
    originalUrl.startsWith('/') ||
    originalUrl.startsWith('blob:')
  ) {
    return originalUrl;
  }

  // Build transformation params
  const params = new URLSearchParams();
  
  if (options.width) {
    params.set('width', options.width.toString());
  }
  if (options.height) {
    params.set('height', options.height.toString());
  }
  if (options.quality) {
    params.set('quality', options.quality.toString());
  }
  if (options.resize) {
    params.set('resize', options.resize);
  }

  const queryString = params.toString();
  if (!queryString) return originalUrl;

  // Append params to URL
  const separator = originalUrl.includes('?') ? '&' : '?';
  return `${originalUrl}${separator}${queryString}`;
}

/**
 * Generate responsive srcset for different screen sizes
 */
export function getResponsiveSrcSet(
  originalUrl: string,
  widths: number[] = [320, 640, 960, 1280],
  quality: number = 80
): string {
  if (!originalUrl || !originalUrl.includes('supabase.co/storage')) {
    return '';
  }

  return widths
    .map(width => {
      const url = getOptimizedImageUrl(originalUrl, { width, quality });
      return `${url} ${width}w`;
    })
    .join(', ');
}

/**
 * Get blur placeholder data URL (simple colored placeholder)
 */
export function getPlaceholderColor(): string {
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3Crect fill="%23f1f5f9" width="1" height="1"/%3E%3C/svg%3E';
}

/**
 * Preload an image for faster subsequent display
 */
export function preloadImage(src: string, width?: number): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    const optimizedSrc = width 
      ? getOptimizedImageUrl(src, { width, quality: 80 })
      : src;
    
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = optimizedSrc;
  });
}

/**
 * Preload multiple images in parallel
 */
export function preloadImages(sources: string[], width?: number): Promise<void[]> {
  return Promise.all(sources.map(src => preloadImage(src, width)));
}
