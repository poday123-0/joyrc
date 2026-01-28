import { useState, useRef, useEffect, memo, useCallback } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  onLoad?: () => void;
}

// Global image cache to prevent re-fetching
const imageCache = new Set<string>();

// Preload image function
const preloadImage = (src: string): Promise<void> => {
  if (imageCache.has(src)) return Promise.resolve();
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      imageCache.add(src);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = src;
  });
};

const OptimizedImage = memo(({ 
  src, 
  alt, 
  className = "", 
  priority = false,
  fill = false,
  sizes = "100vw",
  onLoad
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(() => imageCache.has(src));
  const [inView, setInView] = useState(priority || imageCache.has(src));
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Check if image is already cached
  useEffect(() => {
    if (imageCache.has(src)) {
      setLoaded(true);
      setInView(true);
    }
  }, [src]);

  // Intersection Observer for lazy loading - with larger margin for earlier loading
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
        rootMargin: '600px', // Start loading 600px before visible
        threshold: 0.01 
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, src]);

  // Preload next images when this one loads
  useEffect(() => {
    if (priority) {
      preloadImage(src);
    }
  }, [priority, src]);

  const handleLoad = useCallback(() => {
    imageCache.add(src);
    setLoaded(true);
    onLoad?.();
  }, [src, onLoad]);

  // Generate optimized srcset for Supabase storage images
  const generateSrcSet = useCallback(() => {
    if (!src.includes('supabase.co/storage')) return undefined;
    
    // Supabase storage supports image transformation via URL params
    const widths = [320, 640, 768, 1024, 1280];
    return widths
      .map(w => {
        const transformedUrl = `${src}?width=${w}&quality=80`;
        return `${transformedUrl} ${w}w`;
      })
      .join(', ');
  }, [src]);

  return (
    <div 
      ref={containerRef} 
      className={`relative overflow-hidden ${fill ? 'w-full h-full' : ''}`}
    >
      {/* Skeleton placeholder - only show if not cached */}
      {!loaded && (
        <div 
          className="absolute inset-0 bg-muted rounded-inherit"
        >
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"
            style={{
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      )}
      
      {/* Actual image - render immediately when in view */}
      {inView && (
        <img
          ref={imgRef}
          src={src}
          srcSet={generateSrcSet()}
          sizes={sizes}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          fetchPriority={priority ? "high" : "auto"}
          onLoad={handleLoad}
          className={`${className} transition-opacity duration-150 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;

// Export preload function for use in other components
export { preloadImage };
