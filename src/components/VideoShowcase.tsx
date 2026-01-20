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
  const nextVideo = videos[(currentIndex + 1) % videos.length];

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
      <div className="w-full h-[45vh] sm:h-[50vh] lg:h-[60vh] bg-foreground/5 animate-pulse flex items-center justify-center">
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
      className="relative w-full h-[45vh] sm:h-[50vh] lg:h-[60vh] bg-foreground overflow-hidden"
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

      {/* Gradient overlays for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent pointer-events-none" />

      {/* Content overlay with vertical scrolling titles */}
      <div className="absolute inset-0 flex items-end pointer-events-none">
        <div className="w-full p-4 sm:p-6 lg:p-10 xl:p-16 pb-20 sm:pb-24">
          <div className="max-w-4xl">
            {/* Animated title section - DJI style vertical scroll */}
            <div className="relative h-24 sm:h-32 lg:h-40 overflow-hidden mb-4">
              {videos.map((video, index) => (
                <div
                  key={video.id}
                  className={`absolute inset-0 flex flex-col justify-end transition-all duration-700 ease-out ${
                    index === currentIndex 
                      ? 'opacity-100 translate-y-0' 
                      : index < currentIndex 
                        ? 'opacity-0 -translate-y-full' 
                        : 'opacity-0 translate-y-full'
                  }`}
                >
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white tracking-tight leading-tight">
                    {video.title || 'Featured Video'}
                  </h2>
                  {video.description && (
                    <p className="text-sm sm:text-base lg:text-lg text-white/70 mt-2 max-w-xl line-clamp-2">
                      {video.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
            
            {/* CTA Button */}
            {currentVideo?.product_id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/product/${currentVideo.product_id}`);
                }}
                className={`pointer-events-auto inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white text-foreground text-sm sm:text-base font-semibold rounded-full hover:bg-white/90 hover:scale-105 active:scale-95 transition-all duration-200 group ${
                  isTransitioning ? 'opacity-0' : 'opacity-100'
                }`}
              >
                <span>Learn More</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Vertical video list indicator (DJI style) */}
      {videos.length > 1 && (
        <div className="absolute right-4 sm:right-6 lg:right-10 top-1/2 -translate-y-1/2 flex flex-col gap-3 sm:gap-4">
          {videos.map((video, index) => (
            <button
              key={video.id}
              onClick={() => goToVideo(index)}
              className={`group relative flex items-center transition-all duration-300 ${
                index === currentIndex ? 'opacity-100' : 'opacity-50 hover:opacity-80'
              }`}
            >
              {/* Progress indicator for current video */}
              <div className={`w-0.5 sm:w-1 h-8 sm:h-12 rounded-full overflow-hidden transition-all ${
                index === currentIndex ? 'bg-white/30' : 'bg-white/20'
              }`}>
                {index === currentIndex && (
                  <div 
                    className="w-full bg-white transition-all duration-100 rounded-full"
                    style={{ height: `${progress}%` }}
                  />
                )}
              </div>
              
              {/* Title tooltip on hover */}
              <div className={`absolute right-4 sm:right-6 whitespace-nowrap px-3 py-1.5 bg-white/90 backdrop-blur-sm text-foreground text-xs sm:text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
                index === currentIndex ? 'opacity-100' : ''
              }`}>
                {video.title || `Video ${index + 1}`}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Bottom controls bar */}
      <div 
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress bar */}
        <div className="h-1 bg-white/20 w-full cursor-pointer" onClick={(e) => {
          if (videoRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            videoRef.current.currentTime = pos * videoRef.current.duration;
          }
        }}>
          <div 
            className="h-full bg-white transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-3 sm:py-4 bg-gradient-to-t from-black/70 to-transparent">
          {/* Left controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Play/Pause button */}
            <button
              onClick={handlePlayPause}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/25 active:scale-95 transition-all"
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
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/25 active:scale-95 transition-all"
            >
              {isMuted ? <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" /> : <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>

            {/* Next video preview */}
            {videos.length > 1 && nextVideo && (
              <div className="hidden sm:flex items-center gap-2 ml-4 text-white/70">
                <span className="text-xs uppercase tracking-wider">Next</span>
                <span className="text-sm font-medium text-white">{nextVideo.title}</span>
              </div>
            )}
          </div>

          {/* Right - Dot indicators for mobile */}
          <div className="flex sm:hidden items-center gap-1.5">
            {videos.map((_, index) => (
              <button
                key={index}
                onClick={() => goToVideo(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentIndex
                    ? "w-6 h-2 bg-white"
                    : "w-2 h-2 bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
        <div className="animate-bounce">
          <ChevronDown className="w-6 h-6 text-white/60" />
        </div>
      </div>

      {/* Center play button when paused */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={handlePlayPause}
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 hover:bg-white/30 hover:scale-110 active:scale-95 transition-all duration-200">
            <Play className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoShowcase;
