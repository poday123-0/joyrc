import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VideoShowcaseData {
  id: string;
  title: string | null;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  product_id: string | null;
}

// Check if URL is a YouTube embed
const isYoutubeEmbed = (url: string): boolean => {
  return url.includes('youtube.com/embed/');
};

// Preload video metadata for smoother transitions (only for non-YouTube)
const preloadVideoMetadata = (url: string): Promise<void> => {
  if (isYoutubeEmbed(url)) return Promise.resolve();
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => resolve();
    video.onerror = () => resolve();
    video.src = url;
  });
};

const VideoTitleButton = memo(({ 
  video, 
  isActive, 
  onClick 
}: { 
  video: VideoShowcaseData; 
  isActive: boolean; 
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`block text-left w-full max-w-md transition-all duration-300 ${
      isActive 
        ? 'opacity-100' 
        : 'opacity-40 hover:opacity-60'
    }`}
  >
    <p className={`transition-all duration-300 truncate ${
      isActive 
        ? 'text-[10px] sm:text-xs text-primary font-medium' 
        : 'text-[9px] sm:text-[10px] text-white/60'
    }`}>
      {video.description || ''}
    </p>
    <p className={`transition-all duration-300 truncate ${
      isActive 
        ? 'text-sm sm:text-base lg:text-lg font-bold text-white' 
        : 'text-xs sm:text-sm font-medium text-white/70'
    }`}>
      {video.title || 'Featured Video'}
    </p>
  </button>
));

VideoTitleButton.displayName = 'VideoTitleButton';

