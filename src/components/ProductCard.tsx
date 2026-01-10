import { Heart, ArrowUpRight, Star } from "lucide-react";
import { Link } from "react-router-dom";
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
  const isLarge = size === "large";
  const imageSrc = product.image_url || imageMap[product.image || ""] || rcCarRed;

  return (
    <Link
      to={`/product/${product.id}`}
      className={`block rounded-3xl gradient-card overflow-hidden shadow-soft hover:shadow-card transition-all duration-300 group ${
        isLarge ? "h-64" : "h-48"
      }`}
    >
      <div className="relative h-full p-4 flex flex-col">
        {/* Rating badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 shadow-soft">
          <Star className="w-3 h-3 fill-gold text-gold" />
          <span className="text-xs font-medium">{product.rating || 4.5}</span>
        </div>

        {/* Favorite button */}
        <button 
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-soft hover:bg-white transition-colors"
          onClick={(e) => e.preventDefault()}
        >
          <Heart className="w-4 h-4 text-pink" />
        </button>

        {/* Price */}
        <div className="absolute top-12 left-3 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 shadow-soft">
          <span className="text-sm font-semibold text-foreground">
            ${product.price.toFixed(2)}
          </span>
        </div>

        {/* Product image */}
        <div className="flex-1 flex items-center justify-center">
          <img
            src={imageSrc}
            alt={product.name}
            className="w-28 h-28 object-contain group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Info bar */}
        <div className="flex items-end justify-between mt-auto">
          <div>
            <h4 className="font-semibold text-foreground text-sm">{product.name}</h4>
            <p className="text-xs text-muted-foreground">{product.category || "RC Toy"}</p>
          </div>
          <div className="w-8 h-8 rounded-full gradient-cta flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform">
            <ArrowUpRight className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
