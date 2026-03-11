import { useState, useEffect, useRef } from "react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Image, Video, Upload, Loader2, Youtube } from "lucide-react";

interface HeroBackground {
  id: string;
  media_url: string;
  media_type: 'image' | 'video' | 'youtube';
  title: string | null;
  subtitle: string | null;
  is_active: boolean;
  sort_order: number;
}

// Check if URL is a YouTube link
const isYouTubeUrl = (url: string): boolean => {
  return /(?:youtube\.com|youtu\.be)/.test(url);
};

// Extract YouTube video ID
const getYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const HeroBackgroundsTab = () => {
  const [backgrounds, setBackgrounds] = useState<HeroBackground[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newBackground, setNewBackground] = useState({
    media_url: '',
    media_type: 'image' as 'image' | 'video' | 'youtube',
    title: '',
    subtitle: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect YouTube URLs
  const handleUrlChange = (url: string) => {
    const isYT = isYouTubeUrl(url);
    setNewBackground(prev => ({
      ...prev,
      media_url: url,
      media_type: isYT ? 'youtube' : prev.media_type
    }));
  };

  const fetchBackgrounds = async () => {
    const { data, error } = await supabase
      .from('hero_backgrounds')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      toast.error("Failed to fetch backgrounds");
      return;
    }
    setBackgrounds((data || []).map(bg => ({
      ...bg,
      media_type: bg.media_type as 'image' | 'video' | 'youtube',
      is_active: bg.is_active ?? false
    })));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBackgrounds();
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    setUploading(true);
    try {
      const isVideo = file.type.startsWith('video/');
      const fileName = `hero-${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      setNewBackground(prev => ({
        ...prev,
        media_url: urlData.publicUrl,
        media_type: isVideo ? 'video' : 'image'
      }));

      toast.success("File uploaded successfully");
    } catch (error: any) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddBackground = async () => {
    if (!newBackground.media_url) {
      toast.error("Please upload a file or enter a media URL");
      return;
    }

    const { error } = await supabase
      .from('hero_backgrounds')
      .insert({
        media_url: newBackground.media_url,
        media_type: newBackground.media_type,
        title: newBackground.title || null,
        subtitle: newBackground.subtitle || null,
        sort_order: backgrounds.length
      });

    if (error) {
      toast.error("Failed to add background");
      return;
    }

    toast.success("Background added successfully");
    setNewBackground({ media_url: '', media_type: 'image', title: '', subtitle: '' });
    fetchBackgrounds();
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('hero_backgrounds')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) {
      toast.error("Failed to update background");
      return;
    }

    setBackgrounds(prev => 
      prev.map(bg => bg.id === id ? { ...bg, is_active: isActive } : bg)
    );
    toast.success("Background updated");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('hero_backgrounds')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Failed to delete background");
      return;
    }

    toast.success("Background deleted");
    fetchBackgrounds();
  };

  const handleUpdateField = async (id: string, field: string, value: string) => {
    const { error } = await supabase
      .from('hero_backgrounds')
      .update({ [field]: value || null })
      .eq('id', id);

    if (error) {
      toast.error("Failed to update");
      return;
    }

    setBackgrounds(prev =>
      prev.map(bg => bg.id === id ? { ...bg, [field]: value } : bg)
    );
  };

  const handleReplaceMedia = async (id: string, file: File) => {
    setUploading(true);
    try {
      const isVideo = file.type.startsWith('video/');
      const fileName = `hero-${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      const { error } = await supabase
        .from('hero_backgrounds')
        .update({ 
          media_url: urlData.publicUrl,
          media_type: isVideo ? 'video' : 'image'
        })
        .eq('id', id);

      if (error) throw error;

      setBackgrounds(prev =>
        prev.map(bg => bg.id === id ? { 
          ...bg, 
          media_url: urlData.publicUrl,
          media_type: isVideo ? 'video' : 'image'
        } : bg)
      );

      toast.success("Media replaced successfully");
    } catch (error: any) {
      toast.error("Replace failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add New Background */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Background
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload Section */}
          <div className="space-y-2">
            <Label>Upload Image or Video</Label>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {uploading ? "Uploading..." : "Choose File"}
              </Button>
            </div>
            {newBackground.media_url && (
              <div className="mt-2 p-2 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground truncate">
                  ✓ {newBackground.media_type === 'video' ? 'Video' : 'Image'} ready
                </p>
              </div>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or enter URL</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Media URL or YouTube Link</Label>
              <Input
                placeholder="https://youtube.com/watch?v=... or image URL"
                value={newBackground.media_url}
                onChange={(e) => handleUrlChange(e.target.value)}
              />
              {newBackground.media_type === 'youtube' && (
                <p className="text-xs text-primary flex items-center gap-1">
                  <Youtube className="w-3 h-3" /> YouTube video detected
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Media Type</Label>
              <Select
                value={newBackground.media_type}
                onValueChange={(value: 'image' | 'video' | 'youtube') => 
                  setNewBackground(prev => ({ ...prev, media_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video (Upload)</SelectItem>
                  <SelectItem value="youtube">YouTube Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title (optional)</Label>
              <Input
                placeholder="Ultimate RC Experience"
                value={newBackground.title}
                onChange={(e) => setNewBackground(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle (optional)</Label>
              <Input
                placeholder="Discover the joy of remote control"
                value={newBackground.subtitle}
                onChange={(e) => setNewBackground(prev => ({ ...prev, subtitle: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={handleAddBackground} disabled={uploading}>
            <Plus className="w-4 h-4 mr-2" />
            Add Background
          </Button>
        </CardContent>
      </Card>

      {/* Existing Backgrounds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Hero Backgrounds ({backgrounds.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {backgrounds.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No backgrounds added yet
            </p>
          ) : (
            backgrounds.map((bg) => (
              <div
                key={bg.id}
                className="flex flex-col md:flex-row items-start gap-4 p-4 border rounded-lg bg-card"
              >
                {/* Preview with replace option */}
                <div className="relative w-full md:w-32 h-24 rounded overflow-hidden bg-muted flex-shrink-0 group">
                  {bg.media_type === 'youtube' ? (
                    (() => {
                      const videoId = getYouTubeVideoId(bg.media_url);
                      return videoId ? (
                        <img
                          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                          alt="YouTube thumbnail"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Youtube className="w-8 h-8 text-red-500" />
                        </div>
                      );
                    })()
                  ) : bg.media_type === 'video' ? (
                    <video
                      src={bg.media_url}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={bg.media_url}
                      alt="Background preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Replace overlay - only for non-youtube */}
                  {bg.media_type !== 'youtube' && (
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleReplaceMedia(bg.id, file);
                        }}
                      />
                      <Upload className="w-6 h-6 text-white" />
                    </label>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 space-y-2 min-w-0 w-full">
                  <div className="flex items-center gap-2">
                    {bg.media_type === 'youtube' ? (
                      <Youtube className="w-4 h-4 text-red-500" />
                    ) : bg.media_type === 'image' ? (
                      <Image className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Video className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground capitalize">
                      {bg.media_type === 'youtube' ? 'YouTube' : bg.media_type}
                    </span>
                  </div>
                  
                  <Input
                    placeholder="Title"
                    value={bg.title || ''}
                    onChange={(e) => handleUpdateField(bg.id, 'title', e.target.value)}
                    className="h-8 text-sm"
                  />
                  
                  <Input
                    placeholder="Subtitle"
                    value={bg.subtitle || ''}
                    onChange={(e) => handleUpdateField(bg.id, 'subtitle', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="flex md:flex-col items-center gap-2 w-full md:w-auto justify-between md:justify-start">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Active</Label>
                    <Switch
                      checked={bg.is_active}
                      onCheckedChange={(checked) => handleToggleActive(bg.id, checked)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(bg.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HeroBackgroundsTab;
