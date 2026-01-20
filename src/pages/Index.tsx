import { useState, useEffect, useRef, memo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import VideoShowcase from "@/components/VideoShowcase";
import { supabase } from "@/integrations/supabase/client";
import { formatMVR } from "@/lib/currency";

interface FeaturedProduct {
  id: string;
  product_id: string;
  title: string | null;
  subtitle: string | null;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    rating: number | null;
    description: string | null;
  };
}

const ImageWithSkeleton = memo(({ src, alt, className, priority = false }: { 
  src: string; 
  alt: string; 
  className?: string;
  priority?: boolean;
}) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(priority);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px', threshold: 0.01 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);
  
  return (
    <div ref={containerRef} className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
        </div>
      )}
      {inView && (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          className={`${className} transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
});

ImageWithSkeleton.displayName = 'ImageWithSkeleton';

const Index = () => {
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      const { data, error } = await supabase
        .from("featured_products")
        .select(`
          id,
          product_id,
          title,
          subtitle,
          product:products (
            id,
            name,
            price,
            image_url,
            rating,
            description
          )
        `)
        .eq("is_active", true)
        .order("sort_order");

      if (data && !error) {
        setFeaturedProducts(data as unknown as FeaturedProduct[]);
      }
      setLoading(false);
    };

    fetchFeaturedProducts();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-8">
      <Header />

      {/* Hero Section */}
      <section className="py-12 lg:py-20">
        <div className="container max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center space-y-4 mb-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
              Ultimate RC Experience
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover premium remote control toys that bring excitement to every adventure.
            </p>
          </div>

          {/* Video Showcase */}
          <div className="mb-10">
            <VideoShowcase />
          </div>

          <div className="text-center">
            <Link to="/categories">
              <button className="group bg-primary text-primary-foreground font-medium px-8 py-3 rounded-full text-base hover:bg-primary/90 transition-all inline-flex items-center gap-2">
                Shop All Products
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-8 lg:py-16">
        <div className="container max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-sm font-medium text-primary tracking-wide uppercase mb-1">
                Featured
              </p>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
                Top Picks
              </h2>
            </div>
            <Link 
              to="/categories" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-[4/5] rounded-3xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredProducts.map((featured, index) => (
                <Link
                  key={featured.id}
                  to={`/product/${featured.product.id}`}
                  className="group block animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="relative bg-gradient-to-br from-muted/50 to-muted rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
                    {/* Product Image */}
                    <div className="aspect-square p-4 sm:p-5 lg:p-6">
                      {featured.product.image_url ? (
                        <div className="w-full h-full rounded-2xl overflow-hidden bg-background/50">
                          <ImageWithSkeleton
                            src={featured.product.image_url}
                            alt={featured.product.name}
                            priority={index === 0}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 rounded-2xl"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full rounded-2xl bg-background/50 flex items-center justify-center text-6xl">📦</div>
                      )}
                    </div>

                    {/* Content Overlay */}
                    <div className="p-6 pt-0">
                      {/* Custom title from admin or product name */}
                      <h3 className="font-semibold text-lg text-foreground mb-1 group-hover:text-primary transition-colors">
                        {featured.title || featured.product.name}
                      </h3>
                      
                      {/* Custom subtitle or description */}
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {featured.subtitle || featured.product.description || "Premium RC toy"}
                      </p>

                      {/* Price and Rating */}
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-foreground">
                          {formatMVR(featured.product.price)}
                        </p>
                        {featured.product.rating && (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="w-4 h-4 fill-foreground text-foreground" />
                            <span className="font-medium">{featured.product.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-muted/30 rounded-3xl">
              <div className="text-6xl mb-4">🎮</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Featured Products Yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Admin can add featured products from the dashboard.
              </p>
              <Link to="/categories">
                <button className="bg-primary text-primary-foreground font-medium px-6 py-3 rounded-full hover:bg-primary/90 transition-all">
                  Browse All Products
                </button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <div className="text-center space-y-4 p-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-3xl">🚗</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground">Premium Quality</h3>
              <p className="text-muted-foreground leading-relaxed">
                Every toy is crafted with precision and built to last through countless adventures.
              </p>
            </div>
            <div className="text-center space-y-4 p-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-3xl">🎮</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground">Easy Control</h3>
              <p className="text-muted-foreground leading-relaxed">
                Intuitive controls designed for beginners and exciting enough for experts.
              </p>
            </div>
            <div className="text-center space-y-4 p-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-3xl">🔋</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground">Long Battery Life</h3>
              <p className="text-muted-foreground leading-relaxed">
                Extended playtime with powerful batteries that keep the fun going.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32">
        <div className="container max-w-4xl mx-auto px-4 lg:px-8 text-center space-y-8">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Ready to start your
            <br />
            <span className="text-primary">RC adventure?</span>
          </h2>
          <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of happy customers who've discovered the thrill of remote control.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/categories">
              <button className="group bg-foreground text-background font-medium px-8 py-4 rounded-full text-base lg:text-lg hover:bg-foreground/90 transition-all duration-300 flex items-center gap-2">
                Browse Collection
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 lg:py-12">
        <div className="container max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 RC Joy. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Support
              </Link>
              <Link to="/categories" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Shop
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <BottomNavigation />
    </div>
  );
};

export default Index;