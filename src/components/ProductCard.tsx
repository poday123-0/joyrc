import { Heart, Star } from "lucide-react";
import { Link } from "react-router-dom";
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
  };
  size?: "large" | "small";
}

const ProductCard = ({ product, size = "large" }: ProductCardProps) => {
  const imageSrc = product.image_url || product.image || "/placeholder.svg";

  return (
    <Link
      to={`/product/${product.id}`}
      className="group block"
    >
      <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-muted/50 aspect-square mb-4 transition-all duration-500 group-hover:bg-muted">
        {/* Favorite button */}
        <button 
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-background"
          onClick={(e) => e.preventDefault()}
        >
          <Heart className="w-4 h-4 text-muted-foreground hover:text-pink transition-colors" />
        </button>

        {/* Product image */}
        <div className="absolute inset-0 flex items-center justify-center p-6 lg:p-8">
          <img
            src={imageSrc}
            alt={product.name}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
          />
        </div>
      </div>

      {/* Product info */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-foreground text-sm lg:text-base leading-tight group-hover:text-primary transition-colors">
            {product.name}
          </h4>
          <div className="flex items-center gap-1 shrink-0">
            <Star className="w-3.5 h-3.5 fill-foreground text-foreground" />
            <span className="text-xs lg:text-sm font-medium text-foreground">
              {product.rating || 4.5}
            </span>
          </div>
        </div>
        <p className="text-xs lg:text-sm text-muted-foreground">{product.category || "RC Toy"}</p>
        <p className="font-semibold text-foreground text-sm lg:text-base pt-1">
          {formatMVR(product.price)}
        </p>
      </div>
    </Link>
  );
};

export default ProductCard;
