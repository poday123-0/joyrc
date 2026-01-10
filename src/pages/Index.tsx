import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
    <div className="min-h-screen gradient-hero pb-24 lg:pb-8">
      <div className="container max-w-7xl mx-auto px-4 lg:px-8">
        <Header />
        <HeroBanner />
        <CategoryPills 
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {/* Products Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground text-lg lg:text-xl">Popular RC Toys</h3>
            <Link to="/categories" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              See All
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 lg:h-80 rounded-3xl bg-white/50 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Index;
