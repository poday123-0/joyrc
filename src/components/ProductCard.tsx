import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, RotateCcw } from "lucide-react";
import { formatMVR } from "@/lib/currency";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    category?: string;
    price: number;
    rating?: number;
    image?: string;
    image_url?: string;
    description?: string | null;
  };
  size?: "large" | "small";
}

const ProductCard = ({ product, size = "large" }: ProductCardProps) => {
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
            <img
              src={imageSrc}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          </div>
          
          {/* Product name overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h4 className="font-semibold text-white text-base lg:text-lg leading-tight line-clamp-2 drop-shadow-lg">
              {product.name}
            </h4>
          </div>

          {/* Flip indicator - always visible */}
          <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110">
            <RotateCcw className="w-4 h-4 text-white" />
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
          <div className="h-full flex flex-col p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 pr-2">
                <h4 className="font-bold text-foreground text-base lg:text-lg leading-tight line-clamp-2">
                  {product.name}
                </h4>
                <p className="text-primary font-semibold text-lg mt-1">
                  {formatMVR(product.price)}
                </p>
              </div>
              <button
                onClick={handleFlipBack}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors flex-shrink-0"
              >
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-border mb-3" />
            
            {/* Description */}
            <div className="flex-1 overflow-y-auto">
              <p className="text-muted-foreground text-sm leading-relaxed">
                {product.description || "Discover the thrill of RC with this amazing product. Built with premium materials for durability and performance. Perfect for enthusiasts of all skill levels."}
              </p>
            </div>

            {/* Action button */}
            <button
              onClick={handleNavigate}
              className="mt-4 w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all duration-300 flex items-center justify-center gap-2 group/btn shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              View Details
              <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
