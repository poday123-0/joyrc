import { useState, useEffect } from "react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Pencil, Save, X, Mail, Eye, EyeOff, Info, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  html_content: string;
  description: string | null;
  variables: string[];
  is_active: boolean;
  send_email: boolean;
  send_sms: boolean;
  sms_content: string;
}

const EmailTemplatesTab = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({ subject: "", html_content: "", sms_content: "", send_email: true, send_sms: false });
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("name");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  useRealtimeSubscription('email_templates', fetchTemplates, 'rt-email-templates');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      subject: template.subject,
      html_content: template.html_content,
      sms_content: template.sms_content || "",
      send_email: template.send_email !== false,
      send_sms: template.send_sms === true,
    });
    setShowPreview(false);
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    setSaving(true);

    const { error } = await supabase
      .from("email_templates")
      .update({
        subject: formData.subject,
        html_content: formData.html_content,
        sms_content: formData.sms_content,
        send_email: formData.send_email,
        send_sms: formData.send_sms,
      })
      .eq("id", editingTemplate.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template Saved", description: "Notification template has been updated." });
      setEditingTemplate(null);
      fetchTemplates();
    }
    setSaving(false);
  };

  const toggleActive = async (template: EmailTemplate) => {
    const { error } = await supabase
      .from("email_templates")
      .update({ is_active: !template.is_active })
      .eq("id", template.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: template.is_active ? "Template Disabled" : "Template Enabled",
        description: `${template.name} has been ${template.is_active ? "disabled" : "enabled"}.`,
      });
      fetchTemplates();
    }
  };

  // Generate preview with sample data
  const getPreviewHtml = () => {
    let html = formData.html_content;
    const sampleData: Record<string, string> = {
      customer_name: "John Doe",
      customer_email: "john@example.com",
      order_id: "ABC12345",
      order_total: "MVR 1,299.00",
      order_items: "<ul><li>RC Car Pro x1 - MVR 999.00</li><li>Battery Pack x2 - MVR 150.00</li></ul>",
      order_status: "Processing",
      shipping_address: "123 Main St, Male, Maldives",
      phone: "+960 123 4567",
    };

    for (const [key, value] of Object.entries(sampleData)) {
      html = html.replace(new RegExp(`{{${key}}}`, "g"), value);
    }
    return html;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Template Edit Form */}
      {editingTemplate && (
        <div className="glass-card rounded-2xl p-4 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">{editingTemplate.name}</h3>
              <p className="text-xs text-muted-foreground">{editingTemplate.description}</p>
            </div>
            <button onClick={() => setEditingTemplate(null)}>
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Variables Info */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 mb-4">
            <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-foreground">Available Variables</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {editingTemplate.variables.map((v) => (
                  <code key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    {`{{${v}}}`}
                  </code>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Subject Line</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                placeholder="Email subject..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-foreground">HTML Content</label>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                >
                  {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPreview ? "Edit" : "Preview"}
                </button>
              </div>
              
              {showPreview ? (
                <div
                  className="w-full p-4 rounded-xl border border-border bg-background min-h-[200px] prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                />
              ) : (
                <textarea
                  value={formData.html_content}
                  onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm font-mono resize-none h-48"
                  placeholder="<h1>Email content...</h1>"
                />
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Template"}
            </button>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="space-y-2">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`glass-card rounded-xl p-4 shadow-soft ${!template.is_active ? "opacity-50" : ""}`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground text-sm">{template.name}</h4>
                  {!template.is_active && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{template.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Subject: <span className="text-foreground">{template.subject}</span>
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => toggleActive(template)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    template.is_active
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  title={template.is_active ? "Disable" : "Enable"}
                >
                  {template.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleEdit(template)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No email templates found.</p>
        </div>
      )}
    </div>
  );
};

export default EmailTemplatesTab;
