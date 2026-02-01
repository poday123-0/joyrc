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

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
}

interface POSInvoiceProps {
  invoice: InvoiceData;
  onClose: () => void;
}

const POSInvoice = ({ invoice, onClose }: POSInvoiceProps) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("site_name, footer_company_name, footer_address, footer_phone, footer_email, logo_url")
        .single();
      if (data) setSettings(data);
    };
    
    const fetchBankAccounts = async () => {
      const { data } = await supabase
        .from("bank_settings")
        .select("id, bank_name, account_name, account_number")
        .eq("is_active", true)
        .order("bank_name");
      if (data) setBankAccounts(data);
    };
    
    fetchSettings();
    fetchBankAccounts();
  }, []);

  const handleDownloadPng = async () => {
    if (!invoiceRef.current) return;
    
    try {
      const element = invoiceRef.current;
      
      // Get computed width and add extra padding
      const rect = element.getBoundingClientRect();
      const captureWidth = Math.max(rect.width + 60, 500);
      
      const dataUrl = await toPng(element, { 
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        width: captureWidth,
        height: rect.height + 48,
        style: {
          padding: '24px',
          paddingRight: '40px',
          background: '#ffffff',
          width: `${captureWidth}px`,
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
      console.error('PNG generation error:', error);
      toast({
        title: "Error",
        description: "Failed to download invoice",
        variant: "destructive",
      });
    }
  };

  const generateShareText = () => {
    const divider = "━━━━━━━━━━━━━━━━━━━━";
    const lines: string[] = [];
    
    // Header
    lines.push(`*${companyName}*`);
    lines.push(divider);
    lines.push(``);
    lines.push(`📄 *INVOICE*`);
    lines.push(`#${invoice.orderId.slice(0, 8).toUpperCase()}`);
    lines.push(`📅 ${new Date(invoice.orderDate).toLocaleDateString()} at ${new Date(invoice.orderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    lines.push(``);
    
    // Customer info
    if (invoice.customerName || invoice.customerPhone) {
      lines.push(`👤 *Customer*`);
      if (invoice.customerName) lines.push(`   ${invoice.customerName}`);
      if (invoice.customerPhone) lines.push(`   📱 ${invoice.customerPhone}`);
      if (invoice.isDelivery && invoice.customerAddress) {
        lines.push(`   📍 ${invoice.customerAddress}`);
      }
      lines.push(``);
    }
    
    // Items
    lines.push(`🛒 *Items*`);
    lines.push(``);
    invoice.items.forEach((item, idx) => {
      const itemTotal = formatMVR(item.price * item.quantity);
      lines.push(`${idx + 1}. ${item.name}`);
      if (item.color) lines.push(`   Color: ${item.color}`);
      lines.push(`   ${item.quantity} x ${formatMVR(item.price)} = *${itemTotal}*`);
      lines.push(``);
    });
    
    lines.push(divider);
    lines.push(`💰 *TOTAL: ${formatMVR(invoice.total)}*`);
    lines.push(divider);
    
    // Bank accounts
    if (bankAccounts.length > 0) {
      lines.push(``);
      lines.push(`🏦 *Bank Transfer*`);
      bankAccounts.forEach(bank => {
        lines.push(`   ${bank.bank_name}`);
        lines.push(`   ${bank.account_name}`);
        lines.push(`   Acc: ${bank.account_number}`);
        lines.push(``);
      });
    }
    
    // Notes
    if (invoice.notes) {
      lines.push(`📝 *Notes:* ${invoice.notes}`);
      lines.push(``);
    }
    
    // Footer
    lines.push(`✨ Thank you for your purchase!`);
    
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
            .bank-accounts { margin-top: 15px; padding: 10px; background: #f9f9f9; border-radius: 8px; }
            .bank-accounts p:first-child { font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between mb-3 sm:mb-0">
            <h3 className="font-semibold text-foreground text-sm sm:text-base">Invoice</h3>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg sm:hidden">
              <X className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg hidden sm:block">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Action buttons - stacked on mobile, inline on desktop */}
          <div className="flex items-center gap-1.5 sm:gap-2 sm:absolute sm:right-4 sm:top-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-8 text-xs sm:text-sm">
                  <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
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
            <Button variant="outline" size="sm" onClick={handleDownloadPng} className="flex-1 sm:flex-none h-8 text-xs sm:text-sm">
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              PNG
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1 sm:flex-none h-8 text-xs sm:text-sm">
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              Print
            </Button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div ref={invoiceRef}>
            {/* Invoice Header */}
            <div className="text-center mb-3 sm:mb-4 pb-3 sm:pb-4 border-b-2 border-dashed border-border">
              {settings?.logo_url && (
                <img src={settings.logo_url} alt="Logo" className="w-12 h-12 sm:w-16 sm:h-16 object-contain mx-auto mb-2 logo" />
              )}
              
              <div className="text-[10px] sm:text-xs text-muted-foreground space-y-0.5 company-info">
                {settings?.footer_address && <p>{settings.footer_address}</p>}
                {settings?.footer_phone && <p>Tel: {settings.footer_phone}</p>}
                {settings?.footer_email && <p>{settings.footer_email}</p>}
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-muted/30 rounded-lg invoice-meta">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:text-xs">
                <div className="flex justify-between invoice-meta-row">
                  <span className="text-muted-foreground invoice-meta-label">Invoice #</span>
                  <span className="font-semibold invoice-meta-value">{invoice.orderId.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between invoice-meta-row">
                  <span className="text-muted-foreground invoice-meta-label">Type</span>
                  <span className="font-semibold invoice-meta-value">{invoice.isDelivery ? "Delivery" : "Walk-in"}</span>
                </div>
                <div className="flex justify-between invoice-meta-row">
                  <span className="text-muted-foreground invoice-meta-label">Date</span>
                  <span className="font-semibold invoice-meta-value">{new Date(invoice.orderDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between invoice-meta-row">
                  <span className="text-muted-foreground invoice-meta-label">Time</span>
                  <span className="font-semibold invoice-meta-value">{new Date(invoice.orderDate).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* Customer Info - Always show if available */}
            {(invoice.customerName || invoice.customerPhone || invoice.customerAddress) && (
              <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 border border-border rounded-lg customer-section">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase customer-title">
                    {invoice.isDelivery ? "Delivery To" : "Customer"}
                  </p>
                  {invoice.isDelivery && (
                    <span className="text-[8px] sm:text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded delivery-badge">
                      Delivery
                    </span>
                  )}
                </div>
                {invoice.customerName && (
                  <p className="font-semibold text-xs sm:text-sm customer-name">{invoice.customerName}</p>
                )}
                {invoice.customerPhone && (
                  <p className="text-[11px] sm:text-xs text-muted-foreground customer-detail">📱 {invoice.customerPhone}</p>
                )}
                {invoice.customerAddress && (
                  <p className="text-[11px] sm:text-xs text-muted-foreground customer-detail">📍 {invoice.customerAddress}</p>
                )}
              </div>
            )}

            {/* Items */}
            <div className="mb-3 sm:mb-4 items-section">
              <div className="flex text-[9px] sm:text-[10px] text-muted-foreground uppercase pb-2 border-b border-border item-header">
                <span className="w-[55%] item-name">Item</span>
                <span className="w-[15%] text-center item-qty">Qty</span>
                <span className="w-[30%] text-right item-price">Amount</span>
              </div>
              {invoice.items.map((item, idx) => (
                <div key={idx} className="flex py-1.5 sm:py-2 border-b border-border/50 text-xs sm:text-sm item-row">
                  <div className="w-[55%] item-name pr-2">
                    <span className="font-medium text-[11px] sm:text-sm leading-tight line-clamp-2">{item.name}</span>
                    {item.color && <p className="text-[9px] sm:text-[10px] text-muted-foreground item-color">{item.color}</p>}
                  </div>
                  <span className="w-[15%] text-center text-muted-foreground item-qty text-[11px] sm:text-sm">{item.quantity}</span>
                  <span className="w-[30%] text-right font-medium item-price text-[11px] sm:text-sm whitespace-nowrap">{formatMVR(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t-2 border-dashed border-border pt-3 sm:pt-4 totals-section">
              <div className="flex justify-between text-xs sm:text-sm mb-1 total-row">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatMVR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm mb-1 total-row">
                <span className="text-muted-foreground">Items</span>
                <span>{invoice.items.reduce((sum, i) => sum + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between text-base sm:text-lg font-bold pt-2 border-t border-border total-row grand">
                <span>Total</span>
                <span className="text-primary">{formatMVR(invoice.total)}</span>
              </div>
            </div>

            {/* Bank Accounts */}
            {bankAccounts.length > 0 && (
              <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-muted/30 rounded-lg bank-accounts">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase mb-2 font-medium">Bank Accounts</p>
                <div className="space-y-2">
                  {bankAccounts.map((bank) => (
                    <div key={bank.id} className="text-[11px] sm:text-xs">
                      <p className="font-semibold text-foreground">{bank.bank_name}</p>
                      <p className="text-muted-foreground">{bank.account_name}</p>
                      <p className="font-mono text-foreground">{bank.account_number}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-3 sm:mt-4 p-2 bg-muted/30 rounded text-[11px] sm:text-xs text-muted-foreground">
                <span className="font-medium">Notes:</span> {invoice.notes}
              </div>
            )}

            {/* Footer */}
            <div className="text-center mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-dashed border-border footer">
              <p className="text-xs sm:text-sm font-semibold text-foreground footer-thanks">Thank you for your purchase!</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 footer-text">{companyName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSInvoice;
