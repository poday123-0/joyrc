import { useEffect, useState, useRef } from "react";
import { X, Printer, Download, Share2, MessageCircle, FileText, Receipt as ReceiptIcon } from "lucide-react";
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
  tax_rate?: number;
  tax_amount?: number;
  discount_amount?: number;
}

interface InvoiceData {
  orderId: string;
  orderNumber?: string;
  orderDate: string;
  items: InvoiceItem[];
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
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

type InvoiceMode = "receipt" | "a4";

const POSInvoice = ({ invoice, onClose }: POSInvoiceProps) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [mode, setMode] = useState<InvoiceMode>("receipt");
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

  const computedSubtotal = invoice.subtotal ?? invoice.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const computedDiscount = invoice.discountAmount ?? 0;
  const computedTax = invoice.taxAmount ?? invoice.items.reduce((s, i) => s + Number(i.tax_amount || 0), 0);
  const hasTax = computedTax > 0 || invoice.items.some((i) => (i.tax_rate || 0) > 0);
  const hasDiscount = computedDiscount > 0;

  const handleDownloadPng = async () => {
    if (!invoiceRef.current) return;
    try {
      const element = invoiceRef.current;
      const rect = element.getBoundingClientRect();
      const captureWidth = Math.max(rect.width + 60, mode === "a4" ? 820 : 500);
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
      link.download = `invoice-${(invoice.orderNumber || invoice.orderId.slice(0, 8)).toUpperCase()}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "Downloaded", description: "Invoice saved as PNG" });
    } catch (error) {
      console.error('PNG generation error:', error);
      toast({ title: "Error", description: "Failed to download invoice", variant: "destructive" });
    }
  };

  const generateShareText = () => {
    const divider = "━━━━━━━━━━━━━━━━━━━━";
    const lines: string[] = [];
    lines.push(`*${companyName}*`);
    lines.push(divider);
    lines.push(``);
    lines.push(`📄 *INVOICE*`);
    lines.push(`${invoice.orderNumber || `#${invoice.orderId.slice(0, 8).toUpperCase()}`}`);
    lines.push(`📅 ${new Date(invoice.orderDate).toLocaleDateString()} at ${new Date(invoice.orderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    lines.push(``);
    if (invoice.customerName || invoice.customerPhone) {
      lines.push(`👤 *Customer*`);
      if (invoice.customerName) lines.push(`   ${invoice.customerName}`);
      if (invoice.customerPhone) lines.push(`   📱 ${invoice.customerPhone}`);
      if (invoice.isDelivery && invoice.customerAddress) lines.push(`   📍 ${invoice.customerAddress}`);
      lines.push(``);
    }
    lines.push(`🛒 *Items*`);
    lines.push(``);
    invoice.items.forEach((item, idx) => {
      const itemTotal = formatMVR(item.price * item.quantity);
      lines.push(`${idx + 1}. ${item.name}`);
      if (item.color) lines.push(`   Color: ${item.color}`);
      lines.push(`   ${item.quantity} x ${formatMVR(item.price)} = *${itemTotal}*`);
      if ((item.tax_rate || 0) > 0) lines.push(`   Tax ${item.tax_rate}%: ${formatMVR(item.tax_amount || 0)}`);
      lines.push(``);
    });
    lines.push(divider);
    lines.push(`Subtotal: ${formatMVR(computedSubtotal)}`);
    if (hasDiscount) lines.push(`Discount: -${formatMVR(computedDiscount)}`);
    if (hasTax) lines.push(`Tax: ${formatMVR(computedTax)}`);
    lines.push(`💰 *TOTAL: ${formatMVR(invoice.total)}*`);
    lines.push(divider);
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
    if (invoice.notes) {
      lines.push(`📝 *Notes:* ${invoice.notes}`);
      lines.push(``);
    }
    lines.push(`✨ Thank you for your purchase!`);
    return lines.join('\n');
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(generateShareText());
    const phone = invoice.customerPhone?.replace(/\D/g, '') || '';
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleShareViber = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`viber://forward?text=${text}`, '_blank');
  };

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const pageWidth = mode === "a4" ? "210mm" : "80mm";
    const bodyMaxWidth = mode === "a4" ? "780px" : "400px";
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.orderNumber || `#${invoice.orderId.slice(0, 8).toUpperCase()}`}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: ${bodyMaxWidth}; margin: 0 auto; color: #111; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px 6px; font-size: 12px; text-align: left; border-bottom: 1px solid #eee; }
            th { background: #f5f5f5; text-transform: uppercase; font-size: 10px; color: #555; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            @page { size: ${pageWidth} auto; margin: 8mm; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const companyName = settings?.footer_company_name || settings?.site_name || "Store";

  // ================= A4 INVOICE =================
  const renderA4 = () => (
    <div ref={invoiceRef} className="bg-white text-slate-900 mx-auto p-8" style={{ width: 780, minHeight: 1000 }}>
      {/* Header */}
      <div className="flex justify-between items-start pb-6 border-b-2 border-slate-300">
        <div className="flex items-center gap-4">
          {settings?.logo_url && <img src={settings.logo_url} alt="Logo" className="w-20 h-20 object-contain" />}
          <div>
            <h1 className="text-2xl font-bold">{companyName}</h1>
            {settings?.footer_address && <p className="text-xs text-slate-600 mt-1">{settings.footer_address}</p>}
            {settings?.footer_phone && <p className="text-xs text-slate-600">Tel: {settings.footer_phone}</p>}
            {settings?.footer_email && <p className="text-xs text-slate-600">{settings.footer_email}</p>}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold tracking-wide">INVOICE</h2>
          <p className="text-sm text-slate-600 mt-2"><span className="font-semibold">No:</span> {invoice.orderNumber || invoice.orderId.slice(0, 8).toUpperCase()}</p>
          <p className="text-sm text-slate-600"><span className="font-semibold">Date:</span> {new Date(invoice.orderDate).toLocaleDateString()}</p>
          <p className="text-sm text-slate-600"><span className="font-semibold">Time:</span> {new Date(invoice.orderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="text-sm text-slate-600"><span className="font-semibold">Type:</span> {invoice.isDelivery ? "Delivery" : "Walk-in"}</p>
        </div>
      </div>

      {/* Bill To */}
      {(invoice.customerName || invoice.customerPhone || invoice.customerAddress) && (
        <div className="mt-6">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Bill To</p>
          {invoice.customerName && <p className="font-bold text-base">{invoice.customerName}</p>}
          {invoice.customerPhone && <p className="text-sm text-slate-600">📱 {invoice.customerPhone}</p>}
          {invoice.customerAddress && <p className="text-sm text-slate-600">📍 {invoice.customerAddress}</p>}
        </div>
      )}

      {/* Items table */}
      <table className="w-full mt-6 border-collapse">
        <thead>
          <tr className="bg-slate-100 border-b-2 border-slate-300">
            <th className="text-left p-2 text-[11px] uppercase text-slate-600">#</th>
            <th className="text-left p-2 text-[11px] uppercase text-slate-600">Item</th>
            <th className="text-center p-2 text-[11px] uppercase text-slate-600">Qty</th>
            <th className="text-right p-2 text-[11px] uppercase text-slate-600">Unit</th>
            {hasTax && <th className="text-right p-2 text-[11px] uppercase text-slate-600">Tax</th>}
            <th className="text-right p-2 text-[11px] uppercase text-slate-600">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it, idx) => (
            <tr key={idx} className="border-b border-slate-200">
              <td className="p-2 text-sm">{idx + 1}</td>
              <td className="p-2 text-sm">
                <p className="font-medium">{it.name}</p>
                {it.color && <p className="text-xs text-slate-500">{it.color}</p>}
              </td>
              <td className="p-2 text-sm text-center">{it.quantity}</td>
              <td className="p-2 text-sm text-right">{formatMVR(it.price)}</td>
              {hasTax && (
                <td className="p-2 text-xs text-right">
                  {(it.tax_rate || 0) > 0 ? `${it.tax_rate}% (${formatMVR(it.tax_amount || 0)})` : "—"}
                </td>
              )}
              <td className="p-2 text-sm text-right font-semibold">{formatMVR(it.price * it.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mt-6">
        <div className="w-72 space-y-1.5">
          <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span>{formatMVR(computedSubtotal)}</span></div>
          {hasDiscount && <div className="flex justify-between text-sm"><span className="text-slate-600">Discount</span><span>-{formatMVR(computedDiscount)}</span></div>}
          {hasTax && <div className="flex justify-between text-sm"><span className="text-slate-600">Tax</span><span>{formatMVR(computedTax)}</span></div>}
          <div className="flex justify-between pt-2 mt-2 border-t-2 border-slate-300 text-lg font-bold">
            <span>TOTAL</span><span>{formatMVR(invoice.total)}</span>
          </div>
        </div>
      </div>

      {/* Bank */}
      {bankAccounts.length > 0 && (
        <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs uppercase tracking-wider text-slate-600 mb-2 font-semibold">🏦 Bank Transfer Details</p>
          <div className="grid grid-cols-2 gap-3">
            {bankAccounts.map((b) => (
              <div key={b.id} className="text-xs border-l-2 border-slate-400 pl-2">
                <p className="font-bold">{b.bank_name}</p>
                <p className="text-slate-600">{b.account_name}</p>
                <p className="font-mono">{b.account_number}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {invoice.notes && (
        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs">
          <p className="text-[10px] uppercase tracking-wider mb-1 font-semibold">Notes</p>
          <p>{invoice.notes}</p>
        </div>
      )}

      <div className="text-center mt-10 pt-4 border-t border-slate-200">
        <p className="font-bold">Thank you for your purchase!</p>
        <p className="text-xs text-slate-500 mt-1">{companyName}</p>
      </div>
    </div>
  );

  // ================= RECEIPT =================
  const renderReceipt = () => (
    <div ref={invoiceRef} className="max-w-sm mx-auto">
      <div className="text-center mb-5 pb-4 border-b-2 border-dashed border-border/60">
        {settings?.logo_url && (
          <img src={settings.logo_url} alt="Logo" className="w-14 h-14 sm:w-16 sm:h-16 object-contain mx-auto mb-3" />
        )}
        <div className="text-[11px] sm:text-xs text-muted-foreground space-y-0.5">
          {settings?.footer_address && <p className="font-medium">{settings.footer_address}</p>}
          {settings?.footer_phone && <p>Tel: {settings.footer_phone}</p>}
          {settings?.footer_email && <p>{settings.footer_email}</p>}
        </div>
      </div>

      <div className="mb-4 p-3 sm:p-4 bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl border border-border/30">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><p className="text-muted-foreground text-[10px] uppercase tracking-wide">Invoice #</p><p className="font-bold">{invoice.orderNumber || invoice.orderId.slice(0, 8).toUpperCase()}</p></div>
          <div className="text-right"><p className="text-muted-foreground text-[10px] uppercase tracking-wide">Type</p><p className="font-bold">{invoice.isDelivery ? "Delivery" : "Walk-in"}</p></div>
          <div><p className="text-muted-foreground text-[10px] uppercase tracking-wide">Date</p><p className="font-semibold">{new Date(invoice.orderDate).toLocaleDateString()}</p></div>
          <div className="text-right"><p className="text-muted-foreground text-[10px] uppercase tracking-wide">Time</p><p className="font-semibold">{new Date(invoice.orderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>
        </div>
      </div>

      {(invoice.customerName || invoice.customerPhone || invoice.customerAddress) && (
        <div className="mb-4 p-3 sm:p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">{invoice.isDelivery ? "Delivery To" : "Customer"}</p>
          {invoice.customerName && <p className="font-bold text-sm mb-1">{invoice.customerName}</p>}
          {invoice.customerPhone && <p className="text-xs text-muted-foreground">📱 {invoice.customerPhone}</p>}
          {invoice.customerAddress && <p className="text-xs text-muted-foreground">📍 {invoice.customerAddress}</p>}
        </div>
      )}

      <div className="mb-4">
        <div className="flex text-[10px] text-muted-foreground uppercase tracking-wider pb-2 mb-1 border-b-2 border-border/60 font-semibold">
          <span className="w-[55%]">Item</span>
          <span className="w-[15%] text-center">Qty</span>
          <span className="w-[30%] text-right">Amount</span>
        </div>
        {invoice.items.map((item, idx) => (
          <div key={idx} className="flex py-2.5 border-b border-border/30">
            <div className="w-[55%] pr-2">
              <p className="font-semibold text-xs leading-snug">{item.name}</p>
              {item.color && <p className="text-[10px] text-muted-foreground mt-0.5">{item.color}</p>}
              {(item.tax_rate || 0) > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">Tax {item.tax_rate}%: {formatMVR(item.tax_amount || 0)}</p>
              )}
            </div>
            <span className="w-[15%] text-center text-xs text-muted-foreground self-center">{item.quantity}</span>
            <span className="w-[30%] text-right text-xs font-semibold self-center">{formatMVR(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="border-t-2 border-dashed border-border/60 pt-4 mb-4">
        <div className="flex justify-between text-xs mb-2"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{formatMVR(computedSubtotal)}</span></div>
        {hasDiscount && <div className="flex justify-between text-xs mb-2"><span className="text-muted-foreground">Discount</span><span className="font-medium">-{formatMVR(computedDiscount)}</span></div>}
        {hasTax && <div className="flex justify-between text-xs mb-2"><span className="text-muted-foreground">Tax</span><span className="font-medium">{formatMVR(computedTax)}</span></div>}
        <div className="flex justify-between text-xs mb-3"><span className="text-muted-foreground">Items</span><span className="font-medium">{invoice.items.reduce((s, i) => s + i.quantity, 0)}</span></div>
        <div className="flex justify-between items-center pt-3 border-t-2 border-border">
          <span className="text-base font-bold">Total</span>
          <span className="text-lg font-bold text-primary">{formatMVR(invoice.total)}</span>
        </div>
      </div>

      {bankAccounts.length > 0 && (
        <div className="mb-4 p-3 sm:p-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border border-border/30">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 font-semibold">🏦 Bank Accounts</p>
          <div className="space-y-3">
            {bankAccounts.map((bank) => (
              <div key={bank.id} className="text-xs border-l-2 border-primary/40 pl-3">
                <p className="font-bold">{bank.bank_name}</p>
                <p className="text-muted-foreground">{bank.account_name}</p>
                <p className="font-mono tracking-wide">{bank.account_number}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {invoice.notes && (
        <div className="mb-4 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">📝 Notes</p>
          <p>{invoice.notes}</p>
        </div>
      )}

      <div className="text-center pt-4 border-t-2 border-dashed border-border/60">
        <p className="text-sm font-bold mb-1">Thank you for your purchase!</p>
        <p className="text-xs text-muted-foreground">{companyName}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className={`bg-card border border-border rounded-2xl w-full ${mode === "a4" ? "max-w-4xl" : "max-w-md"} max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl`}>
        <div className="p-3 sm:p-4 border-b border-border bg-muted/30 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm sm:text-base">Invoice</h3>
            <div className="flex bg-muted rounded-lg p-0.5 ml-2">
              <button
                onClick={() => setMode("receipt")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${mode === "receipt" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                <ReceiptIcon className="w-3.5 h-3.5" /> Receipt
              </button>
              <button
                onClick={() => setMode("a4")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${mode === "a4" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                <FileText className="w-3.5 h-3.5" /> A4
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm">
                  <Share2 className="w-3.5 h-3.5 mr-1" /> Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShareWhatsApp} className="cursor-pointer">
                  <MessageCircle className="w-4 h-4 mr-2 text-green-500" /> WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareViber} className="cursor-pointer">
                  <MessageCircle className="w-4 h-4 mr-2 text-purple-500" /> Viber
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={handleDownloadPng} className="h-8 text-xs sm:text-sm">
              <Download className="w-3.5 h-3.5 mr-1" /> PNG
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 text-xs sm:text-sm">
              <Printer className="w-3.5 h-3.5 mr-1" /> Print
            </Button>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-muted/10">
          {mode === "a4" ? renderA4() : renderReceipt()}
        </div>
      </div>
    </div>
  );
};

export default POSInvoice;
