import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  }, [currentIndex, videos.length]);

  if (loading) {
    return (
      <div className="w-full h-[60vh] md:h-[70vh] lg:h-[75vh] bg-foreground/5 animate-pulse flex items-center justify-center">
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
      className="relative w-full h-[60vh] md:h-[70vh] lg:h-[75vh] bg-foreground overflow-hidden"
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
        onEnded={handleVideoEnd}
        onCanPlay={() => {
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
        }}
        onClick={handleVideoClick}
      />

      {/* Gradient overlay - stronger at bottom for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

      {/* Bottom content - Stacked titles like reference */}
      <div className={`absolute bottom-0 left-0 right-0 pointer-events-none transition-opacity duration-300 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}>
        <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 lg:pb-10">
          {/* Stacked product titles - vertical list */}
          <div className="space-y-0.5 sm:space-y-1">
            {videos.map((video, index) => {
              const isActive = index === currentIndex;
              const isPrev = index < currentIndex;
              
              return (
                <button
                  key={video.id}
                  onClick={() => goToVideo(index)}
                  className={`pointer-events-auto block text-left w-full max-w-md transition-all duration-300 ${
                    isActive 
                      ? 'opacity-100' 
                      : 'opacity-40 hover:opacity-60'
                  }`}
                >
                  {/* Description/speed line */}
                  <p className={`transition-all duration-300 truncate ${
                    isActive 
                      ? 'text-xs sm:text-sm text-primary font-medium' 
                      : 'text-[10px] sm:text-xs text-white/60'
                  }`}>
                    {video.description || ''}
                  </p>
                  {/* Title line */}
                  <p className={`transition-all duration-300 truncate ${
                    isActive 
                      ? 'text-base sm:text-lg lg:text-xl font-bold text-white' 
                      : 'text-sm sm:text-base font-medium text-white/70'
                  }`}>
                    {video.title || 'Featured Video'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Video indicators - bottom right */}
      {videos.length > 1 && (
        <div className={`absolute bottom-4 sm:bottom-6 right-4 sm:right-6 lg:right-8 flex items-center gap-1.5 transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}>
          {videos.map((_, index) => (
            <button
              key={index}
              onClick={() => goToVideo(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentIndex
                  ? "w-6 sm:w-8 h-1.5 sm:h-2 bg-white"
                  : "w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}

      {/* Center play button when paused */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={handlePlayPause}
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 hover:bg-white/30 hover:scale-110 active:scale-95 transition-all duration-200">
            <Play className="w-7 h-7 sm:w-8 sm:h-8 text-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoShowcase;
