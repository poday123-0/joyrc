import { useState, useEffect } from "react";
import { Plus, Trash2, X, Play, Upload, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface VideoShowcase {
  id: string;
  title: string | null;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  product_id: string | null;
  is_active: boolean;
  sort_order: number;
}

interface Product {
  id: string;
  name: string;
}

const VideoShowcasesTab = () => {
  const [videos, setVideos] = useState<VideoShowcase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoShowcase | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    product_id: "",
    is_active: true,
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoSource, setVideoSource] = useState<"upload" | "youtube">("upload");

  // Convert YouTube URL to embed format
  const getYoutubeEmbedUrl = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&loop=1&playlist=${match[1]}&controls=0&modestbranding=1&playsinline=1`;
      }
    }
    return null;
  };

  const isYoutubeUrl = (url: string): boolean => {
    return /(?:youtube\.com|youtu\.be)/.test(url);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [videosRes, productsRes] = await Promise.all([
      supabase.from("video_showcases").select("*").order("sort_order"),
      supabase.from("products").select("id, name").order("name"),
    ]);

    if (videosRes.data) setVideos(videosRes.data as VideoShowcase[]);
    if (productsRes.data) setProducts(productsRes.data);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", product_id: "", is_active: true });
    setVideoFile(null);
    setThumbnailFile(null);
    setYoutubeUrl("");
    setVideoSource("upload");
    setEditingVideo(null);
    setShowForm(false);
  };

  const handleEdit = (video: VideoShowcase) => {
    setEditingVideo(video);
    setFormData({
      title: video.title || "",
      description: video.description || "",
      product_id: video.product_id || "",
      is_active: video.is_active,
    });
    // Check if existing video is YouTube
    if (isYoutubeUrl(video.video_url)) {
      setVideoSource("youtube");
      setYoutubeUrl(video.video_url);
    } else {
      setVideoSource("upload");
      setYoutubeUrl("");
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (videoSource === "youtube") {
      if (!youtubeUrl.trim() && !editingVideo) {
        toast({ title: "Please enter a YouTube URL", variant: "destructive" });
        return;
      }
      const embedUrl = getYoutubeEmbedUrl(youtubeUrl);
      if (youtubeUrl.trim() && !embedUrl) {
        toast({ title: "Invalid YouTube URL", description: "Please enter a valid YouTube or Shorts link", variant: "destructive" });
        return;
      }
    } else {
      if (!editingVideo && !videoFile) {
        toast({ title: "Please select a video file", variant: "destructive" });
        return;
      }
    }

    setSaving(true);

    try {
      let videoUrl = editingVideo?.video_url || "";
      let thumbnailUrl = editingVideo?.thumbnail_url || null;

      if (videoSource === "youtube" && youtubeUrl.trim()) {
        // Use YouTube embed URL
        videoUrl = getYoutubeEmbedUrl(youtubeUrl) || youtubeUrl;
      } else if (videoSource === "upload" && videoFile) {
        // Upload video file
        const fileName = `${Date.now()}-${videoFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("videos")
          .upload(fileName, videoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("videos")
          .getPublicUrl(fileName);
        videoUrl = urlData.publicUrl;
      }

      // Upload thumbnail if provided
      if (thumbnailFile) {
        const thumbName = `thumb-${Date.now()}-${thumbnailFile.name}`;
        const { error: thumbError } = await supabase.storage
          .from("videos")
          .upload(thumbName, thumbnailFile);

        if (!thumbError) {
          const { data: thumbUrlData } = supabase.storage
            .from("videos")
            .getPublicUrl(thumbName);
          thumbnailUrl = thumbUrlData.publicUrl;
        }
      }

      const videoData = {
        title: formData.title.trim() || null,
        description: formData.description.trim() || null,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        product_id: formData.product_id || null,
        is_active: formData.is_active,
        sort_order: editingVideo?.sort_order ?? videos.length,
      };

      if (editingVideo) {
        const { error } = await supabase
          .from("video_showcases")
          .update(videoData)
          .eq("id", editingVideo.id);
        if (error) throw error;
        toast({ title: "Video Updated", description: "Showcase video has been updated." });
      } else {
        const { error } = await supabase
          .from("video_showcases")
          .insert(videoData);
        if (error) throw error;
        toast({ title: "Video Added", description: "New showcase video has been added." });
      }

      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("video_showcases").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Video Removed", description: "Showcase video has been deleted." });
      fetchData();
    }
  };

  const toggleActive = async (video: VideoShowcase) => {
    const { error } = await supabase
      .from("video_showcases")
      .update({ is_active: !video.is_active })
      .eq("id", video.id);
    
    if (!error) {
      setVideos(videos.map(v => 
        v.id === video.id ? { ...v, is_active: !v.is_active } : v
      ));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <h2 className="font-semibold text-foreground lg:text-lg">
          Video Showcases ({videos.length})
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full gradient-primary text-primary-foreground text-sm font-medium shadow-soft"
        >
          <Plus className="w-4 h-4" /> Add Video
        </button>
      </div>

      {showForm && (
        <div className="glass-card rounded-2xl p-4 md:p-6 mb-4 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">
              {editingVideo ? "Edit Video" : "Add New Video"}
            </h3>
            <button onClick={resetForm}>
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="md:grid md:grid-cols-2 md:gap-4 space-y-4 md:space-y-0">
              <input
                type="text"
                placeholder="Video title (optional)"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <select
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Link to product (optional)</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-accent resize-none h-20"
            />

            {/* Video Source Toggle */}
            <div className="flex gap-2 p-1 bg-muted rounded-xl">
              <button
                type="button"
                onClick={() => setVideoSource("upload")}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  videoSource === "upload"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setVideoSource("youtube")}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  videoSource === "youtube"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Play className="w-4 h-4 inline mr-2" />
                YouTube Link
              </button>
            </div>

            {videoSource === "youtube" ? (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  YouTube URL {!editingVideo && <span className="text-destructive">*</span>}
                </label>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or https://youtube.com/shorts/..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <p className="text-xs text-muted-foreground">
                  Supports YouTube videos and Shorts links
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Video File {!editingVideo && <span className="text-destructive">*</span>}
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="text-sm w-full"
                  />
                  {editingVideo && !videoFile && (
                    <p className="text-xs text-muted-foreground">Current video will be kept if no new file selected</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Thumbnail Image (optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                    className="text-sm w-full"
                  />
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Active (visible on homepage)</span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {saving ? "Saving..." : editingVideo ? "Update Video" : "Add Video"}
            </button>
          </form>
        </div>
      )}

      {videos.length === 0 ? (
        <div className="text-center py-12 glass-card rounded-2xl">
          <Play className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No showcase videos yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add videos to display on the homepage</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {videos.map((video) => (
            <div key={video.id} className="glass-card rounded-2xl overflow-hidden shadow-soft">
              <div className="aspect-video bg-muted relative">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title || "Video thumbnail"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={video.video_url}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Play className="w-12 h-12 text-white" />
                </div>
                {!video.is_active && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded-full">
                    Hidden
                  </div>
                )}
              </div>
              <div className="p-4">
                <h4 className="font-medium text-foreground">
                  {video.title || "Untitled Video"}
                </h4>
                {video.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {video.description}
                  </p>
                )}
                {video.product_id && (
                  <p className="text-xs text-primary mt-2 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    Links to product
                  </p>
                )}
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => toggleActive(video)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                      video.is_active
                        ? "bg-accent/20 text-accent"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {video.is_active ? "Active" : "Inactive"}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(video)}
                      className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <span className="text-sm">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(video.id)}
                      className="p-2 rounded-full bg-destructive/10 hover:bg-destructive/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoShowcasesTab;
