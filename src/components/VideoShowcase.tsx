import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, Volume2, VolumeX, ChevronRight } from "lucide-react";
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
      <div className="w-full h-[70vh] sm:h-[80vh] bg-foreground/5 animate-pulse flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-muted-foreground/20 border-t-foreground/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[70vh] sm:h-[80vh] bg-foreground overflow-hidden"
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
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 lg:p-16 pointer-events-none">
        {/* Video info - DJI style */}
        <div className="max-w-2xl space-y-4 mb-8 sm:mb-12">
          {currentVideo?.title && (
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white tracking-tight leading-tight">
              {currentVideo.title}
            </h2>
          )}
          {currentVideo?.description && (
            <p className="text-base sm:text-lg lg:text-xl text-white/80 max-w-xl line-clamp-2">
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
              className="pointer-events-auto inline-flex items-center gap-2 mt-4 px-6 py-3 bg-white text-foreground font-semibold rounded-full hover:bg-white/90 transition-all group"
            >
              <span>Learn More</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom controls bar - DJI style minimal */}
      <div 
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress bar */}
        <div className="h-1 bg-white/20 w-full">
          <div 
            className="h-full bg-white transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-3 bg-gradient-to-t from-black/60 to-transparent">
          {/* Left controls */}
          <div className="flex items-center gap-3">
            {/* Play/Pause button */}
            <button
              onClick={handlePlayPause}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />
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
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" /> : <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>

          {/* Right - Video indicators */}
          {videos.length > 1 && (
            <div className="flex items-center gap-2">
              {videos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentIndex
                      ? "w-8 h-2 bg-white"
                      : "w-2 h-2 bg-white/40 hover:bg-white/60"
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
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 hover:bg-white/30 transition-colors">
            <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoShowcase;
