import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Star, ShoppingBag, Heart, Check, Minus, Plus } from "lucide-react";
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
interface SimilarProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}
interface ProductColor {
  id: string;
  color_name: string;
  color_hex: string;
  image_url: string | null;
}
const ProductDetail = () => {
  const {
    id
  } = useParams();
  const {
    addToCart
  } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [specs, setSpecs] = useState<{
    name: string;
    value: string;
  }[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [productColors, setProductColors] = useState<ProductColor[]>([]);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      const {
        data: dbProduct,
        error
      } = await supabase.from("products").select(`
          *,
          categories (name)
        `).eq("id", id).single();
      if (dbProduct && !error) {
        setProduct({
          ...dbProduct,
          category: dbProduct.categories?.name || "RC Toy"
        });
        const {
          data: specsData
        } = await supabase.from("product_specifications").select("*").eq("product_id", id).order("sort_order");
        if (specsData && specsData.length > 0) {
          setSpecs(specsData.map(s => ({
            name: s.spec_name,
            value: s.spec_value
          })));
        }
        const {
          data: imagesData
        } = await supabase.from("product_images").select("*").eq("product_id", id).order("sort_order");
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
        const {
          data: colorsData
        } = await supabase.from("product_colors").select("*").eq("product_id", id).order("sort_order");
        if (colorsData && colorsData.length > 0) {
          setProductColors(colorsData);
          setSelectedColorId(colorsData[0].id);
        }
        if (dbProduct.category_id) {
          const {
            data: similar
          } = await supabase.from("products").select("id, name, price, image_url").eq("category_id", dbProduct.category_id).neq("id", id).limit(4);
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
      for (let i = 0; i < quantity; i++) {
        addToCart({
          id: product.id,
          name: product.name,
          price: product.price,
          image: imageSrc
        });
      }
      toast({
        title: "Added to Cart",
        description: `${quantity}x ${product.name} has been added to your cart.`
      });
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>;
  }
  if (!product) {
    return <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <ShoppingBag className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Product Not Found</h2>
        <p className="text-muted-foreground text-center mb-6">
          This product doesn't exist or has been removed.
        </p>
        <Link to="/" className="px-6 py-3 rounded-full bg-foreground text-background font-medium">
          Browse Products
        </Link>
      </div>;
  }

  // Get current image - prioritize selected color's image, then gallery, then default
  const selectedColor = productColors.find(c => c.id === selectedColorId);
  const currentImage = selectedColor?.image_url || galleryImages[currentImageIndex] || product.image_url;
  return <div className="min-h-screen bg-background pb-24 lg:pb-8">
      {/* Sticky Header - Desktop */}
      <div className="hidden lg:block sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container max-w-7xl mx-auto px-4 lg:px-8">
          <Header />
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="font-medium text-foreground">Details</h1>
          <button onClick={() => setIsFavorite(!isFavorite)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-pink text-pink' : 'text-foreground'}`} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-12">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 xl:gap-24">
          {/* Image Gallery Section */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            {/* Main Image */}
            <div className="relative aspect-square bg-muted/30 rounded-3xl overflow-hidden mb-4">
              {/* Favorite button - Desktop */}
              <button onClick={() => setIsFavorite(!isFavorite)} className="hidden lg:flex absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm items-center justify-center hover:bg-background transition-colors">
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-pink text-pink' : 'text-foreground'}`} />
              </button>

              {/* Image */}
              <div className="absolute inset-0 flex items-center justify-center p-8 lg:p-16">
                {currentImage ? <img src={currentImage} alt={product.name} className="max-w-full max-h-full object-contain animate-fade-in" /> : <div className="text-6xl">📦</div>}
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {galleryImages.length > 1 && <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {galleryImages.map((image, index) => <button key={index} onClick={() => setCurrentImageIndex(index)} className={`flex-shrink-0 w-16 h-16 lg:w-20 lg:h-20 rounded-xl lg:rounded-2xl overflow-hidden bg-muted/30 transition-all duration-300 ${index === currentImageIndex ? "ring-2 ring-foreground ring-offset-2" : "opacity-60 hover:opacity-100"}`}>
                    <img src={image} alt={`${product.name} thumbnail ${index + 1}`} className="w-full h-full object-contain p-2" />
                  </button>)}
              </div>}
          </div>

          {/* Product Info Section */}
          <div className="mt-8 lg:mt-0 space-y-8">
            {/* Category & Rating */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {product.category}
              </span>
              {product.rating && <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-foreground text-foreground" />
                  <span className="text-sm font-medium">{product.rating}</span>
                </div>}
            </div>

            {/* Product Name */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight">
              {product.name}
            </h1>

            {/* Price */}
            <p className="text-2xl lg:text-3xl font-semibold text-foreground">
              {formatMVR(product.price)}
            </p>

            {/* Description */}
            {product.description && <p className="text-muted-foreground leading-relaxed text-base lg:text-lg">
                {product.description}
              </p>}

            {/* Color Selection */}
            {productColors.length > 0 && <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground">Color</h3>
                  <span className="text-sm text-muted-foreground">
                    {productColors.find(c => c.id === selectedColorId)?.color_name}
                  </span>
                </div>
                <div className="flex gap-3">
                  {productColors.map(color => <button key={color.id} onClick={() => setSelectedColorId(color.id)} className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${selectedColorId === color.id ? "ring-2 ring-offset-2 ring-foreground" : "opacity-60 hover:opacity-100"}`} style={{
                backgroundColor: color.color_hex
              }}>
                      {selectedColorId === color.id && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                    </button>)}
                </div>
              </div>}

            {/* Quantity */}
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Quantity</h3>
              <div className="flex items-center gap-4">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <div className="flex gap-4 pt-4">
              <button onClick={handleAddToCart} className="flex-1 h-14 lg:h-16 rounded-full bg-foreground text-background font-medium text-base lg:text-lg hover:bg-foreground/90 transition-all duration-300 flex items-center justify-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Add to Cart — {formatMVR(product.price * quantity)}
              </button>
            </div>

            {/* Specifications */}
            {specs.length > 0 && <div className="pt-8 border-t border-border">
                <h3 className="font-medium text-foreground mb-4">Specifications</h3>
                <div className="grid grid-cols-2 gap-4">
                  {specs.map((spec, index) => <div key={index} className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{spec.name}</p>
                      <p className="font-medium text-foreground">{spec.value}</p>
                    </div>)}
                </div>
              </div>}

            {/* Features */}
            <div className="pt-8 border-t border-border">
              <h3 className="font-medium text-foreground mb-4">What's Included</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary" />
                  <span>Remote Controller</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary" />
                  <span>Rechargeable Battery</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary" />
                  <span>USB Charging Cable</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary" />
                  <span>User Manual</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && <div className="mt-16 lg:mt-24 pt-8 border-t border-border">
            <div className="text-center mb-8 lg:mb-12">
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground">You might also like</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8">
              {similarProducts.map(p => <Link key={p.id} to={`/product/${p.id}`} className="group block">
                  <div className="aspect-square bg-muted/30 rounded-2xl lg:rounded-3xl overflow-hidden mb-4 transition-all duration-500 group-hover:bg-muted">
                    <div className="w-full h-full flex items-center justify-center p-6">
                      {p.image_url ? <img src={p.image_url} alt={p.name} className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-110" /> : <div className="text-4xl">📦</div>}
                    </div>
                  </div>
                  <h4 className="font-medium text-foreground text-sm lg:text-base group-hover:text-primary transition-colors">
                    {p.name}
                  </h4>
                  <p className="font-semibold text-foreground text-sm lg:text-base mt-1">
                    {formatMVR(p.price)}
                  </p>
                </Link>)}
            </div>
          </div>}
      </div>

      {/* Mobile Bottom Bar */}
      

      <div className="hidden lg:block">
        <BottomNavigation />
      </div>
    </div>;
};
export default ProductDetail;