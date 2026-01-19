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

  const handleJoystickClick = () => {
    setIsPressed(true);
    setTimeout(() => {
      navigate('/home');
    }, 300);
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />
      </div>

      {/* Content - Centered */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
        {/* Main headline */}
        <div className="text-center space-y-4 mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white tracking-tight leading-tight drop-shadow-2xl">
            {currentBackground?.title || 'Ultimate RC Experience'}
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-white/80 font-light drop-shadow-lg max-w-xl mx-auto">
            {currentBackground?.subtitle || 'Discover the joy of remote control'}
          </p>
        </div>

        {/* Retro Arcade Joystick */}
        <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={handleJoystickClick}
            className="group relative focus:outline-none"
          >
            {/* Joystick Base - Dark rounded square */}
            <div className="relative w-36 h-36 md:w-44 md:h-44">
              {/* Base shadow */}
              <div className="absolute inset-0 translate-y-2 bg-black/50 rounded-3xl blur-xl" />
              
              {/* Main base */}
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 via-zinc-900 to-black rounded-3xl shadow-2xl">
                {/* Base inner rim */}
                <div className="absolute inset-2 rounded-2xl border border-zinc-700/50" />
                
                {/* Orange ring around joystick hole */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 shadow-lg">
                  {/* Inner dark circle (joystick hole) */}
                  <div className="absolute inset-2 rounded-full bg-gradient-to-b from-zinc-700 to-zinc-900 shadow-inner" />
                </div>
                
                {/* Yellow action buttons */}
                <div className="absolute bottom-5 right-5 flex gap-2">
                  <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-500 shadow-md border border-yellow-600/30">
                    <div className="absolute inset-1 rounded-full bg-gradient-to-b from-yellow-200/60 to-transparent" />
                  </div>
                  <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-500 shadow-md border border-yellow-600/30">
                    <div className="absolute inset-1 rounded-full bg-gradient-to-b from-yellow-200/60 to-transparent" />
                  </div>
                </div>
              </div>

              {/* Joystick Stick */}
              <div 
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 transition-all duration-200 ${
                  isPressed ? '-translate-y-[35%] scale-95' : '-translate-y-[55%] group-hover:-translate-y-[60%]'
                }`}
              >
                {/* Stick shadow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-8 h-4 bg-black/40 rounded-full blur-md" />
                
                {/* Stick shaft */}
                <div className="w-4 h-10 md:w-5 md:h-12 bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700 rounded-sm mx-auto relative">
                  {/* Shaft highlight */}
                  <div className="absolute inset-y-0 left-1 w-1 bg-zinc-500/50 rounded-full" />
                </div>
                
                {/* Red ball top */}
                <div className={`
                  relative -mt-2 w-14 h-14 md:w-16 md:h-16 mx-auto cursor-pointer
                  transition-transform duration-150
                  ${isPressed ? 'scale-90' : 'group-hover:scale-105'}
                `}>
                  {/* Ball base shadow */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-red-800 to-red-900 translate-y-1" />
                  
                  {/* Main ball */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 via-red-500 to-red-700 shadow-xl">
                    {/* Ball highlight */}
                    <div className="absolute top-2 left-3 w-6 h-4 bg-gradient-to-b from-white/50 to-transparent rounded-full blur-sm" />
                    <div className="absolute top-3 left-4 w-3 h-2 bg-white/60 rounded-full" />
                    
                    {/* Ball bottom shadow */}
                    <div className="absolute bottom-2 inset-x-3 h-3 bg-red-900/40 rounded-full blur-sm" />
                  </div>
                </div>
              </div>
            </div>
          </button>

          {/* Label */}
          <p className="text-center text-white/60 text-sm mt-8 font-medium tracking-widest uppercase">
            Tap to Enter
          </p>
        </div>

        {/* Background indicators */}
        {backgrounds.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
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
