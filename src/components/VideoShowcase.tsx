import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Volume2, VolumeX, ChevronLeft, ChevronRight } from "lucide-react";
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
  const videoRef = useRef<HTMLVideoElement>(null);
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

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVideoClick = () => {
    if (isPlaying && currentVideo?.product_id) {
      navigate(`/product/${currentVideo.product_id}`);
    } else {
      handlePlayPause();
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? videos.length - 1 : prev - 1));
    setIsPlaying(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === videos.length - 1 ? 0 : prev + 1));
    setIsPlaying(false);
  };

  // Auto-play video when component mounts or video changes
  useEffect(() => {
    if (videoRef.current && videos.length > 0) {
      videoRef.current.load();
      // Auto-play muted (required by browsers)
      videoRef.current.muted = true;
      setIsMuted(true);
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Autoplay was prevented, show play button
        setIsPlaying(false);
      });
    }
  }, [currentIndex, videos.length]);

  if (loading) {
    return (
      <div className="w-full aspect-video max-w-lg mx-auto rounded-3xl bg-muted animate-pulse" />
    );
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="relative rounded-3xl overflow-hidden shadow-elevated bg-foreground/5">
        {/* Video Container */}
        <div 
          className="aspect-video relative cursor-pointer group"
          onClick={handleVideoClick}
        >
          <video
            ref={videoRef}
            src={currentVideo?.video_url}
            poster={currentVideo?.thumbnail_url || undefined}
            className="w-full h-full object-cover"
            muted={isMuted}
            playsInline
            autoPlay
            loop
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Play overlay - show when not playing */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity">
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="w-7 h-7 text-foreground ml-1" />
              </div>
            </div>
          )}

          {/* Product link indicator - show when playing */}
          {isPlaying && currentVideo?.product_id && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-sm font-medium text-foreground">
                Tap to view product →
              </p>
            </div>
          )}

          {/* Video info */}
          {(currentVideo?.title || currentVideo?.description) && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
              {currentVideo.title && (
                <h3 className="font-semibold text-white text-lg">
                  {currentVideo.title}
                </h3>
              )}
              {currentVideo.description && (
                <p className="text-white/80 text-sm mt-1 line-clamp-2">
                  {currentVideo.description}
                </p>
              )}
            </div>
          )}

          {/* Mute toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation arrows - only show if multiple videos */}
        {videos.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </>
        )}
      </div>

      {/* Dots indicator */}
      {videos.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {videos.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-foreground w-6"
                  : "bg-muted-foreground/40 w-2 hover:bg-muted-foreground/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoShowcase;
