import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ShoppingBag, Zap, Battery, Gauge, Radio, Box, ChevronLeft, ChevronRight, Clock, Ruler, Scale, Thermometer, Wifi, Camera, Star, LucideIcon, AlertCircle, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  old_price: number | null;
  image_url: string | null;
  rating: number | null;
  stock_quantity: number;
  in_stock: boolean | null;
  category?: string;
  item_code?: string | null;
}
interface ProductColor {
  id: string;
  color_name: string;
  color_hex: string;
  image_url: string | null;
  stock_quantity: number;
}
interface Specification {
  name: string;
  value: string;
  icon: string | null;
}

// Icon mapping from database value to Lucide component
// Must match specIconOptions in Admin.tsx
const iconMap: Record<string, LucideIcon> = {
  zap: Zap,
  battery: Battery,
  gauge: Gauge,
  radio: Radio,
  box: Box,
  clock: Clock,
  ruler: Ruler,
  weight: Scale,
  thermometer: Thermometer,
  wifi: Wifi,
  camera: Camera,
  star: Star
};

// Default icon when none specified
const DefaultIcon = Box;
interface ColorImage {
  id: string;
  image_url: string;
  color_id: string | null;
}
const ProductDetail = () => {
  const {
    id
  } = useParams();
  const {
    addToCart
  } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [specs, setSpecs] = useState<Specification[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [colorImages, setColorImages] = useState<ColorImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [productColors, setProductColors] = useState<ProductColor[]>([]);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [userSelectedColor, setUserSelectedColor] = useState(false);
  const [colorImageIndex, setColorImageIndex] = useState(0);
  const [selectedColorImageIndex, setSelectedColorImageIndex] = useState(0);
  const autoSlideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);
  
  // Pre-order state
  const [showPreorderDialog, setShowPreorderDialog] = useState(false);
  const [preorderName, setPreorderName] = useState("");
  const [preorderPhone, setPreorderPhone] = useState("");
  const [preorderEmail, setPreorderEmail] = useState("");
  const [preorderNotes, setPreorderNotes] = useState("");
  const [preorderQuantity, setPreorderQuantity] = useState(1);
  const [submittingPreorder, setSubmittingPreorder] = useState(false);

  // Check if product is out of stock (considering selected color variant)
  const selectedColorForStock = productColors.find(c => c.id === selectedColorId);
  const isOutOfStock = product 
    ? (productColors.length > 0 && selectedColorForStock 
        ? selectedColorForStock.stock_quantity <= 0 
        : product.stock_quantity <= 0)
    : false;

  // Get all images for a specific color (including all entries with same hex)
  const getImagesForColor = useCallback((colorId: string): string[] => {
    const images: string[] = [];

    // Find the selected color's hex value
    const selectedColor = productColors.find(c => c.id === colorId);
    if (!selectedColor) return images;
    const selectedHex = selectedColor.color_hex.toLowerCase();

    // Get all color IDs that share the same hex value
    const matchingColorIds = productColors.filter(c => c.color_hex.toLowerCase() === selectedHex).map(c => c.id);

    // Add images from product_images table linked to any matching color
    colorImages.filter(img => img.color_id && matchingColorIds.includes(img.color_id)).forEach(img => {
      if (!images.includes(img.image_url)) {
        images.push(img.image_url);
      }
    });

    // Also add main images from all matching colors
    productColors.filter(c => c.color_hex.toLowerCase() === selectedHex).forEach(c => {
      if (c.image_url && !images.includes(c.image_url)) {
        images.push(c.image_url);
      }
    });
    return images;
  }, [colorImages, productColors]);

  // Auto-slide logic removed - users can now swipe manually
  const handleColorSelect = (colorId: string) => {
    setUserSelectedColor(true);
    setSelectedColorId(colorId);
    setSelectedColorImageIndex(0);
    const index = productColors.findIndex(c => c.id === colorId);
    if (index !== -1) setColorImageIndex(index);
  };
  const handlePrevImage = () => {
    if (userSelectedColor && selectedColorId) {
      const colorImgs = getImagesForColor(selectedColorId);
      if (colorImgs.length > 1) {
        setSelectedColorImageIndex(prev => prev === 0 ? colorImgs.length - 1 : prev - 1);
      }
    } else {
      setUserSelectedColor(true);
      setColorImageIndex(prev => {
        const newIndex = prev === 0 ? productColors.length - 1 : prev - 1;
        setSelectedColorId(productColors[newIndex].id);
        return newIndex;
      });
    }
  };

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.targetTouches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    const distance = touchStartRef.current - touchEndRef.current;
    const minSwipeDistance = 50;
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Swiped left - go next
        handleNextImage();
      } else {
        // Swiped right - go prev
        handlePrevImage();
      }
    }
    touchStartRef.current = null;
    touchEndRef.current = null;
  };
  const handleNextImage = () => {
    if (userSelectedColor && selectedColorId) {
      const colorImgs = getImagesForColor(selectedColorId);
      if (colorImgs.length > 1) {
        setSelectedColorImageIndex(prev => (prev + 1) % colorImgs.length);
      }
    } else {
      setUserSelectedColor(true);
      setColorImageIndex(prev => {
        const newIndex = (prev + 1) % productColors.length;
        setSelectedColorId(productColors[newIndex].id);
        return newIndex;
      });
    }
  };
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      const {
        data: dbProduct,
        error
      } = await supabase.from("products").select(`*, categories (name)`).eq("id", id).single();
      if (dbProduct && !error) {
        setProduct({
          ...dbProduct,
          category: dbProduct.categories?.name || "RC Toy"
        });

        // Fetch specifications
        const {
          data: specsData
        } = await supabase.from("product_specifications").select("*").eq("product_id", id).order("sort_order");
        if (specsData && specsData.length > 0) {
          setSpecs(specsData.map(s => ({
            name: s.spec_name,
            value: s.spec_value,
            icon: s.icon || null
          })));
        }

        // Fetch gallery images (including color associations)
        const {
          data: imagesData
        } = await supabase.from("product_images").select("id, image_url, color_id").eq("product_id", id).order("sort_order");
        const images: string[] = [];
        if (dbProduct.image_url) {
          images.push(dbProduct.image_url);
        }
        if (imagesData) {
          setColorImages(imagesData as ColorImage[]);
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

        // Fetch similar products
        if (dbProduct.category_id) {
          const {
            data: similar
          } = await supabase.from("products").select("id, name, price, image_url, rating").eq("category_id", dbProduct.category_id).neq("id", id).limit(4);
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
      if (isOutOfStock) {
        setShowPreorderDialog(true);
        return;
      }
      
      // Check stock availability before adding
      const selectedColor = productColors.find(c => c.id === selectedColorId);
      const availableStock = selectedColor ? selectedColor.stock_quantity : product.stock_quantity;
      
      const currentCartQty = (() => {
        const stored = localStorage.getItem("rcjoy_cart");
        if (!stored) return 0;
        const cartItems = JSON.parse(stored);
        return cartItems.filter((i: any) => 
          i.id === product.id && (i.colorId || null) === (selectedColorId || null)
        ).reduce((sum: number, i: any) => sum + i.quantity, 0);
      })();
      
      if (availableStock <= 0) {
        setShowPreorderDialog(true);
        return;
      }
      
      if (currentCartQty >= availableStock) {
        toast({
          title: "Stock Limit Reached",
          description: `Only ${availableStock} available${selectedColor ? ` in ${selectedColor.color_name}` : ''}.`,
          variant: "destructive"
        });
        return;
      }
      
      // Get image for selected color or default
      const imageSrc = selectedColor?.image_url || galleryImages[0] || product.image_url || "";
      
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: imageSrc,
        colorId: selectedColorId,
        colorName: selectedColor?.color_name || null,
        colorHex: selectedColor?.color_hex || null,
        itemCode: (product as any).item_code || null,
      });
      
      const colorText = selectedColor ? ` (${selectedColor.color_name})` : '';
      toast({
        title: "Added to Cart",
        description: `${product.name}${colorText} has been added to your cart.`
      });
    }
  };

  const handlePreorderSubmit = async () => {
    if (!product) return;
    if (!preorderName.trim() || !preorderPhone.trim()) {
      toast({
        title: "Required Fields",
        description: "Please enter your name and phone number.",
        variant: "destructive"
      });
      return;
    }

    setSubmittingPreorder(true);
    try {
      // Insert preorder request
      const { error: preorderError } = await supabase
        .from("preorders")
        .insert({
          product_id: product.id,
          user_id: user?.id || null,
          customer_name: preorderName,
          customer_email: preorderEmail || null,
          customer_phone: preorderPhone,
          quantity: preorderQuantity,
          notes: preorderNotes || null,
          status: "pending"
        });

      if (preorderError) throw preorderError;

      // Send email notification to admin
      await supabase.functions.invoke("send-email", {
        body: {
          type: "admin_notification",
          template_key: "preorder_notification",
          variables: {
            product_name: product.name,
            product_price: formatMVR(product.price),
            customer_name: preorderName,
            customer_phone: preorderPhone,
            customer_email: preorderEmail || "Not provided",
            quantity: String(preorderQuantity),
            notes: preorderNotes || "None"
          }
        }
      });

      toast({
        title: "Pre-order Submitted!",
        description: "We'll notify you when this product is back in stock."
      });

      setShowPreorderDialog(false);
      setPreorderName("");
      setPreorderPhone("");
      setPreorderEmail("");
      setPreorderNotes("");
      setPreorderQuantity(1);
    } catch (error: any) {
      console.error("Error submitting preorder:", error);
      toast({
        title: "Error",
        description: "Failed to submit pre-order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmittingPreorder(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>;
  }

  // Get current display image
  const getCurrentImage = () => {
    if (userSelectedColor && selectedColorId) {
      const colorImgs = getImagesForColor(selectedColorId);
      return colorImgs[selectedColorImageIndex] || colorImgs[0] || product?.image_url;
    }
    const selectedColor = productColors.find(c => c.id === selectedColorId);
    return selectedColor?.image_url || galleryImages[currentImageIndex] || product?.image_url;
  };
  if (!product) {
    return <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
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
      </div>;
  }
  const currentImage = getCurrentImage();
  const selectedColorImages = selectedColorId ? getImagesForColor(selectedColorId) : [];
  const totalImages = userSelectedColor ? selectedColorImages.length : productColors.length;
  const currentIndex = userSelectedColor ? selectedColorImageIndex : colorImageIndex;
  const showArrows = totalImages > 1;

  // Feature icons for specifications display - uses stored icon or falls back to auto-detection
  const getSpecIcon = (iconValue: string | null, name: string): LucideIcon => {
    // First try to use the stored icon
    if (iconValue && iconMap[iconValue]) {
      return iconMap[iconValue];
    }
    // Fallback to auto-detection for backwards compatibility
    const lowerName = name.toLowerCase();
    if (lowerName.includes('speed') || lowerName.includes('fast')) return Zap;
    if (lowerName.includes('battery') || lowerName.includes('power')) return Battery;
    if (lowerName.includes('range') || lowerName.includes('distance')) return Gauge;
    if (lowerName.includes('control') || lowerName.includes('frequency')) return Radio;
    return Box;
  };
  return <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <Header />

      {/* Main Content - Responsive Layout */}
      <div className="container max-w-6xl mx-auto px-4 lg:px-8">
        
        {/* Desktop: Two-column layout, Mobile: Single column */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:py-12">
          
          {/* Left Column - Product Image + Price & Cart */}
          <div className="py-6 lg:py-0">
            <div className="lg:sticky lg:top-20 space-y-6">
              {/* Image with swipe arrows for colors */}
              <div className="relative" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                <div className="aspect-[4/5] w-full max-w-lg mx-auto lg:max-w-none bg-muted/40 rounded-3xl overflow-hidden shadow-lg">
                  {currentImage ? <img key={currentImage} src={currentImage} alt={product.name} loading="eager" decoding="async" className="w-full h-full object-cover rounded-3xl animate-fade-in" /> : <div className="w-full h-full flex items-center justify-center text-8xl">📦</div>}
                </div>
                
                {/* Elegant swipe buttons */}
                {showArrows && <>
                    <button onClick={handlePrevImage} className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-background/95 backdrop-blur-md flex items-center justify-center shadow-lg hover:scale-110 hover:bg-background transition-all duration-200 group border border-border/30" aria-label="Previous image">
                      <ChevronLeft className="w-6 h-6 text-foreground/80 group-hover:text-primary transition-colors" />
                    </button>
                    <button onClick={handleNextImage} className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-background/95 backdrop-blur-md flex items-center justify-center shadow-lg hover:scale-110 hover:bg-background transition-all duration-200 group border border-border/30" aria-label="Next image">
                      <ChevronRight className="w-6 h-6 text-foreground/80 group-hover:text-primary transition-colors" />
                    </button>
                    
                    {/* Image counter indicator */}
                    
                  </>}
              </div>
              
              {/* Image Dots - for gallery images when no colors */}
              {galleryImages.length > 1 && productColors.length === 0 && <div className="flex justify-center gap-2">
                  {galleryImages.map((_, index) => <button key={index} onClick={() => setCurrentImageIndex(index)} className={`w-2 h-2 rounded-full transition-all ${index === currentImageIndex ? 'bg-foreground w-4' : 'bg-muted-foreground/40 hover:bg-muted-foreground/60'}`} />)}
                </div>}

              {/* Color Options - Unique colors only */}
              {productColors.length > 0 && (() => {
              // Deduplicate colors by color_hex
              const uniqueColors = productColors.filter((color, index, self) => index === self.findIndex(c => c.color_hex.toLowerCase() === color.color_hex.toLowerCase()));
              return <div className="text-center lg:text-left">
                    <p className="text-xs text-muted-foreground mb-2">
                      {uniqueColors.length} color{uniqueColors.length !== 1 ? 's' : ''} available
                    </p>
                    <div className="flex justify-center lg:justify-start gap-2">
                      {uniqueColors.map(color => <button key={color.id} onClick={() => handleColorSelect(color.id)} className={`w-6 h-6 rounded-full transition-all duration-300 ${selectedColorId === color.id ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`} style={{
                    backgroundColor: color.color_hex
                  }} title={color.color_name} />)}
                    </div>
                  </div>;
            })()}

              {/* Price, Product Name and Add to Cart */}
              <div className="text-center lg:text-left space-y-3">
                {/* Stock Status */}
                {isOutOfStock && (
                  <div className="flex items-center justify-center lg:justify-start gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Out of Stock</span>
                  </div>
                )}

                {/* Price */}
                <div className="flex items-center justify-center lg:justify-start gap-3">
                  <p className={`text-2xl font-bold ${isOutOfStock ? "text-muted-foreground" : "text-foreground"}`}>
                    {formatMVR(product.price)}
                  </p>
                  {product.old_price && product.old_price > product.price && <p className="text-lg text-muted-foreground line-through">
                      {formatMVR(product.old_price)}
                    </p>}
                </div>
                
                {/* Product Name - Mobile only */}
                <div className="lg:hidden">
                  <h1 className="text-xl font-bold text-foreground">{product.name}</h1>
                </div>
                
                {/* Add to Cart or Pre-order */}
                {isOutOfStock ? (
                  <button 
                    onClick={() => setShowPreorderDialog(true)} 
                    className="w-full py-3.5 rounded-full bg-secondary text-secondary-foreground font-medium text-base hover:bg-secondary/90 transition-all flex items-center justify-center gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    Request Pre-order
                  </button>
                ) : (
                  <button 
                    onClick={handleAddToCart} 
                    className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-medium text-base hover:bg-primary/90 transition-all"
                  >
                    Add to Cart
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Product Info */}
          <div className="lg:py-0">
            {/* Product Name - Desktop only, above specs */}
            <div className="hidden lg:block pb-4">
              <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
            </div>
            
            {/* Specifications as Feature List */}
            <div className="py-6 lg:pt-0 space-y-0">
              {specs.length > 0 ? specs.map((spec, index) => {
              const IconComponent = getSpecIcon(spec.icon, spec.name);
              return <div key={index} className="flex items-start gap-4 py-4 border-b border-border last:border-b-0">
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-muted-foreground">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-foreground text-base leading-relaxed">
                          <span className="font-medium">{spec.name}</span>
                          {spec.value && <span className="text-muted-foreground"> - {spec.value}</span>}
                        </p>
                      </div>
                    </div>;
            }) : <>
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
                </>}
            </div>

            {/* Product Description */}
            {product.description && <div className="py-6 border-t border-border">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>}
          </div>
        </div>

        {/* Similar Products - Full Width */}
        {similarProducts.length > 0 && <div className="py-12 border-t border-border">
            <h2 className="text-xl font-semibold text-foreground text-center lg:text-left mb-8">
              You might also like
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {similarProducts.map(p => <Link key={p.id} to={`/product/${p.id}`} className="group block">
                  <div className="aspect-[4/5] bg-muted/30 rounded-2xl overflow-hidden mb-3">
                    <div className="w-full h-full flex items-center justify-center">
                      {p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover rounded-xl transition-transform group-hover:scale-105" /> : <div className="text-4xl">📦</div>}
                    </div>
                  </div>
                  <h4 className="font-medium text-foreground text-sm truncate">
                    {p.name}
                  </h4>
                  <p className="font-semibold text-foreground text-sm mt-1">
                    {formatMVR(p.price)}
                  </p>
                </Link>)}
            </div>
          </div>}
      </div>

      {/* Pre-order Dialog */}
      <Dialog open={showPreorderDialog} onOpenChange={setShowPreorderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Request Pre-order
            </DialogTitle>
            <DialogDescription>
              This product is currently out of stock. Submit your details and we'll notify you when it's available.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preorder-name">Name *</Label>
              <Input
                id="preorder-name"
                placeholder="Your full name"
                value={preorderName}
                onChange={(e) => setPreorderName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="preorder-phone">Phone Number *</Label>
              <Input
                id="preorder-phone"
                placeholder="Your phone number"
                value={preorderPhone}
                onChange={(e) => setPreorderPhone(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="preorder-email">Email (optional)</Label>
              <Input
                id="preorder-email"
                type="email"
                placeholder="Your email address"
                value={preorderEmail}
                onChange={(e) => setPreorderEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="preorder-quantity">Quantity</Label>
              <Input
                id="preorder-quantity"
                type="number"
                min="1"
                value={preorderQuantity}
                onChange={(e) => setPreorderQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="preorder-notes">Notes (optional)</Label>
              <Textarea
                id="preorder-notes"
                placeholder="Any special requests or notes"
                value={preorderNotes}
                onChange={(e) => setPreorderNotes(e.target.value)}
                rows={3}
              />
            </div>
            
            {/* Product Summary */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium text-foreground">{product?.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatMVR(product?.price || 0)} × {preorderQuantity} = {formatMVR((product?.price || 0) * preorderQuantity)}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowPreorderDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handlePreorderSubmit}
              disabled={submittingPreorder}
            >
              {submittingPreorder ? "Submitting..." : "Submit Pre-order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>;
};
export default ProductDetail;