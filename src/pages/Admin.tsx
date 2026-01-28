import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, Package, Grid3X3, Settings, Plus, Pencil, Trash2, 
  Save, X, ListPlus, Image, Upload, CheckCircle2, LayoutDashboard,
  Building2, CreditCard, RotateCcw, MessageSquare, HelpCircle, Users, Menu, ImageIcon, Star, Video, User, FolderOpen
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatMVR } from "@/lib/currency";
import { compressImage } from "@/lib/imageCompression";
import ConfirmDialog from "@/components/ConfirmDialog";
import AdminDashboard from "@/components/AdminDashboard";
import BankSettingsTab from "@/components/BankSettingsTab";
import PaymentOrdersTab from "@/components/PaymentOrdersTab";
import SupportContentTab from "@/components/SupportContentTab";
import ContactMessagesTab from "@/components/ContactMessagesTab";
import AdminManagementTab from "@/components/AdminManagementTab";
import HeroBackgroundsTab from "@/components/HeroBackgroundsTab";
import FeaturedProductsTab from "@/components/FeaturedProductsTab";
import VideoShowcasesTab from "@/components/VideoShowcasesTab";
import UsersManagementTab from "@/components/UsersManagementTab";
import ExistingImagesDialog from "@/components/ExistingImagesDialog";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  old_price: number | null;
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

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number | null;
  is_360: boolean;
}

interface ProductColor {
  id: string;
  product_id: string;
  color_name: string;
  color_hex: string;
  image_url: string | null;
  sort_order: number | null;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  image_url: string | null;
}

interface SystemSettings {
  id: string;
  site_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  hero_title: string;
  hero_subtitle: string;
  notification_email: string | null;
  notification_sender_name: string | null;
  google_login_enabled: boolean;
}

type Tab = "dashboard" | "products" | "featured" | "videos" | "categories" | "orders" | "bank" | "messages" | "support" | "admins" | "users" | "hero" | "settings";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "featured", label: "Featured", icon: Star },
  { id: "videos", label: "Videos", icon: Video },
  { id: "categories", label: "Categories", icon: Grid3X3 },
  { id: "orders", label: "Orders", icon: CreditCard },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "bank", label: "Bank", icon: Building2 },
  { id: "support", label: "Support", icon: HelpCircle },
  { id: "admins", label: "Admins", icon: Users },
  { id: "users", label: "Users", icon: User },
  { id: "hero", label: "Hero", icon: ImageIcon },
  { id: "settings", label: "Settings", icon: Settings },
];

