import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import heroRcTrack from "@/assets/hero-rc-track.jpg";

interface HeroBackground {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  title: string | null;
  subtitle: string | null;
}

const HeroBanner = () => {
  const [backgrounds, setBackgrounds] = useState<HeroBackground[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBackgrounds = async () => {
      const { data, error } = await supabase
        .from('hero_backgrounds')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!error && data && data.length > 0) {
        setBackgrounds(data.map(bg => ({
          ...bg,
          media_type: bg.media_type as 'image' | 'video'
        })));
      } else {
        // Fallback default with local image
        setBackgrounds([{
          id: 'default',
          media_url: heroRcTrack,
          media_type: 'image',
          title: 'Ultimate RC Experience',
          subtitle: 'Discover the joy of remote control'
        }]);
      }
      setIsLoading(false);
    };

    fetchBackgrounds();
  }, []);

  // Auto-shuffle backgrounds every 5 seconds if there are multiple
  useEffect(() => {
    if (backgrounds.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % backgrounds.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [backgrounds.length]);

  const currentBackground = backgrounds[currentIndex];

  if (isLoading) {
    return (
      <section className="relative h-screen w-full bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </section>
    );
  }

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background Media */}
      <div className="absolute inset-0 w-full h-full">
        {backgrounds.map((bg, index) => (
          <div
            key={bg.id}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {bg.media_type === 'video' ? (
              <video
                src={bg.media_url}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={bg.media_url}
                alt="Hero background"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        ))}
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
        {/* Main headline */}
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white tracking-tight leading-tight drop-shadow-lg">
            {currentBackground?.title || 'Ultimate RC Experience'}
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-white/80 font-light drop-shadow-md">
            {currentBackground?.subtitle || 'Discover the joy of remote control'}
          </p>
        </div>

        {/* RC Joystick Button */}
        <div className="absolute bottom-16 md:bottom-24">
          <Link to="/categories" className="group">
            <div className="relative flex flex-col items-center">
              {/* Chevron hint */}
              <ChevronUp className="w-6 h-6 text-white/70 mb-2 animate-bounce" />
              
              {/* Joystick track */}
              <div className="w-16 h-28 md:w-20 md:h-32 bg-gradient-to-b from-zinc-300 to-zinc-400 rounded-full flex flex-col items-center justify-end pb-3 shadow-2xl">
                {/* Joystick knob */}
                <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-white to-zinc-200 rounded-full shadow-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200 border-2 border-zinc-300">
                  {/* RC symbol */}
                  <div className="flex flex-col items-center">
                    <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-zinc-600 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-zinc-600 rounded-full" />
                    </div>
                    <span className="text-xs font-bold text-zinc-700 mt-0.5">RC</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Background indicators */}
        {backgrounds.length > 1 && (
          <div className="absolute bottom-6 flex gap-2">
            {backgrounds.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'bg-white w-6' 
                    : 'bg-white/50 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroBanner;
