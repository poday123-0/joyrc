import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import rcCarRed from "@/assets/rc-car-red.png";

const HeroBanner = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Main Hero */}
      <div className="min-h-[60vh] lg:min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-12 lg:py-20">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" />
        
        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto space-y-6 lg:space-y-8 animate-fade-in">
          {/* Eyebrow */}
          <p className="text-sm lg:text-base font-medium text-primary tracking-wide uppercase">
            New Collection
          </p>
          
          {/* Main headline */}
          <h1 className="text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-bold text-foreground tracking-tight leading-[1.1]">
            Ultimate RC
            <br />
            <span className="text-gradient-primary">Experience</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Discover the joy of remote control. Premium toys designed for thrill-seekers of all ages.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/categories">
              <button className="group bg-foreground text-background font-medium px-8 py-4 rounded-full text-base lg:text-lg hover:bg-foreground/90 transition-all duration-300 flex items-center gap-2">
                Shop Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link to="/categories" className="text-foreground font-medium hover:text-primary transition-colors text-base lg:text-lg">
              Learn more →
            </Link>
          </div>
        </div>
        
        {/* Hero Product Image */}
        <div className="relative z-10 mt-8 lg:mt-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-75" />
            <img
              src={rcCarRed}
              alt="RC Car"
              className="relative w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 xl:w-96 xl:h-96 object-contain animate-float"
            />
          </div>
        </div>
      </div>

      {/* Feature Strip */}
      <div className="relative z-10 border-t border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container max-w-7xl mx-auto px-4 py-6 lg:py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 text-center">
            <div className="space-y-1">
              <p className="text-2xl lg:text-3xl font-bold text-foreground">20%</p>
              <p className="text-xs lg:text-sm text-muted-foreground">Off Selected Items</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl lg:text-3xl font-bold text-foreground">Free</p>
              <p className="text-xs lg:text-sm text-muted-foreground">Delivery Over MVR 500</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl lg:text-3xl font-bold text-foreground">24/7</p>
              <p className="text-xs lg:text-sm text-muted-foreground">Customer Support</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl lg:text-3xl font-bold text-foreground">100%</p>
              <p className="text-xs lg:text-sm text-muted-foreground">Quality Guaranteed</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
