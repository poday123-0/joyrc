import { useState } from "react";
import { useNavigate } from "react-router-dom";

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

  return (
    <div 
      className="group block cursor-pointer perspective-1000"
      onClick={handleClick}
    >
      <div 
        className={`relative w-full transition-transform duration-500 transform-style-preserve-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        style={{ 
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.5s ease-in-out'
        }}
      >
        {/* Front of card - Product Image & Name */}
        <div 
          className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-muted/50 aspect-[3/4] transition-all duration-300"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Product image - larger and fitted */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <img
              src={imageSrc}
              alt={product.name}
              className="w-full h-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          
          {/* Product name overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
            <h4 className="font-semibold text-white text-sm lg:text-base leading-tight line-clamp-2">
              {product.name}
            </h4>
          </div>

          {/* Flip indicator */}
          <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <svg className="w-4 h-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        </div>

        {/* Back of card - Product Description */}
        <div 
          className="absolute inset-0 overflow-hidden rounded-2xl lg:rounded-3xl bg-card border border-border aspect-[3/4] p-4 flex flex-col"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <h4 className="font-semibold text-foreground text-sm lg:text-base leading-tight mb-3 line-clamp-2">
            {product.name}
          </h4>
          
          <p className="text-muted-foreground text-xs lg:text-sm flex-1 overflow-y-auto leading-relaxed">
            {product.description || "Experience the thrill of RC with this amazing product. High quality build and responsive controls for hours of fun."}
          </p>

          <button
            onClick={handleNavigate}
            className="mt-4 w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
