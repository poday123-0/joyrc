import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import orandaGoldfish from "@/assets/oranda-goldfish.png";

const Onboarding = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      image: orandaGoldfish,
      price: "$120",
      title: "Discover the Beauty of Aquatic Life",
      description: "From Ocean to Door: Ultra-Fresh Marine Catch, Guaranteed Quality, Lightning Delivery Awaits."
    }
  ];

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      {/* Skip button */}
      <div className="container max-w-md mx-auto px-4 pt-4 flex justify-end">
        <Link 
          to="/" 
          className="text-primary-foreground/70 text-sm hover:text-primary-foreground transition-colors"
        >
          Skip
        </Link>
      </div>

      {/* Image section */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={slides[currentSlide].image}
            alt="Fish"
            className="w-72 h-72 object-contain animate-float"
          />
        </div>
        
        {/* Price tag */}
        <div className="absolute top-1/4 left-8 glass-card rounded-xl px-4 py-2 shadow-elevated">
          <span className="font-bold text-foreground">{slides[currentSlide].price}</span>
        </div>
      </div>

      {/* Content section */}
      <div className="bg-white rounded-t-[3rem] px-8 pt-10 pb-8 animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground text-center leading-tight">
          {slides[currentSlide].title}
        </h1>
        <p className="text-muted-foreground text-center mt-4 text-sm leading-relaxed">
          {slides[currentSlide].description}
        </p>

        {/* Pagination */}
        <div className="flex justify-center gap-2 mt-6">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide
                  ? "w-6 bg-primary"
                  : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <Link to="/login">
          <button className="w-full mt-8 py-4 rounded-full gradient-cta flex items-center justify-center gap-2 shadow-elevated hover:opacity-90 transition-opacity">
            <span className="text-white font-semibold">Next</span>
            <div className="flex">
              <ChevronRight className="w-4 h-4 text-white/70" />
              <ChevronRight className="w-4 h-4 text-white/90 -ml-2" />
              <ChevronRight className="w-4 h-4 text-white -ml-2" />
            </div>
          </button>
        </Link>
      </div>
    </div>
  );
};

export default Onboarding;
