import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ShoppingBag, Zap, Battery, Gauge, Radio, Box } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  rating: number | null;
  category?: string;
}

interface ProductColor {
  id: string;
  color_name: string;
  color_hex: string;
  image_url: string | null;
}

interface Specification {
  name: string;
  value: string;
}

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [specs, setSpecs] = useState<Specification[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [productColors, setProductColors] = useState<ProductColor[]>([]);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      const { data: dbProduct, error } = await supabase
        .from("products")
        .select(`*, categories (name)`)
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
          setSpecs(specsData.map(s => ({
            name: s.spec_name,
            value: s.spec_value
          })));
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

        // Fetch product colors
        const { data: colorsData } = await supabase
          .from("product_colors")
          .select("*")
          .eq("product_id", id)
          .order("sort_order");

        if (colorsData && colorsData.length > 0) {
          setProductColors(colorsData);
          setSelectedColorId(colorsData[0].id);
        }

        // Fetch similar products
        if (dbProduct.category_id) {
          const { data: similar } = await supabase
            .from("products")
            .select("id, name, price, image_url, rating")
            .eq("category_id", dbProduct.category_id)
            .neq("id", id)
            .limit(4);

          if (similar) {
            setSimilarProducts(similar as Product[]);
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
        image: imageSrc
      });
      toast({
        title: "Added to Cart",
        description: `${product.name} has been added to your cart.`
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <ShoppingBag className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Product Not Found</h2>
        <p className="text-muted-foreground text-center mb-6">
          This product doesn't exist or has been removed.
        </p>
        <Link to="/home" className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium">
          Browse Products
        </Link>
      </div>
    );
  }

  const selectedColor = productColors.find(c => c.id === selectedColorId);
  const currentImage = selectedColor?.image_url || galleryImages[currentImageIndex] || product.image_url;

  // Feature icons for specifications display
  const getSpecIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('speed') || lowerName.includes('fast')) return Zap;
    if (lowerName.includes('battery') || lowerName.includes('power')) return Battery;
    if (lowerName.includes('range') || lowerName.includes('distance')) return Gauge;
    if (lowerName.includes('control') || lowerName.includes('frequency')) return Radio;
    return Box;
  };

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <Header />

      {/* Main Content - Responsive Layout */}
      <div className="container max-w-6xl mx-auto px-4 lg:px-8">
        
        {/* Desktop: Two-column layout, Mobile: Single column */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:py-12">
          
          {/* Left Column - Product Image + Price & Cart */}
          <div className="py-6 lg:py-0">
            <div className="lg:sticky lg:top-20 space-y-6">
              <div className="aspect-[4/5] w-full max-w-lg mx-auto lg:max-w-none bg-muted/40 rounded-3xl overflow-hidden shadow-lg">
                {currentImage ? (
                  <img
                    src={currentImage}
                    alt={product.name}
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-cover rounded-3xl animate-fade-in transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-8xl">📦</div>
                )}
              </div>
              
              {/* Image Dots */}
              {galleryImages.length > 1 && (
                <div className="flex justify-center gap-2">
                  {galleryImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? 'bg-foreground w-4'
                          : 'bg-muted-foreground/40 hover:bg-muted-foreground/60'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Product Title - Above Price on Mobile/Desktop */}
              <div className="text-center lg:text-left mb-4">
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-1">{product.name}</h1>
                <p className="text-sm text-muted-foreground">{product.category}</p>
              </div>

              {/* Color Options - Above Price */}
              {productColors.length > 0 && (
                <div className="text-center lg:text-left mb-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Available in {productColors.length} colors
                  </p>
                  <div className="flex justify-center lg:justify-start gap-3">
                    {productColors.map(color => (
                      <button
                        key={color.id}
                        onClick={() => setSelectedColorId(color.id)}
                        className={`w-8 h-8 rounded-full transition-all ${
                          selectedColorId === color.id
                            ? 'ring-2 ring-offset-2 ring-foreground'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: color.color_hex }}
                        title={color.color_name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Price and Buy Button - Under Image */}
              <div className="text-center lg:text-left bg-card rounded-2xl p-6 border border-border">
                <p className="text-3xl font-bold text-foreground mb-2">
                  {formatMVR(product.price)}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Free shipping on orders over MVR 500
                </p>
                <button
                  onClick={handleAddToCart}
                  className="w-full px-12 py-3 rounded-full bg-primary text-primary-foreground font-medium text-base hover:bg-primary/90 transition-all"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Product Info */}
          <div className="lg:py-0">
            {/* Specifications as Feature List */}
            <div className="py-6 space-y-0">
              {specs.length > 0 ? (
                specs.map((spec, index) => {
                  const IconComponent = getSpecIcon(spec.name);
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-4 py-4 border-b border-border last:border-b-0"
                    >
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-muted-foreground">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-foreground text-base leading-relaxed">
                          <span className="font-medium">{spec.value}</span>
                          {spec.name && (
                            <span className="text-muted-foreground"> — {spec.name}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="flex items-start gap-4 py-4 border-b border-border">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-muted-foreground">
                      <Zap className="w-5 h-5" />
                    </div>
                    <p className="text-foreground text-base leading-relaxed">
                      <span className="font-medium">{product.name}</span> — High-performance RC toy
                    </p>
                  </div>
                  <div className="flex items-start gap-4 py-4 border-b border-border">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-muted-foreground">
                      <Battery className="w-5 h-5" />
                    </div>
                    <p className="text-foreground text-base leading-relaxed">
                      Extended battery life for hours of fun
                    </p>
                  </div>
                  <div className="flex items-start gap-4 py-4">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-muted-foreground">
                      <Radio className="w-5 h-5" />
                    </div>
                    <p className="text-foreground text-base leading-relaxed">
                      Precise remote control with long-range connectivity
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Product Description */}
            {product.description && (
              <div className="py-6 border-t border-border">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Similar Products - Full Width */}
        {similarProducts.length > 0 && (
          <div className="py-12 border-t border-border">
            <h2 className="text-xl font-semibold text-foreground text-center lg:text-left mb-8">
              You might also like
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {similarProducts.map(p => (
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  className="group block"
                >
                  <div className="aspect-[4/5] bg-muted/30 rounded-2xl overflow-hidden mb-3">
                    <div className="w-full h-full flex items-center justify-center">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover rounded-xl transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="text-4xl">📦</div>
                      )}
                    </div>
                  </div>
                  <h4 className="font-medium text-foreground text-sm truncate">
                    {p.name}
                  </h4>
                  <p className="font-semibold text-foreground text-sm mt-1">
                    {formatMVR(p.price)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default ProductDetail;