const Admin = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="min-h-screen bg-background pb-8 lg:pb-0">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </Link>
            <h1 className="font-semibold text-lg text-foreground">Admin</h1>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Mobile Tabs - Horizontal scroll */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full whitespace-nowrap transition-all text-xs font-medium ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="lg:flex lg:min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-60 xl:w-64 bg-card border-r border-border p-5 sticky top-0 h-screen overflow-y-auto">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <Link
              to="/"
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </Link>
            <h1 className="font-semibold text-lg text-foreground">Admin</h1>
          </div>

          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left text-sm ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:p-6 xl:p-8">
          <div className="container max-w-5xl mx-auto px-4 py-4 lg:px-0 lg:py-0">
            {/* Desktop Header */}
            <div className="hidden lg:block mb-6">
              <h2 className="text-xl font-semibold text-foreground capitalize">{activeTab}</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage your {activeTab} settings</p>
            </div>

            {/* Content */}
            {activeTab === "dashboard" && <AdminDashboard />}
            {activeTab === "products" && (
              <ProductsTab 
                products={products} 
                categories={categories}
                onRefresh={fetchData} 
              />
            )}
            {activeTab === "featured" && <FeaturedProductsTab />}
            {activeTab === "videos" && <VideoShowcasesTab />}
            {activeTab === "categories" && (
              <CategoriesTab 
                categories={categories} 
                onRefresh={fetchData} 
              />
            )}
            {activeTab === "orders" && <PaymentOrdersTab />}
            {activeTab === "messages" && <ContactMessagesTab />}
            {activeTab === "bank" && <BankSettingsTab />}
            {activeTab === "support" && <SupportContentTab />}
            {activeTab === "admins" && <AdminManagementTab />}
            {activeTab === "users" && <UsersManagementTab />}
            {activeTab === "hero" && <HeroBackgroundsTab />}
            {activeTab === "settings" && settings && (
              <SettingsTab 
                settings={settings} 
                onRefresh={fetchData} 
              />
            )}
          </div>
        </main>
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
  const formRef = useRef<HTMLDivElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    old_price: "",
    category_id: "",
    rating: "4.5",
    in_stock: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  
  // Specifications state
  const [specifications, setSpecifications] = useState<ProductSpecification[]>([]);
  const [newSpec, setNewSpec] = useState({ name: "", value: "" });
  const [loadingSpecs, setLoadingSpecs] = useState(false);

  // Gallery images state
  const [galleryImages, setGalleryImages] = useState<ProductImage[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Product colors state
  const [productColors, setProductColors] = useState<ProductColor[]>([]);
  const [loadingColors, setLoadingColors] = useState(false);
  const [newColor, setNewColor] = useState({ name: "", hex: "#000000" });
  const [colorImageFile, setColorImageFile] = useState<File | null>(null);
  const [uploadingColor, setUploadingColor] = useState(false);

  // Existing images dialog state
  const [showExistingImagesDialog, setShowExistingImagesDialog] = useState(false);
  const [existingImagesMode, setExistingImagesMode] = useState<"gallery" | "gallery360" | "color">("gallery");
  const [colorImageUrl, setColorImageUrl] = useState<string | null>(null);

  // Color name to hex mapping for auto-detection
  const colorNameToHex: Record<string, string> = {
    black: "#000000",
    white: "#FFFFFF",
    red: "#FF0000",
    green: "#00FF00",
    blue: "#0000FF",
    yellow: "#FFFF00",
    orange: "#FFA500",
    pink: "#FFC0CB",
    purple: "#800080",
    violet: "#EE82EE",
    brown: "#A52A2A",
    gray: "#808080",
    grey: "#808080",
    silver: "#C0C0C0",
    gold: "#FFD700",
    navy: "#000080",
    teal: "#008080",
    cyan: "#00FFFF",
    magenta: "#FF00FF",
    maroon: "#800000",
    olive: "#808000",
    lime: "#00FF00",
    aqua: "#00FFFF",
    coral: "#FF7F50",
    salmon: "#FA8072",
    beige: "#F5F5DC",
    ivory: "#FFFFF0",
    khaki: "#F0E68C",
    lavender: "#E6E6FA",
    mint: "#98FF98",
    peach: "#FFCBA4",
    rose: "#FF007F",
    ruby: "#E0115F",
    emerald: "#50C878",
    sapphire: "#0F52BA",
    crimson: "#DC143C",
    indigo: "#4B0082",
    turquoise: "#40E0D0",
    chocolate: "#D2691E",
    tan: "#D2B48C",
    charcoal: "#36454F",
  };

  const handleColorNameChange = (name: string) => {
    const lowerName = name.toLowerCase().trim();
    const matchedHex = colorNameToHex[lowerName];
    if (matchedHex) {
      setNewColor({ name, hex: matchedHex });
    } else {
      setNewColor({ ...newColor, name });
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", price: "", old_price: "", category_id: "", rating: "4.5", in_stock: true });
    setImageFile(null);
    setEditingProduct(null);
    setSpecifications([]);
    setGalleryImages([]);
    setProductColors([]);
    setNewSpec({ name: "", value: "" });
    setNewColor({ name: "", hex: "#000000" });
    setColorImageFile(null);
    setColorImageUrl(null);
    setShowForm(false);
  };

  const handleSelectExistingImages = async (imageUrls: string[]) => {
    if (!editingProduct) return;
    
    const is360 = existingImagesMode === "gallery360";
    const uploadedImages: ProductImage[] = [];

    for (const url of imageUrls) {
      const { data: imageData, error: insertError } = await supabase
        .from("product_images")
        .insert({
          product_id: editingProduct.id,
          image_url: url,
          sort_order: galleryImages.length + uploadedImages.length,
          is_360: is360,
        })
        .select()
        .single();

      if (!insertError && imageData) {
        uploadedImages.push(imageData as ProductImage);
      }
    }

    if (uploadedImages.length > 0) {
      setGalleryImages([...galleryImages, ...uploadedImages]);
      toast({ 
        title: is360 ? "360° Images Added" : "Images Added",
        description: `${uploadedImages.length} image(s) added from gallery.`,
      });
    }
  };

  const handleSelectExistingColorImage = (imageUrl: string) => {
    setColorImageUrl(imageUrl);
    setColorImageFile(null);
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

  const fetchGalleryImages = async (productId: string) => {
    setLoadingGallery(true);
    const { data } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");
    if (data) setGalleryImages(data as ProductImage[]);
    setLoadingGallery(false);
  };

  const fetchProductColors = async (productId: string) => {
    setLoadingColors(true);
    const { data } = await supabase
      .from("product_colors")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");
    if (data) setProductColors(data as ProductColor[]);
    setLoadingColors(false);
  };

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      old_price: product.old_price?.toString() || "",
      category_id: product.category_id || "",
      rating: (product.rating || 4.5).toString(),
      in_stock: product.in_stock ?? true,
    });
    setShowForm(true);
    
    // Scroll to form after a short delay to ensure it's rendered
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    
    await Promise.all([
      fetchSpecifications(product.id),
      fetchGalleryImages(product.id),
      fetchProductColors(product.id),
    ]);
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
      toast({ 
        title: "Failed to add specification", 
        description: error.message, 
        variant: "destructive" 
      });
    } else if (data) {
      setSpecifications([...specifications, data]);
      setNewSpec({ name: "", value: "" });
      toast({ 
        title: "Specification Added",
        description: `${data.spec_name} has been added successfully.`,
      });
    }
  };

  const handleDeleteSpec = async (specId: string, specName: string) => {
    const { error } = await supabase
      .from("product_specifications")
      .delete()
      .eq("id", specId);
    
    if (error) {
      toast({ 
        title: "Failed to delete specification", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      setSpecifications(specifications.filter(s => s.id !== specId));
      toast({ 
        title: "Specification Removed",
        description: `${specName} has been removed.`,
      });
    }
  };

  const handleGalleryUpload = async (files: FileList | null, is360: boolean = false) => {
    if (!files || !editingProduct) return;
    
    setUploadingGallery(true);
    const uploadedImages: ProductImage[] = [];

    for (const file of Array.from(files)) {
      // Compress image before upload
      const compressedFile = await compressImage(file, 1200, 0.8);
      const fileName = `${Date.now()}-${compressedFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, compressedFile);

      if (uploadError) {
        toast({ 
          title: "Upload Failed", 
          description: `Failed to upload ${file.name}`, 
          variant: "destructive" 
        });
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      const { data: imageData, error: insertError } = await supabase
        .from("product_images")
        .insert({
          product_id: editingProduct.id,
          image_url: urlData.publicUrl,
          sort_order: galleryImages.length + uploadedImages.length,
          is_360: is360,
        })
        .select()
        .single();

      if (!insertError && imageData) {
        uploadedImages.push(imageData as ProductImage);
      }
    }

    if (uploadedImages.length > 0) {
      setGalleryImages([...galleryImages, ...uploadedImages]);
      toast({ 
        title: is360 ? "360° Images Uploaded" : "Images Uploaded",
        description: `${uploadedImages.length} image(s) added to gallery.`,
      });
    }
    setUploadingGallery(false);
  };

  const handleDeleteGalleryImage = async (imageId: string) => {
    const { error } = await supabase
      .from("product_images")
      .delete()
      .eq("id", imageId);
    
    if (error) {
      toast({ 
        title: "Failed to delete image", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      setGalleryImages(galleryImages.filter(img => img.id !== imageId));
      toast({ 
        title: "Image Removed",
        description: "Gallery image has been removed.",
      });
    }
  };

  const handleAddColor = async () => {
    if (!editingProduct || !newColor.name.trim()) return;
    
    setUploadingColor(true);
    let finalColorImageUrl: string | null = colorImageUrl; // Use existing selected URL

    // Upload color image if file provided (takes priority)
    if (colorImageFile) {
      const compressedFile = await compressImage(colorImageFile, 1200, 0.8);
      const fileName = `color-${Date.now()}-${compressedFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, compressedFile);

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);
        finalColorImageUrl = urlData.publicUrl;
      }
    }

    const { data, error } = await supabase
      .from("product_colors")
      .insert({
        product_id: editingProduct.id,
        color_name: newColor.name.trim(),
        color_hex: newColor.hex,
        image_url: finalColorImageUrl,
        sort_order: productColors.length,
      })
      .select()
      .single();
    
    if (error) {
      toast({ 
        title: "Failed to add color", 
        description: error.message, 
        variant: "destructive" 
      });
    } else if (data) {
      setProductColors([...productColors, data as ProductColor]);
      setNewColor({ name: "", hex: "#000000" });
      setColorImageFile(null);
      setColorImageUrl(null);
      toast({ 
        title: "Color Added",
        description: `${data.color_name} has been added.`,
      });
    }
    setUploadingColor(false);
  };

  const handleDeleteColor = async (colorId: string, colorName: string) => {
    const { error } = await supabase
      .from("product_colors")
      .delete()
      .eq("id", colorId);
    
    if (error) {
      toast({ 
        title: "Failed to delete color", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      setProductColors(productColors.filter(c => c.id !== colorId));
      toast({ 
        title: "Color Removed",
        description: `${colorName} has been removed.`,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let imageUrl = editingProduct?.image_url || null;

      if (imageFile) {
        // Compress image before upload
        const compressedFile = await compressImage(imageFile, 1200, 0.8);
        const fileName = `${Date.now()}-${compressedFile.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, compressedFile);

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
        old_price: formData.old_price ? parseFloat(formData.old_price) : null,
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
        toast({ 
          title: "Product Updated",
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        const { error } = await supabase
          .from("products")
          .insert(productData);
        if (error) throw error;
        toast({ 
          title: "Product Created",
          description: `${formData.name} has been added to your catalog.`,
        });
      }

      resetForm();
      onRefresh();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    await supabase.from("product_images").delete().eq("product_id", productToDelete);
    await supabase.from("product_specifications").delete().eq("product_id", productToDelete);
    await supabase.from("product_colors").delete().eq("product_id", productToDelete);
    
    const { error } = await supabase.from("products").delete().eq("id", productToDelete);
    if (error) {
      toast({ 
        title: "Failed to delete product", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: "Product Deleted",
        description: "The product has been permanently removed.",
      });
      onRefresh();
    }
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Products</h2>
          <p className="text-xs text-muted-foreground">{products.length} items</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {showForm && (
        <div ref={formRef} className="bg-card border border-border rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editingProduct ? "Edit Product" : "New Product"}</h3>
            <button onClick={resetForm} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="md:grid md:grid-cols-2 md:gap-4 space-y-4 md:space-y-0">
              <input
                type="text"
                placeholder="Product name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Old Price (MVR)"
                  value={formData.old_price}
                  onChange={(e) => setFormData({ ...formData, old_price: e.target.value })}
                  className="px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="New Price (MVR)"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                />
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent resize-none h-24"
            />
            
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.in_stock}
                  onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">In Stock</span>
              </label>
              <div className="flex-1 min-w-[200px]">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Specifications Section */}
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
                    <div className="grid gap-2 mb-3 md:grid-cols-2">
                      {specifications.map((spec) => (
                        <div key={spec.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                          <span className="font-medium text-sm flex-1">{spec.spec_name}</span>
                          <span className="text-sm text-muted-foreground flex-1">{spec.spec_value}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteSpec(spec.id, spec.spec_name)}
                            className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20"
                          >
                            <X className="w-3 h-3 text-destructive" />
                          </button>
                        </div>
                      ))}
                      {specifications.length === 0 && (
                        <p className="text-sm text-muted-foreground col-span-2">No specifications yet.</p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Spec name (e.g., Speed)"
                        value={newSpec.name}
                        onChange={(e) => setNewSpec({ ...newSpec, name: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g., 45 km/h)"
                        value={newSpec.value}
                        onChange={(e) => setNewSpec({ ...newSpec, value: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleAddSpec}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap"
                      >
                        Add
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Gallery Images Section */}
            {editingProduct && (
              <div className="border-t border-border pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Image className="w-4 h-4 text-primary" />
                  <h4 className="font-medium text-sm">Product Gallery</h4>
                </div>
                
                {loadingGallery ? (
                  <p className="text-sm text-muted-foreground">Loading gallery...</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-3">
                      {galleryImages.map((img) => (
                        <div key={img.id} className="relative group">
                          <img 
                            src={img.image_url} 
                            alt="Gallery" 
                            className="w-full aspect-square object-cover rounded-lg"
                          />
                          {img.is_360 && (
                            <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <RotateCcw className="w-2.5 h-2.5" />
                              360°
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteGalleryImage(img.id)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {galleryImages.length === 0 && (
                        <div className="col-span-full text-sm text-muted-foreground text-center py-4">
                          No gallery images yet
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <label className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {uploadingGallery ? "..." : "Upload"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleGalleryUpload(e.target.files, false)}
                          className="hidden"
                          disabled={uploadingGallery}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setExistingImagesMode("gallery");
                          setShowExistingImagesDialog(true);
                        }}
                        className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 border-dashed border-accent/50 bg-accent/5 hover:bg-accent/10 transition-colors"
                      >
                        <FolderOpen className="w-4 h-4 text-accent-foreground" />
                        <span className="text-xs text-accent-foreground">Gallery</span>
                      </button>
                      <label className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
                        <RotateCcw className="w-4 h-4 text-primary" />
                        <span className="text-xs text-primary">360°</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleGalleryUpload(e.target.files, true)}
                          className="hidden"
                          disabled={uploadingGallery}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setExistingImagesMode("gallery360");
                          setShowExistingImagesDialog(true);
                        }}
                        className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
                      >
                        <FolderOpen className="w-4 h-4 text-primary" />
                        <span className="text-xs text-primary">360° Gallery</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Product Colors Section */}
            {editingProduct && (
              <div className="border-t border-border pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 via-green-500 to-blue-500" />
                  <h4 className="font-medium text-sm">Product Colors</h4>
                </div>
                
                {loadingColors ? (
                  <p className="text-sm text-muted-foreground">Loading colors...</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {productColors.map((color) => (
                        <div 
                          key={color.id} 
                          className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 group"
                        >
                          <div 
                            className="w-5 h-5 rounded-full border border-border flex-shrink-0"
                            style={{ backgroundColor: color.color_hex }}
                          />
                          <span className="text-sm font-medium">{color.color_name}</span>
                          {color.image_url && (
                            <img 
                              src={color.image_url} 
                              alt={color.color_name}
                              className="w-6 h-6 rounded object-cover"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteColor(color.id, color.color_name)}
                            className="w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20"
                          >
                            <X className="w-3 h-3 text-destructive" />
                          </button>
                        </div>
                      ))}
                      {productColors.length === 0 && (
                        <p className="text-sm text-muted-foreground">No colors yet.</p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Color name (e.g., Red, Black)"
                        value={newColor.name}
                        onChange={(e) => handleColorNameChange(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                      />
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={newColor.hex}
                          onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
                          className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                        />
                        <label className="flex items-center gap-1 px-3 py-2 rounded-lg border border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/50 text-xs text-muted-foreground">
                          <Upload className="w-3 h-3" />
                          {colorImageFile ? colorImageFile.name.slice(0, 8) + '...' : 'Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              setColorImageFile(e.target.files?.[0] || null);
                              setColorImageUrl(null);
                            }}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setExistingImagesMode("color");
                            setShowExistingImagesDialog(true);
                          }}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg border border-dashed border-accent/50 bg-accent/5 hover:bg-accent/10 text-xs text-accent-foreground"
                        >
                          <FolderOpen className="w-3 h-3" />
                          {colorImageUrl ? '✓' : 'Gallery'}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddColor}
                        disabled={uploadingColor || !newColor.name.trim()}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap disabled:opacity-50"
                      >
                        {uploadingColor ? "Adding..." : "Add"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? "Saving..." : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {editingProduct ? "Update Product" : "Create Product"}
                </>
              )}
            </button>
          </form>
        </div>
      )}

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <div key={product.id} className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg">📦</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground text-sm line-clamp-2">{product.name}</h4>
                <p className="text-primary font-semibold text-sm mt-0.5">{formatMVR(product.price)}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              <button
                onClick={() => handleEdit(product)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={() => handleDeleteClick(product.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div className="col-span-full text-center py-12">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No products yet. Add your first product!</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Product?"
        description="This will permanently remove this product, including all its specifications and gallery images."
        confirmText="Delete Product"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />

      <ExistingImagesDialog
        open={showExistingImagesDialog}
        onOpenChange={setShowExistingImagesDialog}
        onSelect={existingImagesMode === "color" ? handleSelectExistingColorImage : () => {}}
        multiSelect={existingImagesMode !== "color"}
        onMultiSelect={existingImagesMode !== "color" ? handleSelectExistingImages : undefined}
        productImages={existingImagesMode === "color" ? galleryImages.map(img => ({ url: img.image_url, name: `Gallery ${img.sort_order}` })) : undefined}
      />
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
  const [formData, setFormData] = useState({ name: "", icon: "🎮", sort_order: "0", image_url: "" });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [relatedImages, setRelatedImages] = useState<{id: string; image_url: string}[]>([]);
  const [uploadingRelated, setUploadingRelated] = useState(false);
  const [showRelatedImagesFor, setShowRelatedImagesFor] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({ name: "", icon: "🎮", sort_order: "0", image_url: "" });
    setEditingCategory(null);
    setShowForm(false);
    setRelatedImages([]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const compressed = await compressImage(file);
      const fileName = `category-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, compressed);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: publicUrl });
      toast({ title: "Image uploaded", description: "Category image uploaded successfully." });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEdit = async (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon,
      sort_order: category.sort_order.toString(),
      image_url: category.image_url || "",
    });
    // Fetch related images
    const { data } = await supabase
      .from("category_images")
      .select("id, image_url")
      .eq("category_id", category.id)
      .order("sort_order");
    setRelatedImages(data || []);
    setShowForm(true);
  };

  const handleRelatedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingCategory) return;

    setUploadingRelated(true);
    try {
      const compressed = await compressImage(file);
      const fileName = `category-related-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, compressed);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      const { data, error } = await supabase
        .from("category_images")
        .insert({ category_id: editingCategory.id, image_url: publicUrl, sort_order: relatedImages.length })
        .select("id, image_url")
        .single();

      if (error) throw error;
      setRelatedImages([...relatedImages, data]);
      toast({ title: "Image added", description: "Related image uploaded successfully." });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploadingRelated(false);
    }
  };

  const handleDeleteRelatedImage = async (imageId: string) => {
    const { error } = await supabase.from("category_images").delete().eq("id", imageId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRelatedImages(relatedImages.filter(img => img.id !== imageId));
      toast({ title: "Image removed", description: "Related image deleted." });
    }
  };

  const fetchRelatedImages = async (categoryId: string) => {
    const { data } = await supabase
      .from("category_images")
      .select("id, image_url")
      .eq("category_id", categoryId)
      .order("sort_order");
    setRelatedImages(data || []);
    setShowRelatedImagesFor(categoryId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const categoryData = {
        name: formData.name.trim(),
        icon: formData.icon,
        sort_order: parseInt(formData.sort_order),
        image_url: formData.image_url || null,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update(categoryData)
          .eq("id", editingCategory.id);
        if (error) throw error;
        toast({ 
          title: "Category Updated",
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        const { error } = await supabase
          .from("categories")
          .insert(categoryData);
        if (error) throw error;
        toast({ 
          title: "Category Created",
          description: `${formData.name} has been added.`,
        });
      }

      resetForm();
      onRefresh();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
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

    const { error } = await supabase.from("categories").delete().eq("id", categoryToDelete);
    if (error) {
      toast({ 
        title: "Failed to delete category", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: "Category Deleted",
        description: "The category has been removed.",
      });
      onRefresh();
    }
    setDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Categories</h2>
          <p className="text-xs text-muted-foreground">{categories.length} items</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editingCategory ? "Edit Category" : "New Category"}</h3>
            <button onClick={resetForm} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Category name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Icon (emoji)"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <input
                type="number"
                placeholder="Sort order"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                className="px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            
            {/* Category Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Category Image (optional)</label>
              <div className="flex items-center gap-3">
                {formData.image_url ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
                    <img src={formData.image_url} alt="Category" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image_url: "" })}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                    {uploadingImage ? (
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-muted-foreground" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                )}
                <p className="text-xs text-muted-foreground flex-1">Upload an image for the category filter cards</p>
              </div>
            </div>

            {/* Related Images Section - only show when editing */}
            {editingCategory && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Related Images</label>
                <div className="flex flex-wrap gap-2">
                  {relatedImages.map((img) => (
                    <div key={img.id} className="relative w-16 h-16 rounded-xl overflow-hidden border border-border">
                      <img src={img.image_url} alt="Related" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleDeleteRelatedImage(img.id)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  <label className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                    {uploadingRelated ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 text-muted-foreground" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleRelatedImageUpload}
                      className="hidden"
                      disabled={uploadingRelated}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">Add additional images for this category</p>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
            </button>
          </form>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <div key={category.id} className="bg-card border border-border rounded-xl overflow-hidden">
            {category.image_url ? (
              <div className="h-24 w-full overflow-hidden">
                <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="h-24 w-full bg-muted flex items-center justify-center">
                <span className="text-4xl">{category.icon}</span>
              </div>
            )}
            <div className="p-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-base flex-shrink-0">
                {category.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground text-sm truncate">{category.name}</h4>
                <p className="text-[10px] text-muted-foreground">Order: {category.sort_order}</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleEdit(category)}
                  className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteClick(category.id)}
                  className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="col-span-full text-center py-12">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Grid3X3 className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No categories yet. Add your first category!</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Category?"
        description="This will permanently remove this category. Products in this category will become uncategorized."
        confirmText="Delete Category"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
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
    logo_url: settings.logo_url || "",
    primary_color: settings.primary_color,
    secondary_color: settings.secondary_color,
    hero_title: settings.hero_title,
    hero_subtitle: settings.hero_subtitle,
    notification_email: settings.notification_email || "",
    notification_sender_name: settings.notification_sender_name || "RC Joy",
    google_login_enabled: settings.google_login_enabled ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return;
    
    setUploadingLogo(true);
    try {
      const fileName = `logo-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      setFormData({ ...formData, logo_url: urlData.publicUrl });
      toast({ 
        title: "Logo Uploaded",
        description: "Your new logo has been uploaded. Save settings to apply.",
      });
    } catch (error: any) {
      toast({ 
        title: "Upload Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from("system_settings")
        .update({
          site_name: formData.site_name.trim(),
          logo_url: formData.logo_url || null,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          hero_title: formData.hero_title.trim(),
          hero_subtitle: formData.hero_subtitle.trim(),
          notification_email: formData.notification_email.trim() || null,
          notification_sender_name: formData.notification_sender_name.trim() || "RC Joy",
          google_login_enabled: formData.google_login_enabled,
        })
        .eq("id", settings.id);

      if (error) throw error;
      toast({ 
        title: "Settings Saved",
        description: "Your system settings have been updated successfully.",
      });
      onRefresh();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0">
      <div>
        <div className="mb-4">
          <h2 className="font-semibold text-foreground">System Settings</h2>
          <p className="text-xs text-muted-foreground">Configure your site appearance</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-4">
          {/* Logo Section */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Site Logo</label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border flex-shrink-0">
                {formData.logo_url ? (
                  <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Image className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 w-full sm:w-auto">
                <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {uploadingLogo ? "Uploading..." : "Upload new logo"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)}
                    className="hidden"
                    disabled={uploadingLogo}
                  />
                </label>
                {formData.logo_url && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logo_url: "" })}
                    className="text-sm text-destructive mt-2 hover:underline"
                  >
                    Remove logo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Site Name</label>
            <input
              type="text"
              value={formData.site_name}
              onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-12 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0"
                />
                <input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-sm"
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
                  className="w-12 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0"
                />
                <input
                  type="text"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent text-sm"
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
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Hero Subtitle</label>
            <input
              type="text"
              value={formData.hero_subtitle}
              onChange={(e) => setFormData({ ...formData, hero_subtitle: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Notification Email Settings */}
          <div className="pt-4 border-t border-border">
            <h4 className="font-medium text-foreground mb-3">Notification Settings</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Notification Sender Name</label>
                <input
                  type="text"
                  value={formData.notification_sender_name}
                  onChange={(e) => setFormData({ ...formData, notification_sender_name: e.target.value })}
                  placeholder="e.g., RC Joy"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Notification Email Address</label>
                <input
                  type="email"
                  value={formData.notification_email}
                  onChange={(e) => setFormData({ ...formData, notification_email: e.target.value })}
                  placeholder="noreply@yourdomain.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This email will appear as the sender for order notifications. Must be a verified domain in Resend.
                </p>
              </div>
          </div>
        </div>

          {/* Google Login Toggle */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground">Google Login</h4>
                <p className="text-xs text-muted-foreground">Allow users to sign in with Google</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, google_login_enabled: !formData.google_login_enabled })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  formData.google_login_enabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    formData.google_login_enabled ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>


          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>

      {/* Preview */}
      <div className="hidden sm:block">
        <div className="mb-4">
          <h3 className="font-semibold text-foreground">Preview</h3>
          <p className="text-xs text-muted-foreground">See how your site will look</p>
        </div>
        <div 
          className="rounded-xl p-4 sm:p-5 text-white lg:sticky lg:top-8"
          style={{ background: `linear-gradient(135deg, ${formData.primary_color}, ${formData.secondary_color})` }}
        >
          <div className="flex items-center gap-3 mb-4">
            {formData.logo_url && (
              <img src={formData.logo_url} alt="Logo" className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-lg bg-white/20 p-1" />
            )}
            <span className="font-bold text-base sm:text-lg">{formData.site_name}</span>
          </div>
          <h4 className="text-xl sm:text-2xl font-bold">{formData.hero_title}</h4>
          <p className="text-white/80 mt-2 text-sm sm:text-base">{formData.hero_subtitle}</p>
        </div>
      </div>
    </div>
  );
};

export default Admin;
