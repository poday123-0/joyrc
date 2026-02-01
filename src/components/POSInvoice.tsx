import { useEffect, useState, useRef } from "react";
import { X, Printer, Download, Share2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMVR } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { toPng } from "html-to-image";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  color?: string | null;
}

interface InvoiceData {
  orderId: string;
  orderDate: string;
  items: InvoiceItem[];
  total: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  isDelivery: boolean;
  notes?: string;
}

interface SystemSettings {
  site_name: string;
  footer_company_name: string | null;
  footer_address: string | null;
  footer_phone: string | null;
  footer_email: string | null;
  logo_url: string | null;
}

interface POSInvoiceProps {
  invoice: InvoiceData;
  onClose: () => void;
}

const POSInvoice = ({ invoice, onClose }: POSInvoiceProps) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("site_name, footer_company_name, footer_address, footer_phone, footer_email, logo_url")
        .single();
      if (data) setSettings(data);
    };
    fetchSettings();
  }, []);

  const handleDownloadPng = async () => {
    if (!invoiceRef.current) return;
    
    try {
      const dataUrl = await toPng(invoiceRef.current, { 
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        style: {
          padding: '16px'
        }
      });
      
      const link = document.createElement('a');
      link.download = `invoice-${invoice.orderId.slice(0, 8).toUpperCase()}.png`;
      link.href = dataUrl;
      link.click();
      
      toast({
        title: "Downloaded",
        description: "Invoice saved as PNG",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download invoice",
        variant: "destructive",
      });
    }
  };

  const generateShareText = () => {
    const lines = [
      `🧾 Invoice #${invoice.orderId.slice(0, 8).toUpperCase()}`,
      `📅 ${new Date(invoice.orderDate).toLocaleDateString()}`,
      ``,
    ];
    
    if (invoice.customerName) {
      lines.push(`👤 ${invoice.customerName}`);
      if (invoice.customerPhone) lines.push(`📱 ${invoice.customerPhone}`);
      if (invoice.isDelivery && invoice.customerAddress) lines.push(`📍 ${invoice.customerAddress}`);
      lines.push(``);
    }
    
    lines.push(`📦 Items:`);
    invoice.items.forEach(item => {
      lines.push(`• ${item.name}${item.color ? ` (${item.color})` : ''} x${item.quantity} - ${formatMVR(item.price * item.quantity)}`);
    });
    
    lines.push(``);
    lines.push(`💰 Total: ${formatMVR(invoice.total)}`);
    
    if (invoice.notes) {
      lines.push(``);
      lines.push(`📝 Notes: ${invoice.notes}`);
    }
    
    lines.push(``);
    lines.push(`Thank you for your purchase!`);
    lines.push(companyName);
    
    return lines.join('\n');
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(generateShareText());
    const phone = invoice.customerPhone?.replace(/\D/g, '') || '';
    const url = phone 
      ? `https://wa.me/${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleShareViber = () => {
    const text = encodeURIComponent(generateShareText());
    const url = `viber://forward?text=${text}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${invoice.orderId.slice(0, 8).toUpperCase()}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20px;
              max-width: 400px;
              margin: 0 auto;
            }
            .invoice-header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #ddd; padding-bottom: 15px; }
            .logo { max-width: 80px; margin-bottom: 8px; }
            .company-name { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
            .company-info { font-size: 11px; color: #666; line-height: 1.5; }
            .invoice-meta { margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-radius: 8px; }
            .invoice-meta-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
            .invoice-meta-label { color: #666; }
            .invoice-meta-value { font-weight: 600; }
            .customer-section { margin-bottom: 15px; padding: 10px; border: 1px solid #eee; border-radius: 8px; }
            .customer-title { font-size: 11px; color: #666; margin-bottom: 6px; text-transform: uppercase; }
            .customer-name { font-weight: 600; font-size: 13px; }
            .customer-detail { font-size: 11px; color: #666; margin-top: 2px; }
            .delivery-badge { display: inline-block; background: #22c55e; color: white; font-size: 9px; padding: 2px 6px; border-radius: 4px; margin-left: 6px; }
            .items-section { margin-bottom: 15px; }
            .item-header { display: flex; font-size: 10px; color: #666; text-transform: uppercase; padding: 8px 0; border-bottom: 1px solid #eee; }
            .item-row { display: flex; padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 12px; }
            .item-name { flex: 2; }
            .item-color { font-size: 10px; color: #888; }
            .item-qty { flex: 0.5; text-align: center; }
            .item-price { flex: 1; text-align: right; }
            .totals-section { border-top: 2px dashed #ddd; padding-top: 15px; margin-top: 10px; }
            .total-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
            .total-row.grand { font-size: 16px; font-weight: bold; padding-top: 8px; border-top: 1px solid #eee; }
            .footer { text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px dashed #ddd; }
            .footer-text { font-size: 12px; color: #666; margin-bottom: 4px; }
            .footer-thanks { font-size: 14px; font-weight: 600; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const companyName = settings?.footer_company_name || settings?.site_name || "Store";
  const subtotal = invoice.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="font-semibold text-foreground">Invoice</h3>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShareWhatsApp} className="cursor-pointer">
                  <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
                  WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareViber} className="cursor-pointer">
                  <MessageCircle className="w-4 h-4 mr-2 text-purple-500" />
                  Viber
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={handleDownloadPng}>
              <Download className="w-4 h-4 mr-1" />
              PNG
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1" />
              Print
            </Button>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div ref={invoiceRef}>
            {/* Invoice Header */}
            <div className="text-center mb-4 pb-4 border-b-2 border-dashed border-border">
              {settings?.logo_url && (
                <img src={settings.logo_url} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-2 logo" />
              )}
              <h2 className="text-lg font-bold text-foreground company-name">{companyName}</h2>
              <div className="text-xs text-muted-foreground space-y-0.5 company-info">
                {settings?.footer_address && <p>{settings.footer_address}</p>}
                {settings?.footer_phone && <p>Tel: {settings.footer_phone}</p>}
                {settings?.footer_email && <p>{settings.footer_email}</p>}
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="mb-4 p-3 bg-muted/30 rounded-lg invoice-meta">
              <div className="flex justify-between text-xs mb-1 invoice-meta-row">
                <span className="text-muted-foreground invoice-meta-label">Invoice #</span>
                <span className="font-semibold invoice-meta-value">{invoice.orderId.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-xs mb-1 invoice-meta-row">
                <span className="text-muted-foreground invoice-meta-label">Date</span>
                <span className="font-semibold invoice-meta-value">{new Date(invoice.orderDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-xs invoice-meta-row">
                <span className="text-muted-foreground invoice-meta-label">Time</span>
                <span className="font-semibold invoice-meta-value">{new Date(invoice.orderDate).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between text-xs invoice-meta-row">
                <span className="text-muted-foreground invoice-meta-label">Type</span>
                <span className="font-semibold invoice-meta-value">{invoice.isDelivery ? "Delivery" : "Walk-in"}</span>
              </div>
            </div>

            {/* Customer Info - Always show if available */}
            {(invoice.customerName || invoice.customerPhone || invoice.customerAddress) && (
              <div className="mb-4 p-3 border border-border rounded-lg customer-section">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] text-muted-foreground uppercase customer-title">
                    {invoice.isDelivery ? "Delivery To" : "Customer"}
                  </p>
                  {invoice.isDelivery && (
                    <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded delivery-badge">
                      Delivery
                    </span>
                  )}
                </div>
                {invoice.customerName && (
                  <p className="font-semibold text-sm customer-name">{invoice.customerName}</p>
                )}
                {invoice.customerPhone && (
                  <p className="text-xs text-muted-foreground customer-detail">📱 {invoice.customerPhone}</p>
                )}
                {invoice.customerAddress && (
                  <p className="text-xs text-muted-foreground customer-detail">📍 {invoice.customerAddress}</p>
                )}
              </div>
            )}

            {/* Items */}
            <div className="mb-4 items-section">
              <div className="flex text-[10px] text-muted-foreground uppercase pb-2 border-b border-border item-header">
                <span className="flex-[2] item-name">Item</span>
                <span className="flex-[0.5] text-center item-qty">Qty</span>
                <span className="flex-1 text-right item-price">Amount</span>
              </div>
              {invoice.items.map((item, idx) => (
                <div key={idx} className="flex py-2 border-b border-border/50 text-sm item-row">
                  <div className="flex-[2] item-name">
                    <span className="font-medium">{item.name}</span>
                    {item.color && <p className="text-[10px] text-muted-foreground item-color">{item.color}</p>}
                  </div>
                  <span className="flex-[0.5] text-center text-muted-foreground item-qty">{item.quantity}</span>
                  <span className="flex-1 text-right font-medium item-price">{formatMVR(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t-2 border-dashed border-border pt-4 totals-section">
              <div className="flex justify-between text-sm mb-1 total-row">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatMVR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1 total-row">
                <span className="text-muted-foreground">Items</span>
                <span>{invoice.items.reduce((sum, i) => sum + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border total-row grand">
                <span>Total</span>
                <span className="text-primary">{formatMVR(invoice.total)}</span>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-4 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                <span className="font-medium">Notes:</span> {invoice.notes}
              </div>
            )}

            {/* Footer */}
            <div className="text-center mt-6 pt-4 border-t border-dashed border-border footer">
              <p className="text-sm font-semibold text-foreground footer-thanks">Thank you for your purchase!</p>
              <p className="text-xs text-muted-foreground mt-1 footer-text">{companyName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSInvoice;
