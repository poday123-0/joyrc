import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatMVR } from "@/lib/currency";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: { name: string } | null;
}

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchOverlay = ({ isOpen, onClose }: SearchOverlayProps) => {
  const [query, setQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setFilteredProducts([]);
    }
  }, [isOpen]);

  // Live DB search as user types
  useEffect(() => {
    const q = query.trim();
    if (q === "") {
      setFilteredProducts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("products")
        .select(`id, name, price, image_url, category:categories(name)`)
        .eq("in_stock", true)
        .ilike("name", `%${q}%`)
        .limit(50);

      if (cancelled) return;
      setFilteredProducts((data as unknown as Product[]) || []);
      setLoading(false);
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const handleProductClick = () => {
    onClose();
    setQuery("");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Search Panel */}
      <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
        <div className="bg-background border-b border-border shadow-lg">
          <div className="max-w-[980px] mx-auto px-4 sm:px-6">
            {/* Search Input */}
            <div className="flex items-center gap-3 h-14">
              <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for products..."
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-base outline-none"
              />
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Results */}
            {query.trim() !== "" && (
              <div className="py-4 border-t border-border/50">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredProducts.length > 0 ? (
                  <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                    <p className="text-xs text-muted-foreground mb-3">
                      {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''}
                    </p>
                    {filteredProducts.slice(0, 8).map((product) => (
                      <Link
                        key={product.id}
                        to={`/product/${product.id}`}
                        onClick={handleProductClick}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                      >
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl">📦</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {product.name}
                          </h4>
                          {product.category && (
                            <p className="text-xs text-muted-foreground">
                              {product.category.name}
                            </p>
                          )}
                        </div>
                        <p className="font-semibold text-foreground flex-shrink-0">
                          {formatMVR(product.price)}
                        </p>
                      </Link>
                    ))}
                    {filteredProducts.length > 8 && (
                      <Link
                        to={`/categories?search=${encodeURIComponent(query)}`}
                        onClick={handleProductClick}
                        className="block text-center py-3 text-sm text-primary hover:underline"
                      >
                        View all {filteredProducts.length} results
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No products found for "{query}"</p>
                    <Link 
                      to="/categories" 
                      onClick={handleProductClick}
                      className="text-sm text-primary hover:underline mt-2 inline-block"
                    >
                      Browse all products
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Quick Links when no query */}
            {query.trim() === "" && (
              <div className="py-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-3">Quick Links</p>
                <div className="flex flex-wrap gap-2">
                  {["RC Cars", "Drones", "Boats", "Helicopters"].map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-full transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchOverlay;