const VideoShowcase = () => {
  const [videos, setVideos] = useState<VideoShowcaseData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();

  const currentVideo = videos[currentIndex];
  const isCurrentYoutube = currentVideo ? isYoutubeEmbed(currentVideo.video_url) : false;

  useEffect(() => {
    const fetchVideos = async () => {
      const { data } = await supabase
        .from("video_showcases")
        .select("id, title, description, video_url, thumbnail_url, product_id")
        .eq("is_active", true)
        .order("sort_order");

      if (data && data.length > 0) {
        setVideos(data as VideoShowcaseData[]);
        
        // Preload first video and next video metadata
        if (data[0]?.video_url) {
          preloadVideoMetadata(data[0].video_url);
        }
        if (data[1]?.video_url) {
          preloadVideoMetadata(data[1].video_url);
        }
      }
      setLoading(false);
    };

    fetchVideos();
  }, []);
  // Get YouTube URL with mute parameter
  const getYoutubeUrlWithMute = (url: string, muted: boolean): string => {
    const baseUrl = url.split('?')[0];
    const videoId = baseUrl.split('/').pop();
    return `${baseUrl}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${videoId}&controls=0&modestbranding=1&playsinline=1&rel=0&showinfo=0`;
  };

  const handlePlayPause = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isCurrentYoutube) return; // YouTube handles its own playback
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, isCurrentYoutube]);

  const handleMuteToggle = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (!isCurrentYoutube && videoRef.current) {
      videoRef.current.muted = newMutedState;
    }
    // For YouTube, we'll update the iframe src which triggers reload with new mute state
  }, [isMuted, isCurrentYoutube]);

  const handleVideoClick = useCallback(() => {
    if (currentVideo?.product_id) {
      navigate(`/product/${currentVideo.product_id}`);
    } else {
      handlePlayPause();
    }
  }, [currentVideo, handlePlayPause, navigate]);

  const transitionToNext = useCallback(() => {
    setIsTransitioning(true);
    setVideoReady(false);
    
    const nextIndex = currentIndex === videos.length - 1 ? 0 : currentIndex + 1;
    
    // Preload the video after next
    const afterNextIndex = nextIndex === videos.length - 1 ? 0 : nextIndex + 1;
    if (videos[afterNextIndex]?.video_url) {
      preloadVideoMetadata(videos[afterNextIndex].video_url);
    }
    
    setTimeout(() => {
      setCurrentIndex(nextIndex);
      setIsTransitioning(false);
    }, 400);
  }, [currentIndex, videos]);

  const handleVideoEnd = useCallback(() => {
    if (videos.length > 1) {
      transitionToNext();
    }
  }, [videos.length, transitionToNext]);

  const goToVideo = useCallback((index: number) => {
    if (index === currentIndex) return;
    setIsTransitioning(true);
    setVideoReady(false);
    
    // Preload target video
    if (videos[index]?.video_url) {
      preloadVideoMetadata(videos[index].video_url);
    }
    
    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, 300);
  }, [currentIndex, videos]);

  // Auto-play video when component mounts or video changes (only for non-YouTube)
  useEffect(() => {
    if (isCurrentYoutube) {
      // YouTube videos auto-play via iframe params
      setVideoReady(true);
      setIsPlaying(true);
      return;
    }
    
    if (videoRef.current && videos.length > 0) {
      const video = videoRef.current;
      video.load();
      video.muted = isMuted;
      
      const playVideo = () => {
        video.play().then(() => {
          setIsPlaying(true);
          setVideoReady(true);
        }).catch(() => {
          setIsPlaying(false);
          setVideoReady(true);
        });
      };

      // Wait for enough data before playing
      if (video.readyState >= 3) {
        playVideo();
      } else {
        video.addEventListener('canplay', playVideo, { once: true });
      }
    }
  }, [currentIndex, videos.length, isCurrentYoutube]);

  if (loading) {
    return (
      <div className="w-full h-[60vh] md:h-[70vh] lg:h-[75vh] bg-foreground/5 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-muted-foreground/20 border-t-foreground/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full h-[60vh] md:h-[70vh] lg:h-[75vh] bg-foreground overflow-hidden">
      {/* Thumbnail as immediate placeholder */}
      {currentVideo?.thumbnail_url && !videoReady && (
        <img
          src={currentVideo.thumbnail_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
      )}
      
      {/* Full-width Video or YouTube iframe */}
      {isCurrentYoutube ? (
        <div 
          className={`absolute inset-0 transition-opacity duration-400 ${
            isTransitioning || !videoReady ? 'opacity-0' : 'opacity-100'
          }`}
          onClick={handleVideoClick}
        >
          <iframe
            ref={iframeRef}
            src={getYoutubeUrlWithMute(currentVideo.video_url, isMuted)}
            className="absolute inset-0 w-[300%] h-[300%] -top-[100%] -left-[100%] pointer-events-none"
            style={{ transform: 'scale(0.5)', transformOrigin: 'center center' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => setVideoReady(true)}
          />
        </div>
      ) : (
        <video
          ref={videoRef}
          src={currentVideo?.video_url}
          poster={currentVideo?.thumbnail_url || undefined}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-400 ${
            isTransitioning || !videoReady ? 'opacity-0' : 'opacity-100'
          }`}
          muted={isMuted}
          playsInline
          preload="auto"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleVideoEnd}
          onCanPlay={() => setVideoReady(true)}
          onClick={handleVideoClick}
        />
      )}

      {/* Gradient overlay - stronger at bottom for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

      {/* Bottom content - All titles with current in middle */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 lg:pb-10">
          <div className="space-y-0">
            {videos.map((video, index) => {
              const isActive = index === currentIndex;
              
              return (
                <div 
                  key={video.id} 
                  className={`transition-all duration-500 ease-out ${
                    isActive ? 'pointer-events-none' : 'pointer-events-auto'
                  }`}
                  style={{
                    transform: isActive ? 'translateY(0)' : 'translateY(0)',
                    opacity: isTransitioning ? 0 : 1,
                    transitionDelay: `${index * 30}ms`
                  }}
                >
                  {isActive ? (
                    <div className="py-1.5 transition-all duration-500 ease-out animate-fade-in">
                      <p className="text-[10px] sm:text-xs text-primary font-medium truncate max-w-md transition-all duration-300">
                        {video.description || ''}
                      </p>
                      <p className="text-sm sm:text-base lg:text-lg font-bold text-white truncate max-w-md transition-all duration-300">
                        {video.title || 'Featured Video'}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => goToVideo(index)}
                      className="block text-left w-full max-w-md py-0.5 transition-all duration-300 opacity-40 hover:opacity-70"
                    >
                      <p className="text-[9px] sm:text-[10px] text-white/60 truncate leading-tight">
                        {video.description || ''}
                      </p>
                      <p className="text-xs sm:text-sm font-medium text-white/70 truncate leading-tight">
                        {video.title || 'Featured Video'}
                      </p>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Video indicators and mute button - bottom right */}
      <div className={`absolute bottom-4 sm:bottom-6 right-4 sm:right-6 lg:right-8 flex items-center gap-3 transition-opacity duration-300 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}>
        {/* Mute/Unmute button */}
        <button
          onClick={handleMuteToggle}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/20 hover:bg-black/50 transition-all duration-200"
          aria-label={isMuted ? "Unmute video" : "Mute video"}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-white" />
          ) : (
            <Volume2 className="w-4 h-4 text-white" />
          )}
        </button>
        
        {/* Video indicators */}
        {videos.length > 1 && (
          <div className="flex items-center gap-1.5">
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
      </div>

      {/* Center play button when paused (only for non-YouTube videos) */}
      {!isCurrentYoutube && !isPlaying && videoReady && (
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
