import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import heroRcTrack from "@/assets/hero-rc-track.jpg";

interface HeroBackground {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  title: string | null;
  subtitle: string | null;
}

const Landing = () => {
  const navigate = useNavigate();
  const [backgrounds, setBackgrounds] = useState<HeroBackground[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPressed, setIsPressed] = useState(false);
  const [knobPosition, setKnobPosition] = useState(0);

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

  // Auto-shuffle backgrounds
  useEffect(() => {
    if (backgrounds.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % backgrounds.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [backgrounds.length]);

  const handleKnobInteraction = () => {
    setIsPressed(true);
    // Animate knob moving up
    let pos = 0;
    const animateUp = setInterval(() => {
      pos += 5;
      setKnobPosition(Math.min(pos, 30));
      if (pos >= 30) {
        clearInterval(animateUp);
        setTimeout(() => {
          navigate('/home');
        }, 200);
      }
    }, 20);
  };

  const currentBackground = backgrounds[currentIndex];

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
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
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-between py-16 px-4">
        {/* Main headline */}
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white tracking-tight leading-tight drop-shadow-2xl">
            {currentBackground?.title || 'Ultimate RC Experience'}
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-white/80 font-light drop-shadow-lg max-w-xl">
            {currentBackground?.subtitle || 'Discover the joy of remote control'}
          </p>
        </div>

        {/* RC Controller Joystick */}
        <div className="mb-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={handleKnobInteraction}
            onTouchStart={handleKnobInteraction}
            className="group relative focus:outline-none"
          >
            {/* Up Arrow Indicator */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <svg 
                className="w-6 h-6 text-white/60 animate-bounce" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </div>

            {/* Joystick Base/Track */}
            <div className="relative w-20 h-36 md:w-24 md:h-40 bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 rounded-full shadow-2xl border border-zinc-600/50 overflow-hidden">
              {/* Inner track groove */}
              <div className="absolute inset-2 bg-gradient-to-b from-zinc-800 to-zinc-950 rounded-full" />
              
              {/* Track lines */}
              <div className="absolute inset-0 flex flex-col justify-around py-6 px-4">
                <div className="h-0.5 bg-zinc-600/30 rounded" />
                <div className="h-0.5 bg-zinc-600/30 rounded" />
                <div className="h-0.5 bg-zinc-600/30 rounded" />
              </div>

              {/* Knob */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 transition-all duration-150"
                style={{ 
                  bottom: `${8 + knobPosition}px`,
                }}
              >
                {/* Knob shadow */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-black/40 rounded-full blur-md" />
                
                {/* Knob body */}
                <div className={`
                  relative w-14 h-14 md:w-16 md:h-16 rounded-full cursor-pointer
                  transition-all duration-150
                  ${isPressed ? 'scale-95' : 'group-hover:scale-105'}
                `}>
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-zinc-300 via-zinc-400 to-zinc-500 shadow-xl" />
                  
                  {/* Main knob surface */}
                  <div className="absolute inset-1 rounded-full bg-gradient-to-br from-zinc-100 via-zinc-200 to-zinc-400 shadow-inner" />
                  
                  {/* Highlight */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-3 bg-white/60 rounded-full blur-sm" />
                  
                  {/* Center grip */}
                  <div className="absolute inset-3 md:inset-4 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-500 shadow-inner flex items-center justify-center">
                    {/* Grip texture - concentric circles */}
                    <div className="w-full h-full rounded-full border-2 border-zinc-400/50 flex items-center justify-center">
                      <div className="w-3/4 h-3/4 rounded-full border border-zinc-400/30 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-zinc-500" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Bottom edge highlight */}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-zinc-600/30 rounded-full" />
                </div>
              </div>
            </div>

            {/* Base plate */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-24 md:w-28 h-3 bg-gradient-to-b from-zinc-700 to-zinc-800 rounded-b-xl shadow-lg border-x border-b border-zinc-600/30" />
          </button>

          {/* Label */}
          <p className="text-center text-white/50 text-sm mt-6 font-light tracking-wider">
            SLIDE TO EXPLORE
          </p>
        </div>

        {/* Background indicators */}
        {backgrounds.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {backgrounds.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'bg-white w-6' 
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Landing;
