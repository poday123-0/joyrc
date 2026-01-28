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
  image_url?: string | null;
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
    <div className="min-h-screen gradient-hero pb-24 lg:pb-8">
      <div className="container max-w-7xl mx-auto px-4 lg:px-8 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/"
            className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="font-bold text-xl lg:text-2xl text-foreground">All Products</h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-10 h-10 rounded-full glass-card flex items-center justify-center transition-colors ${
              showFilters ? "bg-primary text-primary-foreground" : "hover:bg-white/80"
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        <div className="lg:flex lg:gap-8">
          {/* Sidebar for desktop */}
          <div className="hidden lg:block lg:w-72 lg:flex-shrink-0">
            <div className="glass-card rounded-2xl p-6 shadow-soft sticky top-4">
              <h3 className="font-semibold text-foreground mb-4">Categories</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left overflow-hidden ${
                      activeCategory === category.id
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "hover:bg-white/50 text-foreground"
                    }`}
                  >
                    {category.image_url ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <span className="text-lg">{category.icon}</span>
                    )}
                    <span className="font-medium truncate">{category.name}</span>
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="font-semibold text-foreground mb-4">Filters</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Price Range</label>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                        className="w-full min-w-0 px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                        className="w-full min-w-0 px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full mt-2 px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="newest">Newest</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="rating">Top Rated</option>
                    </select>
                  </div>

                  <button
                    onClick={clearFilters}
                    className="w-full py-2 rounded-lg text-coral text-sm font-medium hover:bg-coral/10 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1">
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

            {/* Mobile Filters Panel */}
            {showFilters && (
              <div className="lg:hidden glass-card rounded-2xl p-4 mb-4 shadow-soft">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">Filters</h3>
                  <button onClick={clearFilters} className="text-xs text-primary hover:text-primary/80 transition-colors">
                    Clear all
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground">Price Range</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <input
                        type="number"
                        placeholder="Min"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                        className="w-full min-w-0 px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                        className="w-full min-w-0 px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
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

            {/* Mobile Category Pills with Images */}
            <div className="lg:hidden flex gap-3 overflow-x-auto pb-2 mb-4 scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`relative flex-shrink-0 rounded-2xl overflow-hidden transition-all ${
                    activeCategory === category.id
                      ? "ring-2 ring-primary ring-offset-2"
                      : ""
                  }`}
                >
                  {category.image_url ? (
                    <div className="w-24 h-28 relative">
                      <img 
                        src={category.image_url} 
                        alt={category.name} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className="absolute bottom-2 left-2 right-2 text-xs font-medium text-white text-center truncate">
                        {category.name}
                      </span>
                    </div>
                  ) : (
                    <div className={`w-24 h-28 flex flex-col items-center justify-center gap-1 ${
                      activeCategory === category.id
                        ? "bg-primary text-primary-foreground"
                        : "glass-card text-foreground"
                    }`}>
                      <span className="text-2xl">{category.icon}</span>
                      <span className="text-xs font-medium px-1 text-center truncate w-full">{category.name}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Results count */}
            <p className="text-sm text-muted-foreground mb-4">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} found
            </p>

            {/* Products Grid */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-64 lg:h-80 rounded-3xl bg-white/50 animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-6">
                {filteredProducts.map((product, index) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    priority={index < 4}
                  />
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
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Categories;
