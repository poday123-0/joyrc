import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { formatMVR } from "@/lib/currency";
import { TrendingUp, TrendingDown, Package, DollarSign } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  category?: { name: string } | null;
}

interface StockAnalyticsProps {
  products: Product[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 160 60% 45%))",
  "hsl(var(--chart-3, 30 80% 55%))",
  "hsl(var(--chart-4, 280 65% 60%))",
  "hsl(var(--chart-5, 340 75% 55%))",
  "hsl(200, 70%, 50%)",
  "hsl(120, 40%, 50%)",
  "hsl(45, 90%, 50%)",
];

const StockAnalytics = ({ products }: StockAnalyticsProps) => {
  const analytics = useMemo(() => {
    const totalStock = products.reduce((sum, p) => sum + p.stock_quantity, 0);
    const totalValue = products.reduce((sum, p) => sum + p.stock_quantity * p.price, 0);
    const outOfStock = products.filter(p => p.stock_quantity === 0).length;
    const lowStock = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 5).length;
    const healthyStock = products.filter(p => p.stock_quantity > 5).length;

    // Category breakdown
    const categoryMap = new Map<string, { units: number; value: number }>();
    products.forEach(p => {
      const cat = p.category?.name || "Uncategorized";
      const existing = categoryMap.get(cat) || { units: 0, value: 0 };
      categoryMap.set(cat, {
        units: existing.units + p.stock_quantity,
        value: existing.value + p.stock_quantity * p.price,
      });
    });

    const categoryData = Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name: name.length > 12 ? name.slice(0, 12) + "…" : name, ...data }))
      .sort((a, b) => b.value - a.value);

    // Top 10 products by stock value
    const topProducts = [...products]
      .map(p => ({ name: p.name.length > 18 ? p.name.slice(0, 18) + "…" : p.name, value: p.stock_quantity * p.price, qty: p.stock_quantity }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Stock health pie
    const healthData = [
      { name: "Healthy (>5)", value: healthyStock, color: "hsl(var(--primary))" },
      { name: "Low (1-5)", value: lowStock, color: "hsl(45, 90%, 50%)" },
      { name: "Out of Stock", value: outOfStock, color: "hsl(var(--destructive))" },
    ].filter(d => d.value > 0);

    return { totalStock, totalValue, outOfStock, lowStock, healthyStock, categoryData, topProducts, healthData };
  }, [products]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">Total Units</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-primary">{analytics.totalStock.toLocaleString()}</p>
        </div>
        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">Stock Value</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600">{formatMVR(analytics.totalValue)}</p>
        </div>
        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-amber-600" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">Low Stock</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-amber-600">{analytics.lowStock}</p>
        </div>
        <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-destructive" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">Out of Stock</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-destructive">{analytics.outOfStock}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stock Health Pie */}
        <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-3">Stock Health</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.healthData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {analytics.healthData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(value: number, name: string) => [`${value} products`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {analytics.healthData.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-muted-foreground">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Value Distribution */}
        <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-3">Value by Category</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.categoryData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" tickFormatter={(v) => formatMVR(v)} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(value: number) => [formatMVR(value), "Value"]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {analytics.categoryData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Products by Value */}
      {analytics.topProducts.length > 0 && (
        <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-3">Top 10 Products by Stock Value</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.topProducts} margin={{ bottom: 60, left: 10, right: 10 }}>
                <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{ fontSize: 9 }} interval={0} height={60} />
                <YAxis tickFormatter={(v) => formatMVR(v)} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(value: number, name: string) => [formatMVR(value), "Value"]}
                  labelFormatter={(label) => `Product: ${label}`}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAnalytics;
