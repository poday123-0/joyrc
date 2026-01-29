import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Facebook, Instagram, Twitter, Youtube, Linkedin, MapPin, Phone, Mail } from "lucide-react";

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
}

const Footer = () => {
  const [settings, setSettings] = useState<FooterSettings | null>(null);
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([]);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
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
      `,
      )
      .limit(1)
      .maybeSingle();

    if (data) {
      setSettings(data);
    }
  }, []);

  const fetchLinks = useCallback(async () => {
    const { data } = await supabase
      .from("footer_links")
      .select("*")
      .eq("is_active", true)
      .order("column_order")
      .order("sort_order");

    if (data) {
      setFooterLinks(data);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchLinks();

    // Subscribe to realtime changes on system_settings
    const settingsChannel = supabase
      .channel("footer-settings-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "system_settings",
        },
        () => {
          fetchSettings();
        },
      )
      .subscribe();

    // Subscribe to realtime changes on footer_links
    const linksChannel = supabase
      .channel("footer-links-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "footer_links",
        },
        () => {
          fetchLinks();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(linksChannel);
    };
  }, [fetchSettings, fetchLinks]);

  // Group links by column
  const groupedLinks = footerLinks.reduce(
    (acc, link) => {
      if (!acc[link.column_title]) {
        acc[link.column_title] = [];
      }
      acc[link.column_title].push(link);
      return acc;
    },
    {} as Record<string, FooterLink[]>,
  );

  const hasCompanyInfo =
    settings?.footer_company_name || settings?.footer_address || settings?.footer_phone || settings?.footer_email;
  const hasSocialLinks =
    settings?.footer_social_facebook ||
    settings?.footer_social_instagram ||
    settings?.footer_social_twitter ||
    settings?.footer_social_youtube ||
    settings?.footer_social_linkedin ||
    settings?.footer_social_pinterest;
  const hasFooterLinks = Object.keys(groupedLinks).length > 0;

  return (
    <footer className="bg-foreground text-background">
      {/* Main Footer Content */}
      <div className="container max-w-7xl mx-auto px-4 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
          {/* Left Side - Company Info & Social */}
          <div className="space-y-6">
            {settings?.footer_company_name && (
              <Link to="/" className="flex-shrink-0 h-8 flex items-center">
                {!logoLoaded ? (
                  <div className="h-8 w-20 bg-muted/30 rounded animate-pulse" />
                ) : (
                  <img
                    src={logoUrl || rcJoyLogo}
                    alt="RC Joy"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    className="h-8 w-auto max-w-[120px] object-contain"
                  />
                )}
              </Link>
            )}

            <div className="space-y-3">
              {settings?.footer_address && (
                <div className="flex items-start gap-3 text-sm text-background/70">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="whitespace-pre-line">{settings.footer_address}</span>
                </div>
              )}
              {settings?.footer_phone && (
                <div className="flex items-center gap-3 text-sm text-background/70">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <a href={`tel:${settings.footer_phone}`} className="hover:text-background transition-colors">
                    {settings.footer_phone}
                  </a>
                </div>
              )}
              {settings?.footer_email && (
                <div className="flex items-center gap-3 text-sm text-background/70">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <a href={`mailto:${settings.footer_email}`} className="hover:text-background transition-colors">
                    {settings.footer_email}
                  </a>
                </div>
              )}
            </div>

            {/* Social Media Links */}
            {hasSocialLinks && (
              <div className="flex flex-wrap gap-3 pt-2">
                {settings?.footer_social_instagram && (
                  <a
                    href={settings.footer_social_instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-5 h-5 text-background" />
                  </a>
                )}
                {settings?.footer_social_facebook && (
                  <a
                    href={settings.footer_social_facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="w-5 h-5 text-background" />
                  </a>
                )}
                {settings?.footer_social_youtube && (
                  <a
                    href={settings.footer_social_youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
                    aria-label="YouTube"
                  >
                    <Youtube className="w-5 h-5 text-background" />
                  </a>
                )}
                {settings?.footer_social_twitter && (
                  <a
                    href={settings.footer_social_twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
                    aria-label="Twitter"
                  >
                    <Twitter className="w-5 h-5 text-background" />
                  </a>
                )}
                {settings?.footer_social_linkedin && (
                  <a
                    href={settings.footer_social_linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="w-5 h-5 text-background" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Right Side - Quick Links */}
          <div className="md:flex md:justify-end">
            <div className="grid grid-cols-2 gap-8">
              {/* Quick Links Column */}
              <div className="space-y-4">
                <h4 className="font-semibold text-background text-sm uppercase tracking-wider">Quick Links</h4>
                <ul className="space-y-2">
                  <li>
                    <Link
                      to="/categories"
                      className="text-sm text-background/70 hover:text-background transition-colors"
                    >
                      Browse Products
                    </Link>
                  </li>
                  <li>
                    <Link to="/support" className="text-sm text-background/70 hover:text-background transition-colors">
                      Help Center
                    </Link>
                  </li>
                  <li>
                    <Link to="/cart" className="text-sm text-background/70 hover:text-background transition-colors">
                      Cart
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Dynamic Link Columns */}
              {Object.entries(groupedLinks).map(([columnTitle, links]) => (
                <div key={columnTitle} className="space-y-4">
                  <h4 className="font-semibold text-background text-sm uppercase tracking-wider">{columnTitle}</h4>
                  <ul className="space-y-2">
                    {links.map((link) => (
                      <li key={link.id}>
                        {link.link_url.startsWith("/") ? (
                          <Link
                            to={link.link_url}
                            className="text-sm text-background/70 hover:text-background transition-colors"
                          >
                            {link.link_label}
                          </Link>
                        ) : (
                          <a
                            href={link.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-background/70 hover:text-background transition-colors"
                          >
                            {link.link_label}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar - Copyright */}
      <div className="border-t border-background/10">
        <div className="container max-w-7xl mx-auto px-4 lg:px-8 py-6">
          <p className="text-sm text-background/60 text-center">
            {settings?.footer_copyright || "© 2024 RC Joy. All rights reserved."}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
