import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, Volume2, VolumeX, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VideoShowcase {
  id: string;
  title: string | null;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  product_id: string | null;
}

const VideoShowcase = () => {
  const [videos, setVideos] = useState<VideoShowcase[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVideos = async () => {
      const { data } = await supabase
        .from("video_showcases")
        .select("id, title, description, video_url, thumbnail_url, product_id")
        .eq("is_active", true)
        .order("sort_order");

      if (data && data.length > 0) {
        setVideos(data as VideoShowcase[]);
      }
      setLoading(false);
    };

    fetchVideos();
  }, []);

  const currentVideo = videos[currentIndex];

  const handlePlayPause = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVideoClick = () => {
    if (currentVideo?.product_id) {
      navigate(`/product/${currentVideo.product_id}`);
    } else {
      handlePlayPause();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      setShowControls(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(currentProgress);
    }
  };

  const handleVideoEnd = () => {
    if (videos.length > 1) {
      transitionToNext();
    }
  };

  const transitionToNext = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev === videos.length - 1 ? 0 : prev + 1));
      setIsTransitioning(false);
    }, 500);
  };

  const goToVideo = (index: number) => {
    if (index === currentIndex) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, 300);
  };

  // Auto-play video when component mounts or video changes
  useEffect(() => {
    if (videoRef.current && videos.length > 0) {
      videoRef.current.load();
      videoRef.current.muted = true;
      setIsMuted(true);
      setProgress(0);
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  }, [currentIndex, videos.length]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[45vh] sm:h-[50vh] lg:h-[55vh] bg-foreground/5 animate-pulse flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-muted-foreground/20 border-t-foreground/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[45vh] sm:h-[50vh] lg:h-[55vh] bg-foreground overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Full-width Video */}
      <video
        ref={videoRef}
        src={currentVideo?.video_url}
        poster={currentVideo?.thumbnail_url || undefined}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
        muted
        playsInline
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleVideoEnd}
        onCanPlay={() => {
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
        }}
        onClick={handleVideoClick}
      />

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

      {/* Bottom content bar with vertical scrolling titles */}
      <div className={`absolute bottom-0 left-0 right-0 pointer-events-none transition-opacity duration-300 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}>
        {/* Content area */}
        <div className="flex items-end justify-between px-4 sm:px-6 lg:px-8 pb-14 sm:pb-16">
          {/* Left - Clean vertical scrolling titles */}
          <div className="flex-1 max-w-md space-y-1">
            {/* Previous title */}
            <div className="h-5 overflow-hidden">
              <p 
                className="text-xs sm:text-sm text-white/30 truncate transition-all duration-500"
                style={{ 
                  transform: `translateY(${currentIndex === 0 ? '100%' : '0'})`,
                  opacity: currentIndex === 0 ? 0 : 1 
                }}
              >
                {videos[currentIndex - 1]?.title || ''}
              </p>
            </div>
            
            {/* Current title + description */}
            <div className="space-y-0.5">
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-white truncate">
                {currentVideo?.title || 'Featured Video'}
              </h3>
              {currentVideo?.description && (
                <p className="text-xs sm:text-sm text-white/60 line-clamp-1">
                  {currentVideo.description}
                </p>
              )}
            </div>
            
            {/* Next title */}
            <div className="h-5 overflow-hidden">
              <p 
                className="text-xs sm:text-sm text-white/30 truncate transition-all duration-500"
                style={{ 
                  transform: `translateY(${currentIndex === videos.length - 1 ? '-100%' : '0'})`,
                  opacity: currentIndex === videos.length - 1 ? 0 : 1 
                }}
              >
                {videos[currentIndex + 1]?.title || ''}
              </p>
            </div>
          </div>

          {/* Right - Learn More button */}
          {currentVideo?.product_id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/product/${currentVideo.product_id}`);
              }}
              className="pointer-events-auto flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium rounded-full hover:bg-white hover:text-foreground active:scale-95 transition-all duration-300 group"
            >
              <span className="hidden sm:inline">Learn More</span>
              <span className="sm:hidden">View</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-white/20 w-full">
          <div 
            className="h-full bg-white transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Controls bar - hidden during transition */}
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 bg-black/40 backdrop-blur-sm">
          {/* Left controls */}
          <div className="flex items-center gap-2">
            {/* Play/Pause button */}
            <button
              onClick={handlePlayPause}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </button>

            {/* Mute toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newMuted = !isMuted;
                setIsMuted(newMuted);
                if (videoRef.current) {
                  videoRef.current.muted = newMuted;
                }
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Right - Video indicators */}
          {videos.length > 1 && (
            <div className="flex items-center gap-1.5">
              {videos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToVideo(index)}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentIndex
                      ? "w-5 sm:w-6 h-1.5 bg-white"
                      : "w-1.5 h-1.5 bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center play button when paused */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={handlePlayPause}
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 hover:bg-white/30 hover:scale-110 active:scale-95 transition-all duration-200">
            <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoShowcase;
