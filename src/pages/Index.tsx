import { useState, useEffect, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import VideoShowcase from "@/components/VideoShowcase";
import { supabase } from "@/integrations/supabase/client";
import { formatMVR } from "@/lib/currency";

interface FeaturedProduct {
  id: string;
  product_id: string;
  category_id: string | null;
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

import OptimizedImage, { preloadImage } from "@/components/OptimizedImage";

// Preload featured product images on hover
const preloadFeaturedImages = (products: FeaturedProduct[]) => {
  products.forEach(fp => {
    if (fp.product.image_url) {
      preloadImage(fp.product.image_url);
    }
  });
};

const Index = () => {
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      const { data, error } = await supabase
        .from("featured_products")
        .select(`
          id,
          product_id,
          category_id,
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

      {/* Video Showcase - Full Width */}
      <section className="w-full">
        <VideoShowcase />
      </section>

      {/* Hero Text Section */}
      <section className="py-10 lg:py-16">
        <div className="container max-w-7xl mx-auto px-4 lg:px-8 text-center">
          <div className="space-y-4 mb-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
              Ultimate RC Experience
            </h1>
            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover premium remote control toys that bring excitement to every adventure.
            </p>
          </div>

          <Link to="/categories">
            <button className="group bg-primary text-primary-foreground font-medium px-8 py-3 rounded-full text-base hover:bg-primary/90 transition-all inline-flex items-center gap-2">
              Shop All Products
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-6 lg:py-12">
        <div className="container max-w-7xl mx-auto px-4 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-[4/5] bg-muted animate-pulse" />
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {featuredProducts.map((featured, index) => (
                <div
                  key={featured.id}
                  onClick={() => {
                    // Navigate to categories page with category filter
                    if (featured.category_id) {
                      navigate(`/categories?category=${featured.category_id}`);
                    } else {
                      navigate('/categories');
                    }
                  }}
                  className="group block relative overflow-hidden rounded-2xl animate-fade-in cursor-pointer"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Title label at top */}
                  <div className="absolute top-4 left-0 right-0 z-10 text-center">
                    <span className="text-xs sm:text-sm font-medium tracking-widest text-foreground/80 uppercase">
                      {featured.title || featured.product.name}
                    </span>
                  </div>

                  {/* Full-bleed image */}
                  <div className="aspect-[4/5] w-full overflow-hidden bg-muted">
                    {featured.product.image_url ? (
                      <OptimizedImage
                        src={featured.product.image_url}
                        alt={featured.product.name}
                        priority={index === 0}
                        fill
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center text-6xl">📦</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-muted/30 rounded-xl">
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