import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, Volume2, VolumeX, ChevronRight, ChevronDown } from "lucide-react";
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
      setCurrentIndex((prev) => (prev === videos.length - 1 ? 0 : prev + 1));
    }
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
      <div className="w-full h-[50vh] sm:h-[60vh] lg:h-[70vh] bg-foreground/5 animate-pulse flex items-center justify-center">
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
      className="relative w-full h-[50vh] sm:h-[60vh] lg:h-[70vh] bg-foreground overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Full-screen Video */}
      <video
        ref={videoRef}
        src={currentVideo?.video_url}
        poster={currentVideo?.thumbnail_url || undefined}
        className="absolute inset-0 w-full h-full object-cover"
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

      {/* Gradient overlays for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent pointer-events-none" />

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 lg:p-12 pointer-events-none">
        {/* Video info - DJI style */}
        <div className="max-w-xl space-y-2 sm:space-y-3 mb-16 sm:mb-20">
          {currentVideo?.title && (
            <h2 className="text-xl sm:text-2xl lg:text-4xl xl:text-5xl font-bold text-white tracking-tight leading-tight">
              {currentVideo.title}
            </h2>
          )}
          {currentVideo?.description && (
            <p className="text-sm sm:text-base lg:text-lg text-white/80 max-w-md line-clamp-2">
              {currentVideo.description}
            </p>
          )}
          
          {/* CTA Button - DJI style */}
          {currentVideo?.product_id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/product/${currentVideo.product_id}`);
              }}
              className="pointer-events-auto inline-flex items-center gap-1.5 mt-2 sm:mt-3 px-4 sm:px-5 py-2 sm:py-2.5 bg-white text-foreground text-sm sm:text-base font-semibold rounded-full hover:bg-white/90 transition-all group"
            >
              <span>Learn More</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
        <span className="text-white/60 text-xs uppercase tracking-widest hidden sm:block">Scroll</span>
        <div className="animate-bounce">
          <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-white/70" />
        </div>
      </div>

      {/* Bottom controls bar - DJI style minimal */}
      <div 
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress bar */}
        <div className="h-0.5 sm:h-1 bg-white/20 w-full">
          <div 
            className="h-full bg-white transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-3 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gradient-to-t from-black/60 to-transparent">
          {/* Left controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Play/Pause button */}
            <button
              onClick={handlePlayPause}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
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
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>

          {/* Right - Video indicators */}
          {videos.length > 1 && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {videos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentIndex
                      ? "w-5 sm:w-8 h-1.5 sm:h-2 bg-white"
                      : "w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/40 hover:bg-white/60"
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
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 hover:bg-white/30 transition-colors">
            <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoShowcase;
