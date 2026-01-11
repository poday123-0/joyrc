import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import CategoryPills from "@/components/CategoryPills";
import ProductCard from "@/components/ProductCard";
import BottomNavigation from "@/components/BottomNavigation";
import { staticProducts } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  rating: number | null;
  in_stock: boolean | null;
  category?: string;
  image?: string;
}

const Index = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories (name)
        `);

      if (data && !error && data.length > 0) {
        setProducts(data.map(p => ({
          ...p,
          category: p.categories?.name || "RC Toy"
        })));
      } else {
        // Use static products as fallback
        setProducts(staticProducts.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          image_url: null,
          category_id: null,
          rating: p.rating,
          in_stock: true,
          category: p.category,
          image: p.image
        })));
      }
      setLoading(false);
    };

    fetchProducts();
  }, []);

  // Filter products based on active category
  const filteredProducts = activeCategory === "all" 
    ? products 
    : products.filter(p => {
        // Match by category_id if it exists, otherwise match by name
        if (activeCategory.length > 10) {
          // UUID-like ID from database
          return p.category_id === activeCategory;
        }
        return false;
      });

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container max-w-7xl mx-auto px-4 lg:px-8">
          <Header />
        </div>
      </div>

      {/* Hero Section - Full width */}
      <HeroBanner />

      {/* Products Section */}
      <section className="py-16 lg:py-24">
        <div className="container max-w-7xl mx-auto px-4 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12 lg:mb-16 space-y-4">
            <p className="text-sm lg:text-base font-medium text-primary tracking-wide uppercase">
              Explore
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
              Popular RC Toys
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Hand-picked favorites that bring excitement to every adventure.
            </p>
          </div>

          {/* Category Pills */}
          <div className="flex justify-center mb-10 lg:mb-12">
            <CategoryPills 
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-8">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="aspect-square rounded-3xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-8">
              {filteredProducts.map((product, index) => (
                <div 
                  key={product.id} 
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}

          {/* View All Link */}
          <div className="text-center mt-12 lg:mt-16">
            <Link 
              to="/categories" 
              className="group inline-flex items-center gap-2 text-foreground font-medium text-lg hover:text-primary transition-colors"
            >
              View all products
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
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
            <span className="text-gradient-primary">RC adventure?</span>
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
