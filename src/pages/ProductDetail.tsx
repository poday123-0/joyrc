import { useParams, Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Star, ShoppingBag } from "lucide-react";
import { products } from "@/data/products";
import ProductCard from "@/components/ProductCard";
import orandaGoldfish from "@/assets/oranda-goldfish.png";
import bettaFish from "@/assets/betta-fish.png";
import guppyFish from "@/assets/guppy-fish.png";
import neonTetra from "@/assets/neon-tetra.png";

const imageMap: Record<string, string> = {
  "oranda-goldfish": orandaGoldfish,
  "betta-fish": bettaFish,
  "guppy-fish": guppyFish,
  "neon-tetra": neonTetra,
};

const ProductDetail = () => {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Product not found</p>
      </div>
    );
  }

  const similarProducts = products.filter((p) => p.id !== id).slice(0, 3);

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
          <h1 className="font-semibold text-foreground">Fish Details</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Main content */}
      <div className="container max-w-md mx-auto px-4 mt-6">
        {/* Specs and Image section */}
        <div className="relative flex items-center justify-center h-72">
          {/* Left side specs */}
          <div className="absolute left-0 top-8 space-y-4 z-10">
            <SpecBubble label="Weight" value={product.weight} />
            <SpecBubble label="Age" value={product.age} />
            <SpecBubble label="Size" value={product.size} />
            <SpecBubble label="Temperature" value={product.temperature} />
          </div>

          {/* Fish image with rating */}
          <div className="relative z-0">
            <div className="w-48 h-48 rounded-3xl overflow-hidden shadow-elevated">
              <img
                src={imageMap[product.image]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Rating badge */}
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-soft">
              <Star className="w-3 h-3 fill-gold text-gold" />
              <span className="text-xs font-medium">{product.rating}</span>
            </div>
            {/* Name overlay */}
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-white text-sm font-semibold drop-shadow-lg">
                {product.name}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation arrows */}
        <div className="flex justify-center gap-4 mt-4">
          <div className="flex gap-1.5">
            <div className="w-5 h-1.5 rounded-full bg-primary"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"></div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <button className="w-8 h-8 rounded-full glass-card flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <button className="w-8 h-8 rounded-full glass-card flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        </div>

        {/* Product info */}
        <div className="mt-6 bg-white rounded-t-3xl p-6 shadow-elevated">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">{product.name}</h2>
            <p className="text-xl font-bold text-foreground">${product.price.toFixed(2)}</p>
          </div>

          <div className="mt-4">
            <h3 className="font-semibold text-foreground">Description</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Similar species */}
          <div className="mt-6">
            <h3 className="font-semibold text-foreground mb-3">Similar species</h3>
            <div className="grid grid-cols-3 gap-3">
              {similarProducts.map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  className="rounded-2xl overflow-hidden shadow-soft group"
                >
                  <div className="aspect-square relative">
                    <img
                      src={imageMap[p.image]}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
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
          <button className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-soft">
            <ShoppingBag className="w-6 h-6 text-primary-foreground" />
          </button>
          <button className="flex-1 h-14 rounded-full gradient-cta flex items-center justify-center gap-2 shadow-elevated hover:opacity-90 transition-opacity">
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
  <div className="glass-card rounded-2xl px-3 py-2 animate-slide-up">
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold text-foreground">{value}</p>
  </div>
);

export default ProductDetail;
