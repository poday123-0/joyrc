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
      .select(`
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
      `)
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
      .channel('footer-settings-changes')
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

    // Subscribe to realtime changes on footer_links
    const linksChannel = supabase
      .channel('footer-links-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'footer_links'
        },
        () => {
          fetchLinks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(linksChannel);
    };
  }, [fetchSettings, fetchLinks]);

  // Group links by column
  const groupedLinks = footerLinks.reduce((acc, link) => {
    if (!acc[link.column_title]) {
      acc[link.column_title] = [];
    }
    acc[link.column_title].push(link);
    return acc;
  }, {} as Record<string, FooterLink[]>);

  const hasCompanyInfo = settings?.footer_company_name || settings?.footer_address || settings?.footer_phone || settings?.footer_email;
  const hasSocialLinks = settings?.footer_social_facebook || settings?.footer_social_instagram || 
    settings?.footer_social_twitter || settings?.footer_social_youtube || 
    settings?.footer_social_linkedin || settings?.footer_social_pinterest;
  const hasFooterLinks = Object.keys(groupedLinks).length > 0;

  return (
    <footer className="border-t border-border bg-muted/30">
      {/* Main Footer Content */}
      {(hasCompanyInfo || hasSocialLinks || hasFooterLinks) && (
        <div className="container max-w-7xl mx-auto px-4 lg:px-8 py-10 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Company Info */}
            {hasCompanyInfo && (
              <div className="space-y-4">
                {settings?.footer_company_name && (
                  <h3 className="font-bold text-foreground text-lg">
                    {settings.footer_company_name}
                  </h3>
                )}
                {settings?.footer_address && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="whitespace-pre-line">{settings.footer_address}</span>
                  </div>
                )}
                {settings?.footer_phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <a href={`tel:${settings.footer_phone}`} className="hover:text-foreground transition-colors">
                      {settings.footer_phone}
                    </a>
                  </div>
                )}
                {settings?.footer_email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <a href={`mailto:${settings.footer_email}`} className="hover:text-foreground transition-colors">
                      {settings.footer_email}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Dynamic Link Columns */}
            {Object.entries(groupedLinks).map(([columnTitle, links]) => (
              <div key={columnTitle} className="space-y-4">
                <h3 className="font-semibold text-foreground">{columnTitle}</h3>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.id}>
                      {link.link_url.startsWith("/") ? (
                        <Link
                          to={link.link_url}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {link.link_label}
                        </Link>
                      ) : (
                        <a
                          href={link.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {link.link_label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Social Media Links */}
            {hasSocialLinks && (
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Follow Us</h3>
                <div className="flex flex-wrap gap-3">
                  {settings?.footer_social_instagram && (
                    <a
                      href={settings.footer_social_instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center hover:bg-foreground/20 transition-colors"
                      aria-label="Instagram"
                    >
                      <Instagram className="w-5 h-5 text-foreground" />
                    </a>
                  )}
                  {settings?.footer_social_facebook && (
                    <a
                      href={settings.footer_social_facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center hover:bg-foreground/20 transition-colors"
                      aria-label="Facebook"
                    >
                      <Facebook className="w-5 h-5 text-foreground" />
                    </a>
                  )}
                  {settings?.footer_social_youtube && (
                    <a
                      href={settings.footer_social_youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center hover:bg-foreground/20 transition-colors"
                      aria-label="YouTube"
                    >
                      <Youtube className="w-5 h-5 text-foreground" />
                    </a>
                  )}
                  {settings?.footer_social_twitter && (
                    <a
                      href={settings.footer_social_twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center hover:bg-foreground/20 transition-colors"
                      aria-label="Twitter"
                    >
                      <Twitter className="w-5 h-5 text-foreground" />
                    </a>
                  )}
                  {settings?.footer_social_pinterest && (
                    <a
                      href={settings.footer_social_pinterest}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center hover:bg-foreground/20 transition-colors"
                      aria-label="Pinterest"
                    >
                      <svg className="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0a12 12 0 0 0-4.373 23.178c-.07-.937-.134-2.377.028-3.4l1.162-4.925s-.297-.594-.297-1.471c0-1.378.8-2.406 1.794-2.406.847 0 1.255.634 1.255 1.396 0 .85-.541 2.122-.822 3.301-.234.99.496 1.797 1.471 1.797 1.766 0 3.122-1.862 3.122-4.549 0-2.378-1.709-4.042-4.15-4.042-2.828 0-4.488 2.122-4.488 4.316 0 .856.328 1.774.738 2.272a.295.295 0 0 1 .069.284l-.275 1.125c-.044.181-.144.219-.334.132-1.244-.579-2.022-2.397-2.022-3.858 0-3.14 2.284-6.025 6.585-6.025 3.456 0 6.144 2.462 6.144 5.753 0 3.434-2.166 6.197-5.169 6.197-1.009 0-1.959-.525-2.284-1.144l-.622 2.369c-.225.866-.834 1.95-1.241 2.612A12 12 0 1 0 12 0z"/>
                      </svg>
                    </a>
                  )}
                  {settings?.footer_social_linkedin && (
                    <a
                      href={settings.footer_social_linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center hover:bg-foreground/20 transition-colors"
                      aria-label="LinkedIn"
                    >
                      <Linkedin className="w-5 h-5 text-foreground" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Copyright Bar */}
      <div className="border-t border-border py-6">
        <div className="container max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              {settings?.footer_copyright || "© 2024 RC Joy. All rights reserved."}
            </p>
            <div className="flex items-center gap-6">
              <Link to="/support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Support
              </Link>
              <Link to="/categories" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Shop
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
