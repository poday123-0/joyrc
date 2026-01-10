import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, Search, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { staticProducts, staticCategories } from "@/data/products";
import ProductCard from "@/components/ProductCard";
import BottomNavigation from "@/components/BottomNavigation";

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

interface Category {
  id: string;
  name: string;
  icon: string;
}

const Categories = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("newest");

  const activeCategory = searchParams.get("category") || "all";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch categories
      const { data: catData } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");

      if (catData && catData.length > 0) {
        setCategories([{ id: "all", name: "All", icon: "🎮" }, ...catData]);
      } else {
        setCategories(staticCategories);
      }

      // Fetch products
      const { data: prodData } = await supabase
        .from("products")
        .select(`*, categories (name)`);

      if (prodData && prodData.length > 0) {
        setProducts(
          prodData.map((p) => ({
            ...p,
            category: p.categories?.name || "RC Toy",
          }))
        );
      } else {
        setProducts(
          staticProducts.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            image_url: null,
            category_id: null,
            rating: p.rating,
            in_stock: true,
            category: p.category,
            image: p.image,
          }))
        );
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // Filter and sort products
  const filteredProducts = products
    .filter((p) => {
      // Category filter
      if (activeCategory !== "all") {
        const category = categories.find((c) => c.id === activeCategory);
        if (category && p.category?.toLowerCase() !== category.name.toLowerCase()) {
          return false;
        }
      }

      // Search filter
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Price filter
      if (priceRange.min && p.price < parseFloat(priceRange.min)) {
        return false;
      }
      if (priceRange.max && p.price > parseFloat(priceRange.max)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });

  const handleCategoryChange = (categoryId: string) => {
    setSearchParams({ category: categoryId });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setPriceRange({ min: "", max: "" });
    setSortBy("newest");
    setShowFilters(false);
  };

  return (
    <div className="min-h-screen gradient-hero pb-24">
      <div className="container max-w-md mx-auto px-4 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/"
            className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="font-bold text-xl text-foreground">All Products</h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-10 h-10 rounded-full glass-card flex items-center justify-center transition-colors ${
              showFilters ? "bg-primary text-primary-foreground" : "hover:bg-white/80"
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-full glass-card border-0 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="glass-card rounded-2xl p-4 mb-4 shadow-soft animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Filters</h3>
              <button onClick={clearFilters} className="text-xs text-coral">
                Clear all
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Price Range</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-white text-sm"
                >
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all ${
                activeCategory === category.id
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "glass-card text-foreground hover:bg-white/80"
              }`}
            >
              <span className="text-sm">{category.icon}</span>
              <span className="text-sm font-medium">{category.name}</span>
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} found
        </p>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 rounded-3xl bg-white/50 animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="text-4xl mb-4">🔍</span>
            <h3 className="font-semibold text-foreground">No products found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 rounded-full gradient-cta text-white text-sm font-medium"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Categories;
