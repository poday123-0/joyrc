import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SiteSettings {
  site_name: string;
  site_title: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
}

const SiteMetadata = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("site_name, site_title, favicon_url, og_image_url")
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setSettings(data as SiteSettings);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    // Subscribe to realtime changes on system_settings
    const channel = supabase
      .channel('site-metadata-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_settings'
        },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  useEffect(() => {
    if (!settings) return;

    // Update document title
    const title = settings.site_title || settings.site_name || "RC Joy";
    document.title = title;

    // Update favicon - always ensure it exists
    let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
    if (settings.favicon_url) {
      favicon.href = settings.favicon_url;
    }

    // Update OG meta tags
    // OG Image
    let ogImage = document.querySelector("meta[property='og:image']") as HTMLMetaElement;
    if (!ogImage) {
      ogImage = document.createElement("meta");
      ogImage.setAttribute("property", "og:image");
      document.head.appendChild(ogImage);
    }
    if (settings.og_image_url) {
      ogImage.content = settings.og_image_url;
    }

    // Twitter Image
    let twitterImage = document.querySelector("meta[name='twitter:image']") as HTMLMetaElement;
    if (!twitterImage) {
      twitterImage = document.createElement("meta");
      twitterImage.setAttribute("name", "twitter:image");
      document.head.appendChild(twitterImage);
    }
    if (settings.og_image_url) {
      twitterImage.content = settings.og_image_url;
    }

    // Update OG Title
    let ogTitle = document.querySelector("meta[property='og:title']") as HTMLMetaElement;
    if (!ogTitle) {
      ogTitle = document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      document.head.appendChild(ogTitle);
    }
    ogTitle.content = title;

    // Update Twitter Card
    let twitterCard = document.querySelector("meta[name='twitter:card']") as HTMLMetaElement;
    if (!twitterCard) {
      twitterCard = document.createElement("meta");
      twitterCard.setAttribute("name", "twitter:card");
      document.head.appendChild(twitterCard);
    }
    twitterCard.content = "summary_large_image";

    // Update Twitter Title
    let twitterTitle = document.querySelector("meta[name='twitter:title']") as HTMLMetaElement;
    if (!twitterTitle) {
      twitterTitle = document.createElement("meta");
      twitterTitle.setAttribute("name", "twitter:title");
      document.head.appendChild(twitterTitle);
    }
    twitterTitle.content = title;

  }, [settings]);

  // This component doesn't render anything visible
  return null;
};

export default SiteMetadata;
