import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Check, Package, Truck, Megaphone, Zap, Home, Users, Wrench, MoreHorizontal, ShoppingCart, Briefcase, RotateCcw, DollarSign, CreditCard, Gift, Receipt, PiggyBank, TrendingDown, TrendingUp, Banknote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";

interface TransactionCategory {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string | null;
  sort_order: number | null;
  is_active: boolean;
}

// Available icons for categories
const availableIcons = [
  { name: "Package", component: Package },
  { name: "Truck", component: Truck },
  { name: "Megaphone", component: Megaphone },
  { name: "Zap", component: Zap },
  { name: "Home", component: Home },
  { name: "Users", component: Users },
  { name: "Wrench", component: Wrench },
  { name: "ShoppingCart", component: ShoppingCart },
  { name: "Briefcase", component: Briefcase },
  { name: "RotateCcw", component: RotateCcw },
  { name: "DollarSign", component: DollarSign },
  { name: "CreditCard", component: CreditCard },
  { name: "Gift", component: Gift },
  { name: "Receipt", component: Receipt },
  { name: "PiggyBank", component: PiggyBank },
  { name: "Banknote", component: Banknote },
  { name: "TrendingUp", component: TrendingUp },
  { name: "TrendingDown", component: TrendingDown },
  { name: "MoreHorizontal", component: MoreHorizontal },
];

const getIconComponent = (iconName: string | null) => {
  const found = availableIcons.find(i => i.name === iconName);
  return found?.component || MoreHorizontal;
};

const TransactionCategoriesTab = () => {
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TransactionCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "expense" as "income" | "expense",
    icon: "Package",
  });
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transaction_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    } else {
      setCategories(data as TransactionCategory[]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ name: "", type: activeTab, icon: "Package" });
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleEdit = (category: TransactionCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      icon: category.icon || "Package",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const categoryData = {
        name: formData.name.trim(),
        type: formData.type,
        icon: formData.icon,
        is_active: true,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from("transaction_categories")
          .update(categoryData)
          .eq("id", editingCategory.id);
        if (error) throw error;
        toast({
          title: "Category Updated",
          description: `"${formData.name}" has been updated.`,
        });
      } else {
        // Get max sort_order for the type
        const maxSort = categories
          .filter(c => c.type === formData.type)
          .reduce((max, c) => Math.max(max, c.sort_order || 0), 0);
        
        const { error } = await supabase
          .from("transaction_categories")
          .insert({ ...categoryData, sort_order: maxSort + 1 });
        if (error) throw error;
        toast({
          title: "Category Added",
          description: `"${formData.name}" has been added.`,
        });
      }

      resetForm();
      fetchCategories();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setCategoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    const { error } = await supabase
      .from("transaction_categories")
      .delete()
      .eq("id", categoryToDelete);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Category Deleted",
        description: "The category has been removed.",
      });
      fetchCategories();
    }
    setDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };

  const toggleActive = async (category: TransactionCategory) => {
    const { error } = await supabase
      .from("transaction_categories")
      .update({ is_active: !category.is_active })
      .eq("id", category.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      fetchCategories();
    }
  };

  const filteredCategories = categories.filter(c => c.type === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Transaction Categories</h3>
          <p className="text-sm text-muted-foreground">Manage income and expense categories</p>
        </div>
        <button
          onClick={() => {
            setFormData({ ...formData, type: activeTab });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("expense")}
          className={cn(
            "flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
            activeTab === "expense"
              ? "bg-rose-500 text-white shadow-lg shadow-rose-500/25"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <TrendingDown className="w-4 h-4" /> Expense Categories
        </button>
        <button
          onClick={() => setActiveTab("income")}
          className={cn(
            "flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
            activeTab === "income"
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <TrendingUp className="w-4 h-4" /> Income Categories
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="p-4 bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-foreground">
              {editingCategory ? "Edit Category" : "New Category"}
            </h4>
            <button 
              onClick={resetForm}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category Type */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: "expense" })}
                className={cn(
                  "flex-1 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
                  formData.type === "expense"
                    ? "bg-rose-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <TrendingDown className="w-4 h-4" /> Expense
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: "income" })}
                className={cn(
                  "flex-1 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
                  formData.type === "income"
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <TrendingUp className="w-4 h-4" /> Income
              </button>
            </div>

            {/* Category Name */}
            <input
              type="text"
              placeholder="Category Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />

            {/* Icon Selection */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Select Icon</p>
              <div className="flex flex-wrap gap-2">
                {availableIcons.map(({ name, component: Icon }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: name })}
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                      formData.icon === name
                        ? formData.type === "income"
                          ? "bg-emerald-500 text-white shadow-lg"
                          : "bg-rose-500 text-white shadow-lg"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {saving ? "Saving..." : editingCategory ? "Update Category" : "Add Category"}
            </button>
          </form>
        </div>
      )}

      {/* Categories List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-sm font-medium text-foreground">
            {filteredCategories.length} {activeTab} categor{filteredCategories.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        
        <div className="divide-y divide-border">
          {filteredCategories.map((category) => {
            const IconComponent = getIconComponent(category.icon);
            const isExpense = category.type === "expense";
            
            return (
              <div 
                key={category.id}
                className={cn(
                  "flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors",
                  !category.is_active && "opacity-50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  isExpense ? "bg-rose-500/10" : "bg-emerald-500/10"
                )}>
                  <IconComponent className={cn(
                    "w-5 h-5",
                    isExpense ? "text-rose-500" : "text-emerald-600"
                  )} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{category.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {category.is_active ? "Active" : "Inactive"} • Order: {category.sort_order}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Toggle Active */}
                  <button
                    onClick={() => toggleActive(category)}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                      category.is_active 
                        ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                    title={category.is_active ? "Deactivate" : "Activate"}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  
                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(category)}
                    className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                  
                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteClick(category.id)}
                    className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            );
          })}
          
          {filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No {activeTab} categories</p>
              <button
                onClick={() => {
                  setFormData({ ...formData, type: activeTab });
                  setShowForm(true);
                }}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Add your first category
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Category"
        description="Are you sure you want to delete this category? Transactions using this category will keep their current category name."
      />
    </div>
  );
};

export default TransactionCategoriesTab;
