import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, Package, Grid3X3, Settings, Plus, Pencil, Trash2, 
  Save, X, ListPlus 
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  rating: number | null;
  in_stock: boolean | null;
}

interface ProductSpecification {
  id: string;
  product_id: string;
  spec_name: string;
  spec_value: string;
  sort_order: number | null;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

interface SystemSettings {
  id: string;
  site_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  hero_title: string;
  hero_subtitle: string;
}

type Tab = "products" | "categories" | "settings";

const Admin = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access this page.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    const [productsRes, categoriesRes, settingsRes] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("system_settings").select("*").limit(1).maybeSingle(),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (settingsRes.data) setSettings(settingsRes.data);
    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-hero pb-8">
      <div className="container max-w-4xl mx-auto px-4 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="font-bold text-xl text-foreground">Admin Panel</h1>
          <div className="w-10" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: "products", label: "Products", icon: Package },
            { id: "categories", label: "Categories", icon: Grid3X3 },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "glass-card text-foreground hover:bg-white/80"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "products" && (
          <ProductsTab 
            products={products} 
            categories={categories}
            onRefresh={fetchData} 
          />
        )}
        {activeTab === "categories" && (
          <CategoriesTab 
            categories={categories} 
            onRefresh={fetchData} 
          />
        )}
        {activeTab === "settings" && settings && (
          <SettingsTab 
            settings={settings} 
            onRefresh={fetchData} 
          />
        )}
      </div>
    </div>
  );
};

