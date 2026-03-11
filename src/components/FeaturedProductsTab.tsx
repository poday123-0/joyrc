import { useState, useEffect } from "react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Plus, Trash2, GripVertical, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMVR } from "@/lib/currency";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface FeaturedProduct {
  id: string;
  product_id: string;
  category_id: string | null;
  title: string | null;
  subtitle: string | null;
  sort_order: number;
  is_active: boolean;
  product: Product;
  category?: Category;
}

const FeaturedProductsTab = () => {
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [customSubtitle, setCustomSubtitle] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch featured products with category
    const { data: featured } = await supabase
      .from("featured_products")
      .select(`
        id,
        product_id,
        category_id,
        title,
        subtitle,
        sort_order,
        is_active,
        product:products (id, name, price, image_url),
        category:categories (id, name)
      `)
      .order("sort_order");

    if (featured) {
      setFeaturedProducts(featured as unknown as FeaturedProduct[]);
    }

    // Fetch all products for selection
    const { data: products } = await supabase
      .from("products")
      .select("id, name, price, image_url")
      .order("name");

    if (products) {
      setAllProducts(products);
    }

    // Fetch all categories
    const { data: cats } = await supabase
      .from("categories")
      .select("id, name")
      .order("sort_order");

    if (cats) {
      setCategories(cats);
    }

    setLoading(false);
  };

  useRealtimeSubscription(['featured_products', 'products'], fetchData, 'rt-featured');

  const handleAddFeatured = async () => {
    if (!selectedProductId) {
      toast({
        title: "Error",
        description: "Please select a product",
        variant: "destructive"
      });
      return;
    }

    if (!selectedCategoryId) {
      toast({
        title: "Error",
        description: "Please select a category filter",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from("featured_products")
      .insert({
        product_id: selectedProductId,
        category_id: selectedCategoryId,
        title: customTitle || null,
        subtitle: customSubtitle || null,
        sort_order: featuredProducts.length
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add featured product",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Featured product added"
      });
      setSelectedProductId("");
      setSelectedCategoryId("");
      setCustomTitle("");
      setCustomSubtitle("");
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("featured_products")
      .delete()
      .eq("id", id);

    if (!error) {
      toast({
        title: "Deleted",
        description: "Featured product removed"
      });
      fetchData();
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("featured_products")
      .update({ is_active: isActive })
      .eq("id", id);

    if (!error) {
      setFeaturedProducts(prev =>
        prev.map(fp => fp.id === id ? { ...fp, is_active: isActive } : fp)
      );
    }
  };

  const handleUpdateField = async (id: string, field: 'title' | 'subtitle' | 'category_id', value: string) => {
    const { error } = await supabase
      .from("featured_products")
      .update({ [field]: value || null })
      .eq("id", id);

    if (!error) {
      if (field === 'category_id') {
        // Refetch to get updated category name
        fetchData();
      } else {
        setFeaturedProducts(prev =>
          prev.map(fp => fp.id === id ? { ...fp, [field]: value || null } : fp)
        );
      }
    }
  };

  // Filter out already featured products
  const availableProducts = allProducts.filter(
    p => !featuredProducts.some(fp => fp.product_id === p.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Featured Product */}
      <div className="bg-muted/30 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          Add Featured Product
        </h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Select Product</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a product" />
              </SelectTrigger>
              <SelectContent>
                {availableProducts.map(product => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - {formatMVR(product.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Custom Title (optional)</Label>
            <Input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Override product name"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Custom Subtitle (optional)</Label>
            <Input
              value={customSubtitle}
              onChange={(e) => setCustomSubtitle(e.target.value)}
              placeholder="Custom description for homepage"
            />
          </div>

          <div className="space-y-2">
            <Label>Category Filter (required)</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose category to filter by" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleAddFeatured} disabled={!selectedProductId || !selectedCategoryId}>
          <Plus className="w-4 h-4 mr-2" />
          Add to Featured
        </Button>
      </div>

      {/* Featured Products List */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">
          Current Featured Products ({featuredProducts.length})
        </h3>

        {featuredProducts.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-xl">
            <div className="text-4xl mb-4">🎯</div>
            <p className="text-muted-foreground">
              No featured products yet. Add some above!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {featuredProducts.map((featured) => (
              <div
                key={featured.id}
                className={`flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl border transition-all ${
                  featured.is_active ? 'bg-background border-border' : 'bg-muted/30 border-transparent opacity-60'
                }`}
              >
                <div className="hidden sm:flex flex-shrink-0 cursor-grab text-muted-foreground">
                  <GripVertical className="w-5 h-5" />
                </div>

                {/* Product Image */}
                <div className="w-full sm:w-16 h-32 sm:h-16 rounded-lg bg-muted/50 flex-shrink-0 overflow-hidden">
                  {featured.product.image_url ? (
                    <img
                      src={featured.product.image_url}
                      alt={featured.product.name}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-3 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground truncate">
                        {featured.product.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatMVR(featured.product.price)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={featured.is_active}
                          onCheckedChange={(checked) => handleToggleActive(featured.id, checked)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {featured.is_active ? 'Active' : 'Hidden'}
                        </span>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(featured.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Editable fields */}
                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
                    <Input
                      value={featured.title || ""}
                      onChange={(e) => handleUpdateField(featured.id, 'title', e.target.value)}
                      placeholder="Custom title"
                      className="text-sm"
                    />
                    <Input
                      value={featured.subtitle || ""}
                      onChange={(e) => handleUpdateField(featured.id, 'subtitle', e.target.value)}
                      placeholder="Custom subtitle"
                      className="text-sm"
                    />
                    <Select 
                      value={featured.category_id || ""} 
                      onValueChange={(value) => handleUpdateField(featured.id, 'category_id', value)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Category filter" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {featured.category && (
                    <p className="text-xs text-muted-foreground">
                      Clicking navigates to: {featured.category.name} category
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedProductsTab;