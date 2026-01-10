import { useState, useEffect } from "react";
import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import CategoryPills from "@/components/CategoryPills";
import ProductCard from "@/components/ProductCard";
import BottomNavigation from "@/components/BottomNavigation";
import { staticProducts, staticCategories } from "@/data/products";
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

  const filteredProducts = activeCategory === "all" 
    ? products 
    : products.filter(p => {
        const category = staticCategories.find(c => c.id === activeCategory);
        return category && p.category?.toLowerCase() === category.name.toLowerCase();
      });

  return (
    <div className="min-h-screen gradient-hero pb-24">
      <div className="container max-w-md mx-auto px-4">
        <Header />
        <HeroBanner />
        <CategoryPills 
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {/* Products Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Popular RC Toys</h3>
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              See All
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 rounded-3xl bg-white/50 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.slice(0, 2).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {filteredProducts.length > 2 && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {filteredProducts.slice(2, 4).map((product) => (
                    <ProductCard key={product.id} product={product} size="small" />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Index;
