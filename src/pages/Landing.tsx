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
  const [isHovered, setIsHovered] = useState(false);

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
        <div className="text-center space-y-4 mb-16 animate-fade-in">
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
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="group relative focus:outline-none transform transition-transform duration-300 hover:scale-105"
          >
            {/* Glow effect on hover */}
            <div className={`absolute inset-0 rounded-3xl transition-opacity duration-500 blur-2xl ${
              isHovered ? 'opacity-60' : 'opacity-0'
            }`} style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.4) 0%, transparent 70%)' }} />

            {/* Joystick Base - Dark rounded square */}
            <div className="relative w-40 h-40 md:w-48 md:h-48">
              {/* Base shadow */}
              <div className="absolute inset-0 translate-y-3 bg-black/60 rounded-[2rem] blur-xl" />
              
              {/* Main base */}
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 rounded-[2rem] shadow-2xl border border-zinc-600/30">
                {/* Base texture */}
                <div className="absolute inset-0 rounded-[2rem] opacity-20" style={{
                  backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)',
                  backgroundSize: '8px 8px'
                }} />
                
                {/* Base inner rim */}
                <div className="absolute inset-3 rounded-[1.5rem] border border-zinc-600/40" />
                
                {/* Orange ring around joystick hole */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-b from-orange-400 via-orange-500 to-orange-700 shadow-lg p-1">
                  {/* Orange ring highlight */}
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-3 bg-orange-300/40 rounded-full blur-sm" />
                  {/* Inner dark circle (joystick hole) */}
                  <div className="w-full h-full rounded-full bg-gradient-to-b from-zinc-700 to-zinc-900 shadow-inner border border-zinc-600/50" />
                </div>
                
                {/* Yellow action buttons */}
                <div className="absolute bottom-5 right-5 flex gap-2.5">
                  <div className="relative w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600 shadow-lg">
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3 h-1.5 bg-yellow-100/70 rounded-full blur-[1px]" />
                    <div className="absolute inset-1 rounded-full border border-yellow-500/30" />
                  </div>
                  <div className="relative w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-600 shadow-lg">
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3 h-1.5 bg-yellow-100/70 rounded-full blur-[1px]" />
                    <div className="absolute inset-1 rounded-full border border-yellow-500/30" />
                  </div>
                </div>
              </div>

              {/* Joystick Stick */}
              <div 
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 transition-all duration-200 ${
                  isPressed ? '-translate-y-[30%] scale-95' : '-translate-y-[50%]'
                } ${isHovered && !isPressed ? '-translate-y-[55%]' : ''}`}
              >
                {/* Stick shadow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-10 h-5 bg-black/50 rounded-full blur-md" />
                
                {/* Stick shaft */}
                <div className="w-5 h-12 md:w-6 md:h-14 bg-gradient-to-r from-zinc-600 via-zinc-500 to-zinc-600 rounded-sm mx-auto relative shadow-lg">
                  {/* Shaft highlight */}
                  <div className="absolute inset-y-0 left-1.5 w-1 bg-zinc-400/50 rounded-full" />
                  {/* Shaft shadow */}
                  <div className="absolute inset-y-0 right-1 w-0.5 bg-zinc-700/50 rounded-full" />
                </div>
                
                {/* Red ball top */}
                <div className={`
                  relative -mt-3 w-16 h-16 md:w-20 md:h-20 mx-auto cursor-pointer
                  transition-all duration-200
                  ${isPressed ? 'scale-90' : ''}
                  ${isHovered && !isPressed ? 'scale-110' : ''}
                `}>
                  {/* Ball base shadow */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-red-900 to-red-950 translate-y-1.5 blur-sm" />
                  
                  {/* Main ball */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 via-red-500 to-red-800 shadow-2xl">
                    {/* Ball highlight - top shine */}
                    <div className="absolute top-2 left-4 w-8 h-5 bg-gradient-to-b from-white/50 to-transparent rounded-full blur-sm transform -rotate-12" />
                    <div className="absolute top-3 left-5 w-4 h-2.5 bg-white/70 rounded-full" />
                    
                    {/* Ball secondary highlight */}
                    <div className="absolute top-6 right-4 w-3 h-2 bg-red-300/30 rounded-full blur-sm" />
                    
                    {/* Ball bottom shadow */}
                    <div className="absolute bottom-3 inset-x-4 h-4 bg-red-950/30 rounded-full blur-md" />
                    
                    {/* Ball rim */}
                    <div className="absolute inset-1 rounded-full border border-red-400/20" />
                  </div>
                </div>
              </div>
            </div>

            {/* Pulsing ring animation */}
            <div className={`absolute inset-0 rounded-[2rem] border-2 border-white/20 transition-all duration-1000 ${
              isHovered ? 'scale-110 opacity-0' : 'scale-100 opacity-100'
            }`} style={{ animation: 'pulse 2s infinite' }} />
          </button>
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
