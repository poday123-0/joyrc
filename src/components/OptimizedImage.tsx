import { useState, useRef, useEffect, memo, useCallback, forwardRef } from "react";
import { 
  getOptimizedImageUrl, 
  getResponsiveSrcSet, 
  getPlaceholderColor 
} from "@/lib/imageOptimization";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  width?: number;
  quality?: number;
  onLoad?: () => void;
}

// Global image cache to prevent re-fetching
const imageCache = new Set<string>();

// Preload image function
export const preloadImage = (src: string, width?: number): Promise<void> => {
  if (imageCache.has(src)) return Promise.resolve();
  
  const optimizedSrc = getOptimizedImageUrl(src, { width, quality: 80 });
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      imageCache.add(src);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = optimizedSrc;
  });
};

const OptimizedImage = memo(forwardRef<HTMLDivElement, OptimizedImageProps>(({ 
  src, 
  alt, 
  className = "", 
  priority = false,
  fill = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  width,
  quality = 80,
  onLoad
}, ref) => {
  const [loaded, setLoaded] = useState(() => imageCache.has(src));
  const [inView, setInView] = useState(priority || imageCache.has(src));
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if image is already cached
  useEffect(() => {
    if (imageCache.has(src)) {
      setLoaded(true);
      setInView(true);
    }
  }, [src]);

  // Intersection Observer for lazy loading - with large margin for earlier loading
  useEffect(() => {
    if (priority || imageCache.has(src)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '800px', // Start loading 800px before visible
        threshold: 0.01 
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, src]);

  // Preload priority images immediately
  useEffect(() => {
    if (priority && src) {
      preloadImage(src, width);
    }
  }, [priority, src, width]);

  const handleLoad = useCallback(() => {
    imageCache.add(src);
    setLoaded(true);
    onLoad?.();
  }, [src, onLoad]);

  // Get optimized image URL
  const optimizedSrc = useCallback(() => {
    return getOptimizedImageUrl(src, { 
      width, 
      quality
    });
  }, [src, width, quality]);

  // Generate optimized srcset
  const srcSet = useCallback(() => {
    return getResponsiveSrcSet(src, [320, 640, 960, 1280], quality);
  }, [src, quality]);

  return (
    <div 
      ref={ref || containerRef} 
      className={`relative overflow-hidden ${fill ? 'w-full h-full' : ''}`}
    >
      {/* Skeleton placeholder - only show if not cached */}
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-inherit">
          <img 
            src={getPlaceholderColor()} 
            alt="" 
            className="w-full h-full object-cover"
            aria-hidden="true"
          />
        </div>
      )}
      
      {/* Actual image - render when in view */}
      {inView && (
        <img
          src={optimizedSrc()}
          srcSet={srcSet() || undefined}
          sizes={sizes}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          fetchPriority={priority ? "high" : "auto"}
          onLoad={handleLoad}
          className={`${className} transition-opacity duration-200 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}));

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
