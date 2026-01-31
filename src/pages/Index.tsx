import { useState, useEffect, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import VideoShowcase from "@/components/VideoShowcase";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { formatMVR } from "@/lib/currency";
interface FeaturedProduct {
  id: string;
  product_id: string;
  category_id: string | null;
  title: string | null;
  subtitle: string | null;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    rating: number | null;
    description: string | null;
  };
}
interface HomeContent {
  hero_title: string | null;
  hero_subtitle: string | null;
  feature_1_icon: string | null;
  feature_1_title: string | null;
  feature_1_description: string | null;
  feature_2_icon: string | null;
  feature_2_title: string | null;
  feature_2_description: string | null;
  feature_3_icon: string | null;
  feature_3_title: string | null;
  feature_3_description: string | null;
  cta_title: string | null;
  cta_subtitle: string | null;
  cta_button_text: string | null;
}
import OptimizedImage, { preloadImage } from "@/components/OptimizedImage";
import { preloadImages } from "@/lib/imageOptimization";

// Preload featured product images
const preloadFeaturedImages = (products: FeaturedProduct[]) => {
  const urls = products.map(fp => fp.product.image_url).filter((url): url is string => !!url);
  preloadImages(urls, 640);
};
const Index = () => {
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [homeContent, setHomeContent] = useState<HomeContent | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchData = async () => {
      const [featuredRes, contentRes] = await Promise.all([supabase.from("featured_products").select(`
            id,
            product_id,
            category_id,
            title,
            subtitle,
            product:products (
              id,
              name,
              price,
              image_url,
              rating,
              description
            )
          `).eq("is_active", true).order("sort_order"), supabase.from("system_settings").select(`
            hero_title,
            hero_subtitle,
            feature_1_icon,
            feature_1_title,
            feature_1_description,
            feature_2_icon,
            feature_2_title,
            feature_2_description,
            feature_3_icon,
            feature_3_title,
            feature_3_description,
            cta_title,
            cta_subtitle,
            cta_button_text
          `).limit(1).maybeSingle()]);
      if (featuredRes.data) {
        setFeaturedProducts(featuredRes.data as unknown as FeaturedProduct[]);
      }
      if (contentRes.data) {
        setHomeContent(contentRes.data as HomeContent);
      }
      setLoading(false);
    };
    fetchData();
  }, []);
  return <div className="min-h-screen bg-background py-0 my-0 pb-[48px] lg:pb-0">
      <Header />

      {/* Video Showcase - Full Width */}
      <section className="w-full">
        <VideoShowcase />
      </section>

      {/* Hero Text Section */}
      <section className="py-10 lg:py-[26px] my-0">
        <div className="container max-w-7xl mx-auto px-4 lg:px-8 text-center">
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
              {homeContent?.hero_title || "Ultimate RC Experience"}
            </h1>
            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
              {homeContent?.hero_subtitle || "Discover premium remote control toys that bring excitement to every adventure."}
            </p>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-6 lg:py-12 my-0">
        <div className="container max-w-7xl mx-auto px-4 lg:px-8">
          {loading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {[1, 2, 3].map(i => <div key={i} className="aspect-[4/5] bg-muted animate-pulse" />)}
            </div> : featuredProducts.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {featuredProducts.map((featured, index) => <div key={featured.id} onClick={() => {
            // Navigate to categories page with category filter
            if (featured.category_id) {
              navigate(`/categories?category=${featured.category_id}`);
            } else {
              navigate('/categories');
            }
          }} className="group block relative overflow-hidden rounded-2xl animate-fade-in cursor-pointer" style={{
            animationDelay: `${index * 0.1}s`
          }}>
                  {/* Title label at top */}
                  <div className="absolute top-4 left-0 right-0 z-10 text-center">
                    <span className="text-xs sm:text-sm font-medium tracking-widest text-foreground/80 uppercase">
                      {featured.title || featured.product.name}
                    </span>
                  </div>

                  {/* Full-bleed image */}
                  <div className="aspect-[4/5] w-full overflow-hidden bg-muted">
                    {featured.product.image_url ? <OptimizedImage src={featured.product.image_url} alt={featured.product.name} priority={index === 0} fill className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <div className="w-full h-full bg-muted flex items-center justify-center text-6xl">📦</div>}
                  </div>
                </div>)}
            </div> : <div className="text-center py-16 bg-muted/30 rounded-xl">
              <div className="text-6xl mb-4">🎮</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Featured Products Yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Admin can add featured products from the dashboard.
              </p>
              <Link to="/categories">
                <button className="bg-primary text-primary-foreground font-medium px-6 py-3 rounded-full hover:bg-primary/90 transition-all">
                  Browse All Products
                </button>
              </Link>
            </div>}
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <div className="text-center space-y-4 p-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-3xl">{homeContent?.feature_1_icon || "🚗"}</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground">{homeContent?.feature_1_title || "Premium Quality"}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {homeContent?.feature_1_description || "Every toy is crafted with precision and built to last through countless adventures."}
              </p>
            </div>
            <div className="text-center space-y-4 p-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-3xl">{homeContent?.feature_2_icon || "🎮"}</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground">{homeContent?.feature_2_title || "Easy Control"}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {homeContent?.feature_2_description || "Intuitive controls designed for beginners and exciting enough for experts."}
              </p>
            </div>
            <div className="text-center space-y-4 p-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-3xl">{homeContent?.feature_3_icon || "🔋"}</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground">{homeContent?.feature_3_title || "Long Battery Life"}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {homeContent?.feature_3_description || "Extended playtime with powerful batteries that keep the fun going."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32">
        <div className="container max-w-4xl mx-auto px-4 lg:px-8 text-center space-y-8">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            {homeContent?.cta_title?.split('\n').map((line, i) => <span key={i}>
                {i > 0 && <br />}
                {i === 1 ? <span className="text-primary">{line}</span> : line}
              </span>) || <>
                Ready to start your
                <br />
                <span className="text-primary">RC adventure?</span>
              </>}
          </h2>
          <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
            {homeContent?.cta_subtitle || "Join thousands of happy customers who've discovered the thrill of remote control."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/categories">
              <button className="group bg-foreground text-background font-medium px-8 py-4 rounded-full text-base lg:text-lg hover:bg-foreground/90 transition-all duration-300 flex items-center gap-2">
                {homeContent?.cta_button_text || "Browse Collection"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      <BottomNavigation />
    </div>;
};
export default Index;