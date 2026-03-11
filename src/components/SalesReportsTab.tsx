import { useState, useEffect } from "react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { 
  TrendingUp, Calendar, DollarSign, ShoppingCart, Package, 
  CreditCard, Download, RefreshCw, ChevronDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR, formatMVRCompact } from "@/lib/currency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Order {
  id: string;
  total_amount: number;
  payment_status: string;
  payment_method: string;
  created_at: string;
  status: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  order_id: string;
  product_id: string;
}

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  category_id: string | null;
}

type DateRange = "today" | "week" | "month" | "year" | "custom";

const SalesReportsTab = () => {
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchData();
  }, [dateRange, customStartDate, customEndDate]);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (dateRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "custom":
        startDate = customStartDate ? new Date(customStartDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = customEndDate ? new Date(customEndDate + "T23:59:59") : now;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { startDate, endDate };
  };

  const fetchData = async () => {
    setLoading(true);
    const { startDate, endDate } = getDateRange();

    try {
      const [ordersRes, orderItemsRes, categoriesRes, productsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString())
          .order("created_at", { ascending: false }),
        supabase
          .from("order_items")
          .select("*"),
        supabase.from("categories").select("id, name"),
        supabase.from("products").select("id, name, category_id"),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (orderItemsRes.error) throw orderItemsRes.error;

      // Filter order items to only those in our date range orders
      const orderIds = new Set((ordersRes.data || []).map(o => o.id));
      const filteredItems = (orderItemsRes.data || []).filter(item => orderIds.has(item.order_id));

      setOrders(ordersRes.data || []);
      setOrderItems(filteredItems);
      setCategories(categoriesRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load report data",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  useRealtimeSubscription(['orders', 'transactions'], fetchData, 'rt-sales-reports');

  const confirmedOrders = orders.filter(o => o.payment_status === "confirmed");
  const totalRevenue = confirmedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const totalOrders = orders.length;
  const confirmedCount = confirmedOrders.length;
  const pendingCount = orders.filter(o => o.payment_status === "pending").length;
  const avgOrderValue = confirmedCount > 0 ? totalRevenue / confirmedCount : 0;

  // Top selling products
  const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
  orderItems.forEach(item => {
    const orderId = item.order_id;
    const order = orders.find(o => o.id === orderId);
    if (order?.payment_status === "confirmed") {
      if (!productSales[item.product_id]) {
        productSales[item.product_id] = { name: item.product_name, quantity: 0, revenue: 0 };
      }
      productSales[item.product_id].quantity += item.quantity;
      productSales[item.product_id].revenue += item.product_price * item.quantity;
    }
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Payment method breakdown
  const paymentBreakdown: Record<string, { count: number; amount: number }> = {};
  confirmedOrders.forEach(order => {
    const method = order.payment_method || "unknown";
    if (!paymentBreakdown[method]) {
      paymentBreakdown[method] = { count: 0, amount: 0 };
    }
    paymentBreakdown[method].count++;
    paymentBreakdown[method].amount += Number(order.total_amount);
  });

  const paymentData = Object.entries(paymentBreakdown).map(([name, data]) => ({
    name: name === "bank_transfer" ? "Bank Transfer" : name.charAt(0).toUpperCase() + name.slice(1),
    value: data.amount,
    count: data.count,
  }));

  // Category performance
  const categorySales: Record<string, { name: string; revenue: number; count: number }> = {};
  orderItems.forEach(item => {
    const order = orders.find(o => o.id === item.order_id);
    if (order?.payment_status === "confirmed") {
      const product = products.find(p => p.id === item.product_id);
      const categoryId = product?.category_id || "uncategorized";
      const category = categories.find(c => c.id === categoryId);
      const categoryName = category?.name || "Uncategorized";
      
      if (!categorySales[categoryId]) {
        categorySales[categoryId] = { name: categoryName, revenue: 0, count: 0 };
      }
      categorySales[categoryId].revenue += item.product_price * item.quantity;
      categorySales[categoryId].count += item.quantity;
    }
  });

  const categoryData = Object.values(categorySales)
    .sort((a, b) => b.revenue - a.revenue);

  // Daily revenue chart data
  const dailyRevenue: Record<string, number> = {};
  confirmedOrders.forEach(order => {
    const date = new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dailyRevenue[date] = (dailyRevenue[date] || 0) + Number(order.total_amount);
  });

  const chartData = Object.entries(dailyRevenue)
    .map(([date, amount]) => ({ date, amount }))
    .slice(-14); // Last 14 data points

  const COLORS = ["#10B981", "#06B6D4", "#8B5CF6", "#F59E0B", "#EF4444", "#EC4899"];

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case "today": return "Today";
      case "week": return "Last 7 Days";
      case "month": return "This Month";
      case "year": return "This Year";
      case "custom": return "Custom Period";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={fetchData}
            className="p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Custom Date Range */}
      {dateRange === "custom" && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/50 rounded-xl">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Start Date</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">End Date</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-muted-foreground">Total Revenue</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{formatMVR(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">{getDateRangeLabel()}</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Total Orders</span>
              </div>
              <p className="text-2xl font-bold text-primary">{totalOrders}</p>
              <p className="text-xs text-muted-foreground mt-1">{confirmedCount} confirmed, {pendingCount} pending</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl border border-border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-foreground" />
                <span className="text-sm text-muted-foreground">Avg Order Value</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatMVR(avgOrderValue)}</p>
              <p className="text-xs text-muted-foreground mt-1">Per confirmed order</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-foreground" />
                <span className="text-sm text-muted-foreground">Items Sold</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {Object.values(productSales).reduce((sum, p) => sum + p.quantity, 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Across all orders</p>
            </div>
          </div>

          {/* Revenue Chart */}
          {chartData.length > 0 && (
            <div className="p-4 bg-card border border-border rounded-xl">
              <h3 className="font-semibold text-foreground mb-4">Revenue Over Time</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${v/1000}K`} />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                      formatter={(value: number) => [formatMVR(value), "Revenue"]}
                    />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Selling Products */}
            <div className="p-4 bg-card border border-border rounded-xl">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Top Selling Products
              </h3>
              {topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sales data for this period</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {topProducts.map((product, index) => (
                    <div key={product.name} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-sm text-foreground truncate max-w-[150px]">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.quantity} sold</p>
                        </div>
                      </div>
                      <p className="font-semibold text-sm text-primary">{formatMVR(product.revenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Methods */}
            <div className="p-4 bg-card border border-border rounded-xl">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment Methods
              </h3>
              {paymentData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payment data for this period</p>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {paymentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                          formatter={(value: number) => [formatMVR(value), "Amount"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center mt-2">
                    {paymentData.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-muted-foreground">{item.name}: {item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category Performance */}
          <div className="p-4 bg-card border border-border rounded-xl">
            <h3 className="font-semibold text-foreground mb-4">Category Performance</h3>
            {categoryData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No category data for this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Category</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Items Sold</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Revenue</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.map((cat) => (
                      <tr key={cat.name} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-3 font-medium text-foreground">{cat.name}</td>
                        <td className="py-3 px-3 text-right text-muted-foreground">{cat.count}</td>
                        <td className="py-3 px-3 text-right text-primary font-medium">{formatMVR(cat.revenue)}</td>
                        <td className="py-3 px-3 text-right text-muted-foreground">
                          {totalRevenue > 0 ? ((cat.revenue / totalRevenue) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SalesReportsTab;