// Products Tab Component
const ProductsTab = ({ 
  products, 
  categories,
  onRefresh 
}: { 
  products: Product[]; 
  categories: Category[];
  onRefresh: () => void;
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    rating: "4.5",
    in_stock: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Specifications state
  const [specifications, setSpecifications] = useState<ProductSpecification[]>([]);
  const [newSpec, setNewSpec] = useState({ name: "", value: "" });
  const [loadingSpecs, setLoadingSpecs] = useState(false);

  const resetForm = () => {
    setFormData({ name: "", description: "", price: "", category_id: "", rating: "4.5", in_stock: true });
    setImageFile(null);
    setEditingProduct(null);
    setSpecifications([]);
    setNewSpec({ name: "", value: "" });
    setShowForm(false);
  };

  const fetchSpecifications = async (productId: string) => {
    setLoadingSpecs(true);
    const { data } = await supabase
      .from("product_specifications")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");
    if (data) setSpecifications(data);
    setLoadingSpecs(false);
  };

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      category_id: product.category_id || "",
      rating: (product.rating || 4.5).toString(),
      in_stock: product.in_stock ?? true,
    });
    setShowForm(true);
    await fetchSpecifications(product.id);
  };

  const handleAddSpec = async () => {
    if (!editingProduct || !newSpec.name.trim() || !newSpec.value.trim()) return;
    
    const { data, error } = await supabase
      .from("product_specifications")
      .insert({
        product_id: editingProduct.id,
        spec_name: newSpec.name.trim(),
        spec_value: newSpec.value.trim(),
        sort_order: specifications.length,
      })
      .select()
      .single();
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      setSpecifications([...specifications, data]);
      setNewSpec({ name: "", value: "" });
      toast({ title: "Specification added!" });
    }
  };

  const handleDeleteSpec = async (specId: string) => {
    const { error } = await supabase
      .from("product_specifications")
      .delete()
      .eq("id", specId);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSpecifications(specifications.filter(s => s.id !== specId));
      toast({ title: "Specification deleted!" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let imageUrl = editingProduct?.image_url || null;

      if (imageFile) {
        const fileName = `${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);
        
        imageUrl = urlData.publicUrl;
      }

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        category_id: formData.category_id || null,
        rating: parseFloat(formData.rating),
        in_stock: formData.in_stock,
        image_url: imageUrl,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);
        if (error) throw error;
        toast({ title: "Product updated!" });
      } else {
        const { error } = await supabase
          .from("products")
          .insert(productData);
        if (error) throw error;
        toast({ title: "Product created!" });
      }

      resetForm();
      onRefresh();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    // Delete specifications first
    await supabase.from("product_specifications").delete().eq("product_id", id);
    
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Product deleted!" });
      onRefresh();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">Products ({products.length})</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full gradient-cta text-white text-sm font-medium shadow-soft"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {showForm && (
        <div className="glass-card rounded-2xl p-4 mb-4 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editingProduct ? "Edit Product" : "New Product"}</h3>
            <button onClick={resetForm}>
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Product name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent resize-none h-20"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="0.01"
                placeholder="Price"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.in_stock}
                  onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">In Stock</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="text-sm"
              />
            </div>

            {/* Specifications Section - Only show when editing */}
            {editingProduct && (
              <div className="border-t border-border pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <ListPlus className="w-4 h-4 text-primary" />
                  <h4 className="font-medium text-sm">Product Specifications</h4>
                </div>
                
                {loadingSpecs ? (
                  <p className="text-sm text-muted-foreground">Loading specifications...</p>
                ) : (
                  <>
                    {/* Existing specifications */}
                    <div className="space-y-2 mb-3">
                      {specifications.map((spec) => (
                        <div key={spec.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                          <span className="font-medium text-sm flex-1">{spec.spec_name}</span>
                          <span className="text-sm text-muted-foreground flex-1">{spec.spec_value}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteSpec(spec.id)}
                            className="w-6 h-6 rounded-full bg-coral/10 flex items-center justify-center hover:bg-coral/20"
                          >
                            <X className="w-3 h-3 text-coral" />
                          </button>
                        </div>
                      ))}
                      {specifications.length === 0 && (
                        <p className="text-sm text-muted-foreground">No specifications yet.</p>
                      )}
                    </div>

                    {/* Add new specification */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Spec name (e.g., Weight)"
                        value={newSpec.name}
                        onChange={(e) => setNewSpec({ ...newSpec, name: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g., 1.5 kg)"
                        value={newSpec.value}
                        onChange={(e) => setNewSpec({ ...newSpec, value: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleAddSpec}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                      >
                        Add
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {saving ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {products.map((product) => (
          <div key={product.id} className="glass-card rounded-2xl p-4 flex items-center gap-4 shadow-soft">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-b from-cyan-light/30 to-white flex items-center justify-center overflow-hidden">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">📦</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground truncate">{product.name}</h4>
              <p className="text-sm text-muted-foreground">${product.price.toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(product)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(product.id)}
                className="w-8 h-8 rounded-full bg-coral/10 flex items-center justify-center hover:bg-coral/20"
              >
                <Trash2 className="w-4 h-4 text-coral" />
              </button>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No products yet. Add your first product!</p>
        )}
      </div>
    </div>
  );
};

// Categories Tab Component
const CategoriesTab = ({ 
  categories, 
  onRefresh 
}: { 
  categories: Category[]; 
  onRefresh: () => void;
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", icon: "🎮", sort_order: "0" });
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormData({ name: "", icon: "🎮", sort_order: "0" });
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon,
      sort_order: category.sort_order.toString(),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const categoryData = {
        name: formData.name.trim(),
        icon: formData.icon,
        sort_order: parseInt(formData.sort_order),
      };

      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update(categoryData)
          .eq("id", editingCategory.id);
        if (error) throw error;
        toast({ title: "Category updated!" });
      } else {
        const { error } = await supabase
          .from("categories")
          .insert(categoryData);
        if (error) throw error;
        toast({ title: "Category created!" });
      }

      resetForm();
      onRefresh();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Category deleted!" });
      onRefresh();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">Categories ({categories.length})</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full gradient-cta text-white text-sm font-medium shadow-soft"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {showForm && (
        <div className="glass-card rounded-2xl p-4 mb-4 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editingCategory ? "Edit Category" : "New Category"}</h3>
            <button onClick={resetForm}>
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Category name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Icon (emoji)"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <input
                type="number"
                placeholder="Sort order"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                className="px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {saving ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {categories.map((category) => (
          <div key={category.id} className="glass-card rounded-2xl p-4 flex items-center gap-4 shadow-soft">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-cyan-light/30 to-white flex items-center justify-center text-2xl">
              {category.icon}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">{category.name}</h4>
              <p className="text-xs text-muted-foreground">Sort: {category.sort_order}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(category)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(category.id)}
                className="w-8 h-8 rounded-full bg-coral/10 flex items-center justify-center hover:bg-coral/20"
              >
                <Trash2 className="w-4 h-4 text-coral" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Settings Tab Component
const SettingsTab = ({ 
  settings, 
  onRefresh 
}: { 
  settings: SystemSettings; 
  onRefresh: () => void;
}) => {
  const [formData, setFormData] = useState({
    site_name: settings.site_name,
    primary_color: settings.primary_color,
    secondary_color: settings.secondary_color,
    hero_title: settings.hero_title,
    hero_subtitle: settings.hero_subtitle,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from("system_settings")
        .update({
          site_name: formData.site_name.trim(),
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          hero_title: formData.hero_title.trim(),
          hero_subtitle: formData.hero_subtitle.trim(),
        })
        .eq("id", settings.id);

      if (error) throw error;
      toast({ title: "Settings saved!" });
      onRefresh();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="font-semibold text-foreground mb-4">System Settings</h2>

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-4 shadow-soft space-y-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Site Name</label>
          <input
            type="text"
            value={formData.site_name}
            onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
            className="w-full px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Primary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-12 h-10 rounded-lg border border-border cursor-pointer"
              />
              <input
                type="text"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="flex-1 px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Secondary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                className="w-12 h-10 rounded-lg border border-border cursor-pointer"
              />
              <input
                type="text"
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                className="flex-1 px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Hero Title</label>
          <input
            type="text"
            value={formData.hero_title}
            onChange={(e) => setFormData({ ...formData, hero_title: e.target.value })}
            className="w-full px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Hero Subtitle</label>
          <input
            type="text"
            value={formData.hero_subtitle}
            onChange={(e) => setFormData({ ...formData, hero_subtitle: e.target.value })}
            className="w-full px-4 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-full gradient-cta text-white font-medium shadow-soft disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>

      {/* Preview */}
      <div className="mt-6">
        <h3 className="font-semibold text-foreground mb-3">Preview</h3>
        <div 
          className="rounded-2xl p-6 text-white"
          style={{ background: `linear-gradient(135deg, ${formData.primary_color}, ${formData.secondary_color})` }}
        >
          <h4 className="text-xl font-bold">{formData.hero_title}</h4>
          <p className="text-white/80 text-sm mt-1">{formData.hero_subtitle}</p>
        </div>
      </div>
    </div>
  );
};

export default Admin;
