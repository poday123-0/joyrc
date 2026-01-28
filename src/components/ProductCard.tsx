import { useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, RotateCcw } from "lucide-react";
import { formatMVR } from "@/lib/currency";
import OptimizedImage from "./OptimizedImage";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    category?: string;
    price: number;
    old_price?: number | null;
    rating?: number;
    image?: string;
    image_url?: string;
    description?: string | null;
  };
  size?: "large" | "small";
  priority?: boolean;
}

const ProductCard = memo(({ product, size = "large", priority = false }: ProductCardProps) => {
  const navigate = useNavigate();
  const [isFlipped, setIsFlipped] = useState(false);
  const imageSrc = product.image_url || product.image || "/placeholder.svg";

  const handleClick = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/product/${product.id}`);
  };

  const handleFlipBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
  };

  return (
    <div 
      className="group block cursor-pointer"
      onClick={handleClick}
      style={{ perspective: '1000px' }}
    >
      <div 
        className="relative w-full h-full"
        style={{ 
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Front of card - Product Image & Name */}
        <div 
          className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-b from-muted/80 to-muted aspect-[3/4] shadow-lg"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Product image - full cover */}
          <div className="absolute inset-0">
            <OptimizedImage
              src={imageSrc}
              alt={product.name}
              priority={priority}
              fill
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 will-change-transform"
            />
            {/* Gradient overlay for text readability - only at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
          </div>
          
          {/* Product name overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-3 lg:p-4">
            <h4 className="font-medium text-white text-sm lg:text-base leading-tight line-clamp-2 drop-shadow-lg">
              {product.name}
            </h4>
          </div>
        </div>

        {/* Back of card - Product Description */}
        <div 
          className="absolute inset-0 overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-br from-primary/10 via-background to-muted border border-border shadow-xl aspect-[3/4]"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="h-full flex flex-col p-4">
            {/* Header */}
            <div className="mb-2">
              <h4 className="font-semibold text-foreground text-sm lg:text-base leading-tight line-clamp-2">
                {product.name}
              </h4>
              <div className="flex items-center gap-2 mt-1.5">
                {product.old_price && product.old_price > product.price ? (
                  <>
                    <span className="text-muted-foreground text-xs line-through">
                      {formatMVR(product.old_price)}
                    </span>
                    <span className="text-primary font-bold text-base">
                      {formatMVR(product.price)}
                    </span>
                  </>
                ) : (
                  <span className="text-primary font-bold text-base">
                    {formatMVR(product.price)}
                  </span>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-border mb-2" />
            
            {/* Description - Auto scroll with animation */}
            <div className="flex-1 overflow-hidden relative">
              <div className="animate-scroll-up hover:pause-animation">
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {product.description || "Discover the thrill of RC with this amazing product. Built with premium materials for durability and performance. Perfect for enthusiasts of all skill levels."}
                </p>
              </div>
            </div>

            {/* Action button - smaller and nicer */}
            <button
              onClick={handleNavigate}
              className="mt-3 w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium text-xs hover:bg-primary/90 transition-all duration-300 flex items-center justify-center gap-1.5 shadow-soft hover:shadow-elevated"
            >
              View Details
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
