import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Image, Video } from "lucide-react";

interface HeroBackground {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  title: string | null;
  subtitle: string | null;
  is_active: boolean;
  sort_order: number;
}

const HeroBackgroundsTab = () => {
  const [backgrounds, setBackgrounds] = useState<HeroBackground[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newBackground, setNewBackground] = useState({
    media_url: '',
    media_type: 'image' as 'image' | 'video',
    title: '',
    subtitle: ''
  });

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
      media_type: bg.media_type as 'image' | 'video',
      is_active: bg.is_active ?? false
    })));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBackgrounds();
  }, []);

  const handleAddBackground = async () => {
    if (!newBackground.media_url) {
      toast.error("Please enter a media URL");
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Media URL</Label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={newBackground.media_url}
                onChange={(e) => setNewBackground(prev => ({ ...prev, media_url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Media Type</Label>
              <Select
                value={newBackground.media_type}
                onValueChange={(value: 'image' | 'video') => 
                  setNewBackground(prev => ({ ...prev, media_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
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
          <Button onClick={handleAddBackground}>
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
            backgrounds.map((bg, index) => (
              <div
                key={bg.id}
                className="flex items-start gap-4 p-4 border rounded-lg bg-card"
              >
                {/* Preview */}
                <div className="w-24 h-16 md:w-32 md:h-20 rounded overflow-hidden bg-muted flex-shrink-0">
                  {bg.media_type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Video className="w-8 h-8 text-muted-foreground" />
                    </div>
                  ) : (
                    <img
                      src={bg.media_url}
                      alt="Background preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center gap-2">
                    {bg.media_type === 'image' ? (
                      <Image className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Video className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground capitalize">
                      {bg.media_type}
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
                  
                  <Input
                    placeholder="Media URL"
                    value={bg.media_url}
                    onChange={(e) => handleUpdateField(bg.id, 'media_url', e.target.value)}
                    className="h-8 text-sm font-mono text-xs"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2">
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
