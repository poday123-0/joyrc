import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, Facebook, Instagram, Twitter, Youtube, Linkedin } from "lucide-react";

interface FooterSettings {
  footer_copyright: string | null;
  footer_company_name: string | null;
  footer_address: string | null;
  footer_phone: string | null;
  footer_email: string | null;
  footer_social_facebook: string | null;
  footer_social_instagram: string | null;
  footer_social_twitter: string | null;
  footer_social_youtube: string | null;
  footer_social_linkedin: string | null;
  footer_social_pinterest: string | null;
}

interface FooterLink {
  id: string;
  column_title: string;
  link_label: string;
  link_url: string;
  sort_order: number;
  column_order: number;
  is_active: boolean;
}

const FooterSettingsTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<FooterSettings>({
    footer_copyright: "",
    footer_company_name: "",
    footer_address: "",
    footer_phone: "",
    footer_email: "",
    footer_social_facebook: "",
    footer_social_instagram: "",
    footer_social_twitter: "",
    footer_social_youtube: "",
    footer_social_linkedin: "",
    footer_social_pinterest: "",
  });
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([]);
  const [newLink, setNewLink] = useState({
    column_title: "",
    link_label: "",
    link_url: "",
    column_order: 0,
  });
  const [addingLink, setAddingLink] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchFooterLinks();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("system_settings")
      .select(
        `
        footer_copyright,
        footer_company_name,
        footer_address,
        footer_phone,
        footer_email,
        footer_social_facebook,
        footer_social_instagram,
        footer_social_twitter,
        footer_social_youtube,
        footer_social_linkedin,
        footer_social_pinterest
      `
      )
      .limit(1)
      .maybeSingle();

    if (data) {
      setSettings({
        footer_copyright: data.footer_copyright || "",
        footer_company_name: data.footer_company_name || "",
        footer_address: data.footer_address || "",
        footer_phone: data.footer_phone || "",
        footer_email: data.footer_email || "",
        footer_social_facebook: data.footer_social_facebook || "",
        footer_social_instagram: data.footer_social_instagram || "",
        footer_social_twitter: data.footer_social_twitter || "",
        footer_social_youtube: data.footer_social_youtube || "",
        footer_social_linkedin: data.footer_social_linkedin || "",
        footer_social_pinterest: data.footer_social_pinterest || "",
      });
    }
    setLoading(false);
  };

  const fetchFooterLinks = async () => {
    const { data } = await supabase
      .from("footer_links")
      .select("*")
      .order("column_order")
      .order("sort_order");

    if (data) {
      setFooterLinks(data);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    
    // First get the actual settings ID
    const { data: existingSettings } = await supabase
      .from("system_settings")
      .select("id")
      .limit(1)
      .maybeSingle();
    
    if (!existingSettings) {
      toast({
        title: "Error",
        description: "No settings found to update",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("system_settings")
      .update({
        footer_copyright: settings.footer_copyright || null,
        footer_company_name: settings.footer_company_name || null,
        footer_address: settings.footer_address || null,
        footer_phone: settings.footer_phone || null,
        footer_email: settings.footer_email || null,
        footer_social_facebook: settings.footer_social_facebook || null,
        footer_social_instagram: settings.footer_social_instagram || null,
        footer_social_twitter: settings.footer_social_twitter || null,
        footer_social_youtube: settings.footer_social_youtube || null,
        footer_social_linkedin: settings.footer_social_linkedin || null,
        footer_social_pinterest: settings.footer_social_pinterest || null,
      })
      .eq("id", existingSettings.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save footer settings",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Footer settings saved successfully",
      });
    }
    setSaving(false);
  };

  const handleAddLink = async () => {
    if (!newLink.column_title || !newLink.link_label || !newLink.link_url) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setAddingLink(true);
    const { error } = await supabase.from("footer_links").insert({
      column_title: newLink.column_title,
      link_label: newLink.link_label,
      link_url: newLink.link_url,
      column_order: newLink.column_order,
      sort_order: footerLinks.filter(l => l.column_title === newLink.column_title).length,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add footer link",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Footer link added successfully",
      });
      setNewLink({ column_title: "", link_label: "", link_url: "", column_order: 0 });
      fetchFooterLinks();
    }
    setAddingLink(false);
  };

  const handleDeleteLink = async (id: string) => {
    const { error } = await supabase.from("footer_links").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete link",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Link deleted",
      });
      fetchFooterLinks();
    }
  };

  const toggleLinkActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("footer_links")
      .update({ is_active: !isActive })
      .eq("id", id);

    if (!error) {
      fetchFooterLinks();
    }
  };

  // Group links by column
  const groupedLinks = footerLinks.reduce((acc, link) => {
    if (!acc[link.column_title]) {
      acc[link.column_title] = [];
    }
    acc[link.column_title].push(link);
    return acc;
  }, {} as Record<string, FooterLink[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Copyright & Company Info */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Copyright & Company Info</h3>
        
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Copyright Text</label>
          <input
            type="text"
            value={settings.footer_copyright || ""}
            onChange={(e) => setSettings({ ...settings, footer_copyright: e.target.value })}
            placeholder="© 2024 RC Joy. All rights reserved."
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Company Name</label>
          <input
            type="text"
            value={settings.footer_company_name || ""}
            onChange={(e) => setSettings({ ...settings, footer_company_name: e.target.value })}
            placeholder="RC Joy Pvt. Ltd"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Address</label>
          <textarea
            value={settings.footer_address || ""}
            onChange={(e) => setSettings({ ...settings, footer_address: e.target.value })}
            placeholder="123 Main Street, City, Country"
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Phone</label>
            <input
              type="text"
              value={settings.footer_phone || ""}
              onChange={(e) => setSettings({ ...settings, footer_phone: e.target.value })}
              placeholder="+960 123 4567"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Email</label>
            <input
              type="email"
              value={settings.footer_email || ""}
              onChange={(e) => setSettings({ ...settings, footer_email: e.target.value })}
              placeholder="info@rcjoy.com"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      </div>

      {/* Social Media Links */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Social Media Links</h3>
        <p className="text-xs text-muted-foreground">Add your social media profile URLs. Leave empty to hide.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Facebook className="w-5 h-5 text-[#1877F2]" />
            </div>
            <input
              type="url"
              value={settings.footer_social_facebook || ""}
              onChange={(e) => setSettings({ ...settings, footer_social_facebook: e.target.value })}
              placeholder="Facebook URL"
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Instagram className="w-5 h-5 text-[#E4405F]" />
            </div>
            <input
              type="url"
              value={settings.footer_social_instagram || ""}
              onChange={(e) => setSettings({ ...settings, footer_social_instagram: e.target.value })}
              placeholder="Instagram URL"
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Twitter className="w-5 h-5 text-[#1DA1F2]" />
            </div>
            <input
              type="url"
              value={settings.footer_social_twitter || ""}
              onChange={(e) => setSettings({ ...settings, footer_social_twitter: e.target.value })}
              placeholder="Twitter/X URL"
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Youtube className="w-5 h-5 text-[#FF0000]" />
            </div>
            <input
              type="url"
              value={settings.footer_social_youtube || ""}
              onChange={(e) => setSettings({ ...settings, footer_social_youtube: e.target.value })}
              placeholder="YouTube URL"
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Linkedin className="w-5 h-5 text-[#0A66C2]" />
            </div>
            <input
              type="url"
              value={settings.footer_social_linkedin || ""}
              onChange={(e) => setSettings({ ...settings, footer_social_linkedin: e.target.value })}
              placeholder="LinkedIn URL"
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <svg className="w-5 h-5 text-[#E60023]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0a12 12 0 0 0-4.373 23.178c-.07-.937-.134-2.377.028-3.4l1.162-4.925s-.297-.594-.297-1.471c0-1.378.8-2.406 1.794-2.406.847 0 1.255.634 1.255 1.396 0 .85-.541 2.122-.822 3.301-.234.99.496 1.797 1.471 1.797 1.766 0 3.122-1.862 3.122-4.549 0-2.378-1.709-4.042-4.15-4.042-2.828 0-4.488 2.122-4.488 4.316 0 .856.328 1.774.738 2.272a.295.295 0 0 1 .069.284l-.275 1.125c-.044.181-.144.219-.334.132-1.244-.579-2.022-2.397-2.022-3.858 0-3.14 2.284-6.025 6.585-6.025 3.456 0 6.144 2.462 6.144 5.753 0 3.434-2.166 6.197-5.169 6.197-1.009 0-1.959-.525-2.284-1.144l-.622 2.369c-.225.866-.834 1.95-1.241 2.612A12 12 0 1 0 12 0z"/>
              </svg>
            </div>
            <input
              type="url"
              value={settings.footer_social_pinterest || ""}
              onChange={(e) => setSettings({ ...settings, footer_social_pinterest: e.target.value })}
              placeholder="Pinterest URL"
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Footer Links</h3>
        <p className="text-xs text-muted-foreground">Add custom link columns (e.g., About Us, Policies, Quick Links)</p>

        {/* Add New Link Form */}
        <div className="p-4 bg-muted/30 rounded-xl space-y-3">
          <h4 className="text-sm font-medium text-foreground">Add New Link</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="text"
              value={newLink.column_title}
              onChange={(e) => setNewLink({ ...newLink, column_title: e.target.value })}
              placeholder="Column Title (e.g., About)"
              className="px-3 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            />
            <input
              type="text"
              value={newLink.link_label}
              onChange={(e) => setNewLink({ ...newLink, link_label: e.target.value })}
              placeholder="Link Text"
              className="px-3 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            />
            <input
              type="text"
              value={newLink.link_url}
              onChange={(e) => setNewLink({ ...newLink, link_url: e.target.value })}
              placeholder="URL (e.g., /about)"
              className="px-3 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            />
            <button
              onClick={handleAddLink}
              disabled={addingLink}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {addingLink ? "Adding..." : "Add Link"}
            </button>
          </div>
        </div>

        {/* Existing Links by Column */}
        {Object.keys(groupedLinks).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedLinks).map(([columnTitle, links]) => (
              <div key={columnTitle} className="border border-border rounded-xl p-4">
                <h4 className="font-medium text-foreground mb-3">{columnTitle}</h4>
                <div className="space-y-2">
                  {links.map((link) => (
                    <div
                      key={link.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        link.is_active ? "bg-muted/30" : "bg-muted/10 opacity-50"
                      }`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{link.link_label}</p>
                        <p className="text-xs text-muted-foreground">{link.link_url}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleLinkActive(link.id, link.is_active)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            link.is_active
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {link.is_active ? "Active" : "Hidden"}
                        </button>
                        <button
                          onClick={() => handleDeleteLink(link.id)}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No footer links added yet</p>
          </div>
        )}
      </div>

      {/* Save Button */}
      <button
        onClick={handleSaveSettings}
        disabled={saving}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : "Save Footer Settings"}
      </button>
    </div>
  );
};

export default FooterSettingsTab;
