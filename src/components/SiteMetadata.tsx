import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SiteSettings {
  site_name: string;
  site_title: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
}

function hexToHSL(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const SiteMetadata = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("site_name, site_title, favicon_url, og_image_url, primary_color, secondary_color, logo_url")
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setSettings(data as SiteSettings);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

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

    // Update favicon
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
    let ogImage = document.querySelector("meta[property='og:image']") as HTMLMetaElement;
    if (!ogImage) {
      ogImage = document.createElement("meta");
      ogImage.setAttribute("property", "og:image");
      document.head.appendChild(ogImage);
    }
    if (settings.og_image_url) {
      ogImage.content = settings.og_image_url;
    }

    let twitterImage = document.querySelector("meta[name='twitter:image']") as HTMLMetaElement;
    if (!twitterImage) {
      twitterImage = document.createElement("meta");
      twitterImage.setAttribute("name", "twitter:image");
      document.head.appendChild(twitterImage);
    }
    if (settings.og_image_url) {
      twitterImage.content = settings.og_image_url;
    }

    let ogTitle = document.querySelector("meta[property='og:title']") as HTMLMetaElement;
    if (!ogTitle) {
      ogTitle = document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      document.head.appendChild(ogTitle);
    }
    ogTitle.content = title;

    let twitterCard = document.querySelector("meta[name='twitter:card']") as HTMLMetaElement;
    if (!twitterCard) {
      twitterCard = document.createElement("meta");
      twitterCard.setAttribute("name", "twitter:card");
      document.head.appendChild(twitterCard);
    }
    twitterCard.content = "summary_large_image";

    let twitterTitle = document.querySelector("meta[name='twitter:title']") as HTMLMetaElement;
    if (!twitterTitle) {
      twitterTitle = document.createElement("meta");
      twitterTitle.setAttribute("name", "twitter:title");
      document.head.appendChild(twitterTitle);
    }
    twitterTitle.content = title;

    // Apply primary & secondary colors as CSS variables
    const root = document.documentElement;
    if (settings.primary_color) {
      const hsl = hexToHSL(settings.primary_color);
      if (hsl) {
        root.style.setProperty("--primary", hsl);
      }
    }
    if (settings.secondary_color) {
      const hsl = hexToHSL(settings.secondary_color);
      if (hsl) {
        root.style.setProperty("--accent", hsl);
      }
    }

  }, [settings]);

  return null;
};

export default SiteMetadata;
