import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Star, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  rating: number | null;
  category?: string;
}

interface SimilarProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [specs, setSpecs] = useState<{ name: string; value: string }[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      // Fetch product from database
      const { data: dbProduct, error } = await supabase
        .from("products")
        .select(`
          *,
          categories (name)
        `)
        .eq("id", id)
        .single();

      if (dbProduct && !error) {
        setProduct({
          ...dbProduct,
          category: dbProduct.categories?.name || "RC Toy"
        });

        // Fetch specifications
        const { data: specsData } = await supabase
          .from("product_specifications")
          .select("*")
          .eq("product_id", id)
          .order("sort_order");

        if (specsData && specsData.length > 0) {
          setSpecs(specsData.map(s => ({ name: s.spec_name, value: s.spec_value })));
        }

        // Fetch gallery images
        const { data: imagesData } = await supabase
          .from("product_images")
          .select("*")
          .eq("product_id", id)
          .order("sort_order");

        const images: string[] = [];
        if (dbProduct.image_url) {
          images.push(dbProduct.image_url);
        }
        if (imagesData) {
          imagesData.forEach(img => {
            if (!images.includes(img.image_url)) {
              images.push(img.image_url);
            }
          });
        }
        setGalleryImages(images);

        // Fetch similar products from same category
        if (dbProduct.category_id) {
          const { data: similar } = await supabase
            .from("products")
            .select("id, name, price, image_url")
            .eq("category_id", dbProduct.category_id)
            .neq("id", id)
            .limit(3);
          
          if (similar) {
            setSimilarProducts(similar);
          }
        }
      }

      setLoading(false);
    };

    fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (product) {
      const imageSrc = galleryImages[0] || product.image_url || "";
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: imageSrc,
      });
      toast({
        title: "Added to Cart!",
        description: `${product.name} has been added to your cart.`,
      });
    }
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-detail-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen gradient-detail-bg flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <ShoppingBag className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Product Not Found</h2>
        <p className="text-muted-foreground text-center mb-6">
          This product doesn't exist or has been removed.
        </p>
        <Link
          to="/"
          className="px-6 py-3 rounded-full gradient-cta text-white font-medium"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  const currentImage = galleryImages[currentImageIndex] || product.image_url;
  const leftSpecs = specs.slice(0, 2);
  const rightSpecs = specs.slice(2, 4);

  return (
    <div className="min-h-screen gradient-detail-bg pb-28">
      {/* Header */}
      <div className="container max-w-md mx-auto px-4 pt-4">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="font-semibold text-foreground">Product Details</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Main content */}
      <div className="container max-w-md mx-auto px-4 mt-4">
        {/* Round blob style image section with specs */}
        <div className="relative flex items-center justify-center h-80">
          {/* Blob background shape */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-56 rounded-[60%_40%_30%_70%/60%_30%_70%_40%] bg-gradient-to-br from-cyan-light/70 via-pink-light/50 to-mint-light/70 animate-pulse-soft" />
          </div>

          {/* Left side specs */}
          {leftSpecs.length > 0 && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 space-y-4 z-10">
              {leftSpecs.map((spec, index) => (
                <SpecBubble 
                  key={index} 
                  label={spec.name} 
                  value={spec.value} 
                  delay={index * 100}
                />
              ))}
            </div>
          )}

          {/* Right side specs */}
          {rightSpecs.length > 0 && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 space-y-4 z-10">
              {rightSpecs.map((spec, index) => (
                <SpecBubble 
                  key={index} 
                  label={spec.name} 
                  value={spec.value} 
                  align="right"
                  delay={(index + 2) * 100}
                />
              ))}
            </div>
          )}

          {/* Product image with rating - round organic shape */}
          <div className="relative z-20">
            <div className="w-40 h-40 rounded-[50%_50%_45%_55%/55%_45%_55%_45%] overflow-hidden shadow-elevated bg-white/40 backdrop-blur-md flex items-center justify-center border-4 border-white/50">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={product.name}
                  className="w-32 h-32 object-contain"
                />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center text-4xl">📦</div>
              )}
            </div>
            {/* Rating badge */}
            {product.rating && (
              <div className="absolute -top-1 -left-1 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-soft">
                <Star className="w-3.5 h-3.5 fill-gold text-gold" />
                <span className="text-xs font-bold">{product.rating}</span>
              </div>
            )}
          </div>
        </div>

        {/* Product name below image */}
        <div className="text-center -mt-2">
          <p className="inline-block text-foreground font-semibold bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-soft">
            {product.name}
          </p>
        </div>

        {/* Navigation dots and arrows */}
        {galleryImages.length > 1 && (
          <div className="flex items-center justify-center gap-4 mt-4">
            <button 
              onClick={handlePrevImage}
              className="w-8 h-8 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            
            <div className="flex gap-1.5">
              {galleryImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentImageIndex
                      ? "w-5 bg-primary"
                      : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>
            
            <button 
              onClick={handleNextImage}
              className="w-8 h-8 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          </div>
        )}

        {/* Single image indicator dots */}
        {galleryImages.length <= 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            <div className="w-5 h-1.5 rounded-full bg-primary"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"></div>
          </div>
        )}

        {/* Product info card */}
        <div className="mt-6 bg-white rounded-t-3xl p-6 shadow-elevated -mx-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">{product.name}</h2>
            <p className="text-xl font-bold text-primary">{formatMVR(product.price)}</p>
          </div>

          {/* Rating and category */}
          <div className="flex items-center gap-1 mt-2">
            {product.rating && (
              <>
                <Star className="w-4 h-4 fill-gold text-gold" />
                <span className="font-medium">{product.rating}</span>
              </>
            )}
            {product.category && (
              <span className="text-muted-foreground text-sm ml-1">• {product.category}</span>
            )}
          </div>

          {product.description && (
            <div className="mt-4">
              <h3 className="font-semibold text-foreground">Description</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          {/* All specifications in a nice grid */}
          {specs.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-foreground mb-3">Specifications</h3>
              <div className="grid grid-cols-2 gap-2">
                {specs.map((spec, index) => (
                  <div 
                    key={index} 
                    className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl px-3 py-2"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{spec.name}</p>
                    <p className="text-sm font-bold text-foreground">{spec.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Similar products */}
          {similarProducts.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-foreground mb-3">Similar products</h3>
              <div className="grid grid-cols-3 gap-3">
                {similarProducts.map((p) => (
                  <Link
                    key={p.id}
                    to={`/product/${p.id}`}
                    className="rounded-2xl overflow-hidden shadow-soft group bg-gradient-to-b from-cyan-light/30 to-white"
                  >
                    <div className="aspect-square relative p-2">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                      )}
                    </div>
                    <p className="text-xs font-medium text-foreground p-2 text-center truncate">
                      {p.name}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl">
        <div className="container max-w-md mx-auto flex items-center gap-4">
          <Link 
            to="/cart"
            className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-soft"
          >
            <ShoppingBag className="w-6 h-6 text-primary-foreground" />
          </Link>
          <button 
            onClick={handleAddToCart}
            className="flex-1 h-14 rounded-full gradient-cta flex items-center justify-center gap-2 shadow-elevated hover:opacity-90 transition-opacity"
          >
            <span className="text-white font-semibold">Add to cart</span>
            <div className="flex">
              <ChevronRight className="w-4 h-4 text-white/70" />
              <ChevronRight className="w-4 h-4 text-white/90 -ml-2" />
              <ChevronRight className="w-4 h-4 text-white -ml-2" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

// Spec bubble component with round glass-morphism style
const SpecBubble = ({ 
  label, 
  value, 
  align = "left",
  delay = 0
}: { 
  label: string; 
  value: string; 
  align?: "left" | "right";
  delay?: number;
}) => (
  <div 
    className={`glass-card rounded-2xl px-3 py-2.5 shadow-soft animate-slide-up ${
      align === "right" ? "text-right" : "text-left"
    }`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
    <p className="text-sm font-bold text-foreground">{value}</p>
  </div>
);

export default ProductDetail;
