import { useState, useRef, useEffect, memo } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  fill?: boolean;
}

const OptimizedImage = memo(({ 
  src, 
  alt, 
  className = "", 
  priority = false,
  fill = false 
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) {
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
        rootMargin: '200px', // Start loading 200px before visible
        threshold: 0.01 
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Preload image when in view
  useEffect(() => {
    if (!inView || !src) return;
    
    const img = new Image();
    img.onload = () => setLoaded(true);
    img.src = src;
    
    // If already cached, it loads instantly
    if (img.complete) {
      setLoaded(true);
    }
  }, [inView, src]);

  return (
    <div 
      ref={containerRef} 
      className={`relative ${fill ? 'w-full h-full' : ''}`}
    >
      {/* Skeleton placeholder */}
      <div 
        className={`absolute inset-0 bg-muted transition-opacity duration-300 ${
          loaded ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          style={{
            animation: loaded ? 'none' : 'shimmer 1.5s ease-in-out infinite',
            transform: 'translateX(-100%)'
          }}
        />
      </div>
      
      {/* Actual image */}
      {inView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          className={`${className} transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;