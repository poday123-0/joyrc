import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Star, ShoppingBag } from "lucide-react";
import { staticProducts } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { toast } from "@/hooks/use-toast";
import ImageGallery from "@/components/ImageGallery";
import rcCarRed from "@/assets/rc-car-red.png";
import rcSpeedboat from "@/assets/rc-speedboat.png";
import rcDrone from "@/assets/rc-drone.png";
import rcMonsterTruck from "@/assets/rc-monster-truck.png";
import rcHelicopter from "@/assets/rc-helicopter.png";

const imageMap: Record<string, string> = {
  "rc-car-red": rcCarRed,
  "rc-speedboat": rcSpeedboat,
  "rc-drone": rcDrone,
  "rc-monster-truck": rcMonsterTruck,
  "rc-helicopter": rcHelicopter,
};

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  rating: number | null;
  category?: string;
  image?: string;
  specifications?: { name: string; value: string }[];
}

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [specs, setSpecs] = useState<{ name: string; value: string }[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  useEffect(() => {
    const fetchProduct = async () => {
      // Try fetching from database first
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

        if (specsData) {
          setSpecs(specsData.map(s => ({ name: s.spec_name, value: s.spec_value })));
        }

        // Fetch gallery images
        const { data: imagesData } = await supabase
          .from("product_images")
          .select("*")
          .eq("product_id", id)
          .order("sort_order");

        const images: string[] = [];
        // Add main image first
        if (dbProduct.image_url) {
          images.push(dbProduct.image_url);
        }
        // Add gallery images
        if (imagesData) {
          imagesData.forEach(img => {
            if (!images.includes(img.image_url)) {
              images.push(img.image_url);
            }
          });
        }
        setGalleryImages(images);
      } else {
        // Fallback to static data
        const staticProduct = staticProducts.find((p) => p.id === id);
        if (staticProduct) {
          setProduct({
            id: staticProduct.id,
            name: staticProduct.name,
            description: staticProduct.description,
            price: staticProduct.price,
            image_url: null,
            rating: staticProduct.rating,
            category: staticProduct.category,
            image: staticProduct.image
          });
          setSpecs(staticProduct.specifications || []);
          // For static products, use the mapped image
          const staticImage = imageMap[staticProduct.image] || rcCarRed;
          setGalleryImages([staticImage]);
        }
      }

      // Get similar products
      setSimilarProducts(
        staticProducts.filter((p) => p.id !== id).slice(0, 3).map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          image_url: null,
          rating: p.rating,
          category: p.category,
          image: p.image
        }))
      );

      setLoading(false);
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  const handleAddToCart = () => {
    if (product) {
      const imageSrc = galleryImages[0] || imageMap[product.image || ""] || rcCarRed;
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: imageSrc,
      });
      toast({
        title: "Added to cart!",
        description: `${product.name} has been added to your cart.`,
      });
    }
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
      <div className="min-h-screen flex items-center justify-center">
        <p>Product not found</p>
      </div>
    );
  }

  const mainImage = galleryImages[0] || imageMap[product.image || ""] || rcCarRed;

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
      <div className="container max-w-md mx-auto px-4 mt-6">
        {/* Image gallery or single image with blob */}
        {galleryImages.length > 1 ? (
          <div className="glass-card rounded-3xl p-4 shadow-soft">
            <ImageGallery images={galleryImages} productName={product.name} />
          </div>
        ) : (
          /* Specs and Image section with blob effect for single image */
          <div className="relative flex items-center justify-center h-72">
            {/* Blob background shape */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 rounded-[60%_40%_30%_70%/60%_30%_70%_40%] bg-gradient-to-br from-cyan-light/60 via-pink-light/40 to-mint-light/60 animate-pulse-soft" />
            </div>

            {/* Left side specs */}
            <div className="absolute left-0 top-8 space-y-3 z-10">
              {specs.slice(0, 4).map((spec, index) => (
                <SpecBubble key={index} label={spec.name} value={spec.value} />
              ))}
            </div>

            {/* Product image with rating */}
            <div className="relative z-20">
              <div className="w-44 h-44 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] overflow-hidden shadow-elevated bg-white/30 backdrop-blur-sm flex items-center justify-center">
                <img
                  src={mainImage}
                  alt={product.name}
                  className="w-36 h-36 object-contain"
                />
              </div>
              {/* Rating badge */}
              <div className="absolute top-0 left-0 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-soft">
                <Star className="w-3 h-3 fill-gold text-gold" />
                <span className="text-xs font-medium">{product.rating || 4.5}</span>
              </div>
              {/* Name overlay */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <p className="text-foreground text-sm font-semibold bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-soft">
                  {product.name}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Specs grid for multi-image products */}
        {galleryImages.length > 1 && specs.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            {specs.slice(0, 4).map((spec, index) => (
              <div key={index} className="glass-card rounded-xl px-3 py-2 shadow-soft">
                <p className="text-[10px] text-muted-foreground">{spec.name}</p>
                <p className="text-sm font-semibold text-foreground">{spec.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Product info */}
        <div className="mt-6 bg-white rounded-t-3xl p-6 shadow-elevated -mx-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">{product.name}</h2>
            <p className="text-xl font-bold text-foreground">${product.price.toFixed(2)}</p>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 mt-2">
            <Star className="w-4 h-4 fill-gold text-gold" />
            <span className="font-medium">{product.rating || 4.5}</span>
            <span className="text-muted-foreground text-sm ml-1">• {product.category}</span>
          </div>

          <div className="mt-4">
            <h3 className="font-semibold text-foreground">Description</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* All specifications */}
          {specs.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-foreground mb-2">Specifications</h3>
              <div className="space-y-2">
                {specs.map((spec, index) => (
                  <div key={index} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{spec.name}</span>
                    <span className="font-medium text-foreground">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Similar products */}
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
                    <img
                      src={p.image_url || imageMap[p.image || ""] || rcCarRed}
                      alt={p.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <p className="text-xs font-medium text-foreground p-2 text-center truncate">
                    {p.name}
                  </p>
                </Link>
              ))}
            </div>
          </div>
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

const SpecBubble = ({ label, value }: { label: string; value: string }) => (
  <div className="glass-card rounded-2xl px-3 py-2 animate-slide-up shadow-soft">
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold text-foreground">{value}</p>
  </div>
);

export default ProductDetail;
