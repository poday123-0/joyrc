import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import CategoryPills from "@/components/CategoryPills";
import ProductCard from "@/components/ProductCard";
import BottomNavigation from "@/components/BottomNavigation";
import { products } from "@/data/products";

const Index = () => {
  return (
    <div className="min-h-screen gradient-hero pb-24">
      <div className="container max-w-md mx-auto px-4">
        <Header />
        <HeroBanner />
        <CategoryPills />

        {/* Products Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Popular Fish</h3>
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              See All
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {products.slice(0, 2).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            {products.slice(2, 4).map((product) => (
              <ProductCard key={product.id} product={product} size="small" />
            ))}
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Index;
