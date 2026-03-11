import { useState, useEffect } from "react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Save, Type, Layout } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface HomeContent {
  id: string;
  hero_title: string | null;
  hero_subtitle: string | null;
  feature_1_icon: string | null;
  feature_1_title: string | null;
  feature_1_description: string | null;
  feature_2_icon: string | null;
  feature_2_title: string | null;
  feature_2_description: string | null;
  feature_3_icon: string | null;
  feature_3_title: string | null;
  feature_3_description: string | null;
  cta_title: string | null;
  cta_subtitle: string | null;
  cta_button_text: string | null;
}

const HomeContentTab = () => {
  const [content, setContent] = useState<HomeContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    const { data, error } = await supabase
      .from("system_settings")
      .select(`
        id,
        hero_title,
        hero_subtitle,
        feature_1_icon,
        feature_1_title,
        feature_1_description,
        feature_2_icon,
        feature_2_title,
        feature_2_description,
        feature_3_icon,
        feature_3_title,
        feature_3_description,
        cta_title,
        cta_subtitle,
        cta_button_text
      `)
      .limit(1)
      .maybeSingle();

    if (data) {
      setContent(data as HomeContent);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!content) return;
    setSaving(true);

    const { error } = await supabase
      .from("system_settings")
      .update({
        hero_title: content.hero_title,
        hero_subtitle: content.hero_subtitle,
        feature_1_icon: content.feature_1_icon,
        feature_1_title: content.feature_1_title,
        feature_1_description: content.feature_1_description,
        feature_2_icon: content.feature_2_icon,
        feature_2_title: content.feature_2_title,
        feature_2_description: content.feature_2_description,
        feature_3_icon: content.feature_3_icon,
        feature_3_title: content.feature_3_title,
        feature_3_description: content.feature_3_description,
        cta_title: content.cta_title,
        cta_subtitle: content.cta_subtitle,
        cta_button_text: content.cta_button_text,
      })
      .eq("id", content.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Saved",
        description: "Home page content updated successfully.",
      });
    }
    setSaving(false);
  };

  const updateField = (field: keyof HomeContent, value: string) => {
    if (!content) return;
    setContent({ ...content, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No settings found. Please initialize system settings first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Type className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Hero Section</h3>
            <p className="text-xs text-muted-foreground">Main headline and description</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="hero_title" className="text-sm">Title</Label>
            <Input
              id="hero_title"
              value={content.hero_title || ""}
              onChange={(e) => updateField("hero_title", e.target.value)}
              placeholder="Ultimate RC Experience"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="hero_subtitle" className="text-sm">Subtitle</Label>
            <Textarea
              id="hero_subtitle"
              value={content.hero_subtitle || ""}
              onChange={(e) => updateField("hero_subtitle", e.target.value)}
              placeholder="Discover premium remote control toys..."
              className="mt-1"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Feature Cards Section */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Layout className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Feature Cards</h3>
            <p className="text-xs text-muted-foreground">Three feature highlights</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Feature 1 */}
          <div className="p-4 bg-muted/30 rounded-xl space-y-3">
            <p className="text-sm font-medium text-foreground">Feature 1</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="f1_icon" className="text-xs">Icon (emoji)</Label>
                <Input
                  id="f1_icon"
                  value={content.feature_1_icon || ""}
                  onChange={(e) => updateField("feature_1_icon", e.target.value)}
                  placeholder="🚗"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="f1_title" className="text-xs">Title</Label>
                <Input
                  id="f1_title"
                  value={content.feature_1_title || ""}
                  onChange={(e) => updateField("feature_1_title", e.target.value)}
                  placeholder="Premium Quality"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="f1_desc" className="text-xs">Description</Label>
              <Textarea
                id="f1_desc"
                value={content.feature_1_description || ""}
                onChange={(e) => updateField("feature_1_description", e.target.value)}
                placeholder="Every toy is crafted..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          {/* Feature 2 */}
          <div className="p-4 bg-muted/30 rounded-xl space-y-3">
            <p className="text-sm font-medium text-foreground">Feature 2</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="f2_icon" className="text-xs">Icon (emoji)</Label>
                <Input
                  id="f2_icon"
                  value={content.feature_2_icon || ""}
                  onChange={(e) => updateField("feature_2_icon", e.target.value)}
                  placeholder="🎮"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="f2_title" className="text-xs">Title</Label>
                <Input
                  id="f2_title"
                  value={content.feature_2_title || ""}
                  onChange={(e) => updateField("feature_2_title", e.target.value)}
                  placeholder="Easy Control"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="f2_desc" className="text-xs">Description</Label>
              <Textarea
                id="f2_desc"
                value={content.feature_2_description || ""}
                onChange={(e) => updateField("feature_2_description", e.target.value)}
                placeholder="Intuitive controls..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          {/* Feature 3 */}
          <div className="p-4 bg-muted/30 rounded-xl space-y-3">
            <p className="text-sm font-medium text-foreground">Feature 3</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="f3_icon" className="text-xs">Icon (emoji)</Label>
                <Input
                  id="f3_icon"
                  value={content.feature_3_icon || ""}
                  onChange={(e) => updateField("feature_3_icon", e.target.value)}
                  placeholder="🔋"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="f3_title" className="text-xs">Title</Label>
                <Input
                  id="f3_title"
                  value={content.feature_3_title || ""}
                  onChange={(e) => updateField("feature_3_title", e.target.value)}
                  placeholder="Long Battery Life"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="f3_desc" className="text-xs">Description</Label>
              <Textarea
                id="f3_desc"
                value={content.feature_3_description || ""}
                onChange={(e) => updateField("feature_3_description", e.target.value)}
                placeholder="Extended playtime..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-lg">🎯</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Call to Action</h3>
            <p className="text-xs text-muted-foreground">Bottom section with button</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="cta_title" className="text-sm">Title</Label>
            <Textarea
              id="cta_title"
              value={content.cta_title || ""}
              onChange={(e) => updateField("cta_title", e.target.value)}
              placeholder="Ready to start your RC adventure?"
              className="mt-1"
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="cta_subtitle" className="text-sm">Subtitle</Label>
            <Textarea
              id="cta_subtitle"
              value={content.cta_subtitle || ""}
              onChange={(e) => updateField("cta_subtitle", e.target.value)}
              placeholder="Join thousands of happy customers..."
              className="mt-1"
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="cta_button" className="text-sm">Button Text</Label>
            <Input
              id="cta_button"
              value={content.cta_button_text || ""}
              onChange={(e) => updateField("cta_button_text", e.target.value)}
              placeholder="Browse Collection"
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
};

export default HomeContentTab;
