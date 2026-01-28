import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, SlidersHorizontal, X } from "lucide-react";
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
  const navigate = useNavigate();
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
      // Category filter - now handles category_id directly
      if (activeCategory !== "all") {
        // Check if filter is a UUID (category_id) or category name
        if (p.category_id !== activeCategory) {
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
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <div className="container max-w-7xl mx-auto px-4 lg:px-8 pt-6 lg:pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full glass-card shadow-soft flex items-center justify-center hover:bg-accent/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="font-bold text-xl lg:text-2xl text-foreground">All Products</h1>
              <p className="text-sm text-muted-foreground">{filteredProducts.length} items</p>
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-10 h-10 rounded-full glass-card shadow-soft flex items-center justify-center transition-colors ${
              showFilters ? "bg-primary text-primary-foreground" : "hover:bg-accent/50"
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        <div className="lg:flex lg:gap-8">
          {/* Sidebar for desktop */}
          <div className="hidden lg:block lg:w-72 lg:flex-shrink-0">
            <div className="glass-card rounded-3xl p-6 shadow-soft sticky top-4">
              <h3 className="font-bold text-foreground mb-4">Categories</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left overflow-hidden ${
                      activeCategory === category.id
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "hover:bg-accent/50 text-foreground"
                    }`}
                  >
                    {category.image_url ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">{category.icon}</span>
                      </div>
                    )}
                    <span className="font-medium truncate">{category.name}</span>
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="font-bold text-foreground mb-4">Filters</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Price Range</label>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                        className="w-full min-w-0 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                        className="w-full min-w-0 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full mt-2 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="newest">Newest</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="rating">Top Rated</option>
                    </select>
                  </div>

                  <button
                    onClick={clearFilters}
                    className="w-full py-2.5 rounded-xl text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
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
            <div className="relative mb-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-full glass-card shadow-soft border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
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
              <div className="lg:hidden glass-card rounded-2xl p-4 mb-5 shadow-soft">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-foreground">Filters</h3>
                  <button onClick={clearFilters} className="text-sm text-destructive font-medium hover:text-destructive/80 transition-colors">
                    Clear all
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Price Range</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                        className="w-full min-w-0 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                        className="w-full min-w-0 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full mt-2 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
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

            {/* Mobile Category Pills - Circle Design */}
            <div className="lg:hidden mb-5">
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Browse by Category</h3>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className="flex flex-col items-center gap-1 flex-shrink-0"
                  >
                    <div
                      className={`w-11 h-11 rounded-full overflow-hidden transition-all ${
                        activeCategory === category.id
                          ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                          : "shadow-soft"
                      }`}
                    >
                      {category.image_url ? (
                        <img 
                          src={category.image_url} 
                          alt={category.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${
                          activeCategory === category.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}>
                          <span className="text-sm">{category.icon}</span>
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] font-medium text-center w-11 truncate ${
                      activeCategory === category.id ? "text-primary" : "text-muted-foreground"
                    }`}>
                      {category.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-[4/5] rounded-2xl bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                {filteredProducts.map((product, index) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    priority={index < 4}
                  />
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-3xl p-8 lg:p-12 shadow-soft text-center">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-foreground text-lg mb-2">No products found</h3>
                <p className="text-muted-foreground mb-6">Try adjusting your filters or search term</p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium shadow-soft hover:bg-primary/90 transition-colors"
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
