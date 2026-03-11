import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, Package, Grid3X3, Settings, Plus, Pencil, Trash2, 
  Save, X, ListPlus, Image, Upload, CheckCircle2, LayoutDashboard,
  Building2, CreditCard, RotateCcw, MessageSquare, HelpCircle, Users, Menu, ImageIcon, Star, Video, User, FolderOpen, HardDrive, Mail, Send,
  Zap, Battery, Gauge, Radio, Box, Clock, Ruler, Scale, Thermometer, Wifi, Camera, UserCog, PackageSearch, BarChart3, GripVertical, ShoppingCart, Bell, Search, Truck, Banknote, Hash, ExternalLink, Eye, EyeOff
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import HomeContentTab from "@/components/HomeContentTab";
import StorageManagementTab from "@/components/StorageManagementTab";
import EmailTemplatesTab from "@/components/EmailTemplatesTab";
import MarketingEmailsTab from "@/components/MarketingEmailsTab";
import FooterSettingsTab from "@/components/FooterSettingsTab";
import SystemUsersTab from "@/components/SystemUsersTab";
import StockManagementTab from "@/components/StockManagementTab";
import SalesReportsTab from "@/components/SalesReportsTab";
import TransactionsTab from "@/components/TransactionsTab";
import PreordersTab from "@/components/PreordersTab";
import DeliveryTab from "@/components/DeliveryTab";
import QuickPOSTab from "@/components/QuickPOSTab";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

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
  item_code: string | null;
  hidden_from_shop?: boolean;
}

interface ProductSpecification {
  id: string;
  product_id: string;
  spec_name: string;
  spec_value: string;
  sort_order: number | null;
  icon: string | null;
}

// Available icons for specification selection - using Lucide icons
const specIconOptions = [
  { value: "zap", label: "Speed/Power", Icon: Zap },
  { value: "battery", label: "Battery", Icon: Battery },
  { value: "gauge", label: "Range/Gauge", Icon: Gauge },
  { value: "radio", label: "Control/Radio", Icon: Radio },
  { value: "box", label: "Default", Icon: Box },
  { value: "clock", label: "Time", Icon: Clock },
  { value: "ruler", label: "Size", Icon: Ruler },
  { value: "weight", label: "Weight", Icon: Scale },
  { value: "thermometer", label: "Temperature", Icon: Thermometer },
  { value: "wifi", label: "Signal", Icon: Wifi },
  { value: "camera", label: "Camera", Icon: Camera },
  { value: "star", label: "Rating", Icon: Star },
];

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number | null;
  is_360: boolean;
  color_id: string | null;
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
  site_title: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
}

interface TabItem {
  id: string;
  label: string;
  icon: any;
  category?: string;
}

type Tab = "dashboard" | "pos" | "products" | "stock" | "transactions" | "featured" | "videos" | "categories" | "orders" | "preorders" | "deliveries" | "reports" | "bank" | "messages" | "support" | "admins" | "users" | "hero" | "home-content" | "storage" | "email-templates" | "marketing" | "footer" | "settings";

const TAB_CATEGORIES = [
  { key: "main", label: "" },
  { key: "shop", label: "Shop & Catalog" },
  { key: "sales", label: "Sales & Orders" },
  { key: "finance", label: "Finance" },
  { key: "communication", label: "Communication" },
  { key: "content", label: "Content & Media" },
  { key: "people", label: "People" },
  { key: "system", label: "System" },
];

const defaultTabs: TabItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, category: "main" },
  { id: "pos", label: "Quick POS", icon: Banknote, category: "sales" },
  { id: "products", label: "Products", icon: Package, category: "shop" },
  { id: "stock", label: "Stock", icon: PackageSearch, category: "shop" },
  { id: "categories", label: "Categories", icon: Grid3X3, category: "shop" },
  { id: "featured", label: "Featured", icon: Star, category: "shop" },
  { id: "orders", label: "Orders", icon: ShoppingCart, category: "sales" },
  { id: "preorders", label: "Pre-orders", icon: Bell, category: "sales" },
  { id: "deliveries", label: "Deliveries", icon: Truck, category: "sales" },
  { id: "transactions", label: "Transactions", icon: CreditCard, category: "finance" },
  { id: "reports", label: "Reports", icon: BarChart3, category: "finance" },
  { id: "bank", label: "Bank", icon: Building2, category: "finance" },
  { id: "messages", label: "Messages", icon: MessageSquare, category: "communication" },
  { id: "marketing", label: "Marketing", icon: Send, category: "communication" },
  { id: "email-templates", label: "Templates", icon: Mail, category: "communication" },
  { id: "hero", label: "Hero", icon: ImageIcon, category: "content" },
  { id: "home-content", label: "Home", icon: FolderOpen, category: "content" },
  { id: "videos", label: "Videos", icon: Video, category: "content" },
  { id: "footer", label: "Footer", icon: FolderOpen, category: "content" },
  { id: "support", label: "Support", icon: HelpCircle, category: "content" },
  { id: "admins", label: "System Users", icon: Users, category: "people" },
  { id: "users", label: "Customers", icon: User, category: "people" },
  { id: "storage", label: "Storage", icon: HardDrive, category: "system" },
  { id: "settings", label: "Settings", icon: Settings, category: "system" },
];

// Icon map to resolve icons from saved order
const iconMap: Record<string, any> = {
  LayoutDashboard, Banknote, Package, PackageSearch, CreditCard, Star, Video,
  Grid3X3, ShoppingCart, BarChart3, MessageSquare, Building2,
  HelpCircle, Users, UserCog, User, ImageIcon, FolderOpen,
  HardDrive, Mail, Send, Settings, Bell, Truck,
};

// Sortable menu item component
const SortableMenuItem = ({ 
  tab, 
  isActive, 
  onClick, 
  isReordering 
}: { 
  tab: TabItem; 
  isActive: boolean; 
  onClick: () => void;
  isReordering: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const TabIcon = tab.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left text-sm ${
        isActive
          ? "bg-orange-500 text-white"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      } ${isDragging ? "z-50 shadow-lg" : ""}`}
    >
      {isReordering && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={onClick}
        className="flex items-center gap-3 flex-1"
        disabled={isReordering}
      >
        <TabIcon className="w-4 h-4" />
        <span className="font-medium">{tab.label}</span>
      </button>
    </div>
  );
};

const Admin = () => {
  const { isAdmin, isSuperAdmin, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tabs, setTabs] = useState<TabItem[]>(defaultTabs);
  const [isReordering, setIsReordering] = useState(false);
  const [menuOrderId, setMenuOrderId] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isFullAdmin, setIsFullAdmin] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // Fetch user permissions and check if full admin
  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!user) return;
      
      // Check if user has admin or super_admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      const hasFullAdminRole = roles?.some(r => r.role === "admin" || r.role === "super_admin");
      setIsFullAdmin(hasFullAdminRole || false);
      
      // If not a full admin, fetch granular permissions
      if (!hasFullAdminRole) {
        const { data: permissions } = await supabase
          .from("staff_permissions")
          .select("permission_key")
          .eq("user_id", user.id);
        
        setUserPermissions(permissions?.map(p => p.permission_key) || []);
      }
    };
    
    fetchUserPermissions();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
      fetchMenuOrder();
    }
  }, [isAdmin]);

  const fetchMenuOrder = async () => {
    const { data, error } = await supabase
      .from("admin_menu_order")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setMenuOrderId(data.id);
      const savedOrder = data.menu_items as string[];
      if (savedOrder && savedOrder.length > 0) {
        // Reorder tabs based on saved order
        const orderedTabs = savedOrder
          .map(id => defaultTabs.find(t => t.id === id))
          .filter(Boolean) as TabItem[];
        // Add any new tabs that aren't in saved order
        const newTabs = defaultTabs.filter(t => !savedOrder.includes(t.id));
        setTabs([...orderedTabs, ...newTabs]);
      }
    }
  };

  const saveMenuOrder = async (newTabs: TabItem[]) => {
    const menuItems = newTabs.map(t => t.id);
    
    if (menuOrderId) {
      await supabase
        .from("admin_menu_order")
        .update({ menu_items: menuItems })
        .eq("id", menuOrderId);
    } else {
      const { data } = await supabase
        .from("admin_menu_order")
        .insert({ menu_items: menuItems })
        .select()
        .single();
      if (data) setMenuOrderId(data.id);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTabs((items) => {
        const oldIndex = items.findIndex((t) => t.id === active.id);
        const newIndex = items.findIndex((t) => t.id === over.id);
        const newTabs = arrayMove(items, oldIndex, newIndex);
        saveMenuOrder(newTabs);
        return newTabs;
      });
    }
  };

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const [productsRes, categoriesRes, settingsRes] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("system_settings").select("*").limit(1).maybeSingle(),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (settingsRes.data) setSettings(settingsRes.data);
    if (showLoading) setLoading(false);
  };

  // Define tabs that are always accessible vs permission-gated
  const adminOnlyTabs = ["admins", "staff", "settings"]; // Only for full admins
  
  // Check if user has permission for a specific tab
  const hasTabPermission = (tabId: string): boolean => {
    // Full admins and super admins have access to everything
    if (isFullAdmin || isSuperAdmin) return true;
    
    // Dashboard is always accessible
    if (tabId === "dashboard") return true;
    
    // Admin-only tabs are blocked for staff
    if (adminOnlyTabs.includes(tabId)) return false;
    
    // Check granular permission
    const permissionKey = `tab_${tabId}`;
    return userPermissions.includes(permissionKey);
  };
  
  // Filter tabs based on user permissions
  const filteredTabs = useMemo(() => {
    // Full admins and super admins see all tabs
    if (isFullAdmin || isSuperAdmin) {
      return tabs;
    }
    
    // Staff users only see tabs they have permission for
    return tabs.filter(tab => {
      // Dashboard is always visible
      if (tab.id === "dashboard") return true;
      
      // Admin-only tabs are hidden from staff
      if (adminOnlyTabs.includes(tab.id)) return false;
      
      // Check if user has permission for this tab
      const permissionKey = `tab_${tab.id}`;
      return userPermissions.includes(permissionKey);
    });
  }, [tabs, isFullAdmin, isSuperAdmin, userPermissions]);

  // Ensure activeTab is valid for current user permissions
  useEffect(() => {
    if (!authLoading && !loading && user) {
      // If current tab is not permitted, redirect to dashboard
      if (!hasTabPermission(activeTab)) {
        setActiveTab("dashboard");
        toast({
          title: "Access Restricted",
          description: "You don't have permission to access that section.",
          variant: "destructive",
        });
      }
    }
  }, [activeTab, isFullAdmin, isSuperAdmin, userPermissions, authLoading, loading, user]);

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
      {/* Mobile Sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="right" className="w-72 p-0">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="text-left">Admin Menu</SheetTitle>
          </SheetHeader>
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-80px)]">
            <Link
              to="/home"
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 mb-2 pb-2 border-b border-border/50"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="font-medium">Exit Admin</span>
            </Link>
            {filteredTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as Tab);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left text-sm ${
                    activeTab === tab.id
                      ? "bg-orange-500 text-white"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              to="/home"
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
            {filteredTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full whitespace-nowrap transition-all text-xs font-medium ${
                  activeTab === tab.id
                    ? "bg-orange-500 text-white"
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
        <aside className="hidden lg:flex lg:flex-col w-60 xl:w-64 bg-card border-r border-border p-5 sticky top-0 h-screen overflow-y-auto">
          <div className="flex items-center gap-3 mb-2 pb-3 border-b border-border">
            <button
              onClick={() => setActiveTab("dashboard")}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="font-semibold text-lg text-foreground">Admin</h1>
          </div>

          <Link
            to="/home"
            className="flex items-center gap-2.5 px-3 py-2 mb-3 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="font-medium">Exit Admin</span>
          </Link>

          {isReordering ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={tabs.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <SortableMenuItem
                      key={tab.id}
                      tab={tab}
                      isActive={activeTab === tab.id}
                      onClick={() => setActiveTab(tab.id as Tab)}
                      isReordering={isReordering}
                    />
                  ))}
                </nav>
              </SortableContext>
            </DndContext>
          ) : (
            <>
              <nav className="space-y-1">
                {TAB_CATEGORIES.map((cat) => {
                  const catTabs = filteredTabs.filter(t => (t.category || "main") === cat.key);
                  if (catTabs.length === 0) return null;
                  return (
                    <div key={cat.key}>
                      {cat.label && (
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-3 pt-4 pb-1">{cat.label}</p>
                      )}
                      {catTabs.map((tab) => (
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
                    </div>
                  );
                })}
              </nav>
            </>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:p-6 xl:p-8">
          <div className="container max-w-5xl mx-auto px-4 py-4 lg:px-0 lg:py-0">
            {/* Desktop Header */}
            <div className="hidden lg:block mb-6">
              <h2 className="text-xl font-semibold text-foreground capitalize">{activeTab}</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage your {activeTab} settings</p>
            </div>

            {/* Content - with permission checks */}
            {activeTab === "dashboard" && <AdminDashboard 
              userPermissions={userPermissions}
              isFullAdmin={isFullAdmin}
              onTabChange={(tab) => {
              if (hasTabPermission(tab)) {
                setActiveTab(tab as Tab);
              } else {
                toast({
                  title: "Access Restricted",
                  description: "You don't have permission to access that section.",
                  variant: "destructive",
                });
              }
            }} />}
            {activeTab === "pos" && hasTabPermission("pos") && <QuickPOSTab />}
            {activeTab === "products" && hasTabPermission("products") && (
              <ProductsTab 
                products={products} 
                categories={categories}
                onRefresh={fetchData} 
              />
            )}
            {activeTab === "stock" && hasTabPermission("stock") && <StockManagementTab />}
            {activeTab === "transactions" && hasTabPermission("transactions") && <TransactionsTab />}
            {activeTab === "featured" && hasTabPermission("featured") && <FeaturedProductsTab />}
            {activeTab === "videos" && hasTabPermission("videos") && <VideoShowcasesTab />}
            {activeTab === "categories" && hasTabPermission("categories") && (
              <CategoriesTab 
                categories={categories} 
                onRefresh={fetchData} 
              />
            )}
            {activeTab === "orders" && hasTabPermission("orders") && <PaymentOrdersTab />}
            {activeTab === "preorders" && hasTabPermission("preorders") && <PreordersTab />}
            {activeTab === "deliveries" && hasTabPermission("deliveries") && <DeliveryTab />}
            {activeTab === "reports" && hasTabPermission("reports") && <SalesReportsTab />}
            {activeTab === "messages" && hasTabPermission("messages") && <ContactMessagesTab />}
            {activeTab === "bank" && hasTabPermission("bank") && <BankSettingsTab />}
            {activeTab === "support" && hasTabPermission("support") && <SupportContentTab />}
            {activeTab === "admins" && hasTabPermission("admins") && <SystemUsersTab />}
            {activeTab === "users" && hasTabPermission("users") && <UsersManagementTab />}
            {activeTab === "hero" && hasTabPermission("hero") && <HeroBackgroundsTab />}
            {activeTab === "home-content" && hasTabPermission("home-content") && <HomeContentTab />}
            {activeTab === "storage" && hasTabPermission("storage") && <StorageManagementTab />}
            {activeTab === "email-templates" && hasTabPermission("email-templates") && <EmailTemplatesTab />}
            {activeTab === "marketing" && hasTabPermission("marketing") && <MarketingEmailsTab />}
            {activeTab === "footer" && hasTabPermission("footer") && <FooterSettingsTab />}
            {activeTab === "settings" && hasTabPermission("settings") && settings && (
              <SettingsTab 
                settings={settings} 
                onRefresh={() => fetchData(false)}
                isSuperAdmin={isSuperAdmin}
                isReordering={isReordering}
                onToggleReorder={() => {
                  if (isReordering) {
                    toast({
                      title: "Menu Order Saved",
                      description: "The new menu order has been saved.",
                    });
                  }
                  setIsReordering(!isReordering);
                }}
              />
            )}
            
            {/* Access Denied Message for unpermitted tabs */}
            {!hasTabPermission(activeTab) && activeTab !== "dashboard" && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Settings className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Access Restricted</h3>
                <p className="text-muted-foreground mb-4">You don't have permission to access this section.</p>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
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
    item_code: "",
    hidden_from_shop: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [itemCodeSearch, setItemCodeSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Filtered products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesItemCode = !itemCodeSearch.trim() || 
      (product.item_code && product.item_code.toLowerCase().includes(itemCodeSearch.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || product.category_id === categoryFilter;
    return matchesSearch && matchesItemCode && matchesCategory;
  });
  
  // Specifications state
  const [specifications, setSpecifications] = useState<ProductSpecification[]>([]);
  const [newSpec, setNewSpec] = useState({ name: "", value: "", icon: "box" });
  const [editingSpec, setEditingSpec] = useState<ProductSpecification | null>(null);
  const [loadingSpecs, setLoadingSpecs] = useState(false);

  // Gallery images state
  const [galleryImages, setGalleryImages] = useState<ProductImage[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Product colors state
  const [productColors, setProductColors] = useState<ProductColor[]>([]);
  const [loadingColors, setLoadingColors] = useState(false);
  const [newColor, setNewColor] = useState({ name: "", hex: "#000000" });
  const [colorImageFiles, setColorImageFiles] = useState<File[]>([]);
  const [uploadingColor, setUploadingColor] = useState(false);
  const [expandedColorId, setExpandedColorId] = useState<string | null>(null);
  const [colorImageFile, setColorImageFile] = useState<File | null>(null); // Keep for backwards compatibility

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
    setFormData({ name: "", description: "", price: "", old_price: "", category_id: "", rating: "4.5", in_stock: true, item_code: "", hidden_from_shop: false });
    setImageFile(null);
    setEditingProduct(null);
    setSpecifications([]);
    setGalleryImages([]);
    setProductColors([]);
    setNewSpec({ name: "", value: "", icon: "box" });
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
      item_code: product.item_code || "",
      hidden_from_shop: product.hidden_from_shop ?? false,
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
        icon: newSpec.icon || "box",
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
      setNewSpec({ name: "", value: "", icon: "box" });
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

  const handleUpdateSpec = async () => {
    if (!editingSpec) return;
    
    const { error } = await supabase
      .from("product_specifications")
      .update({
        spec_name: editingSpec.spec_name,
        spec_value: editingSpec.spec_value,
        icon: editingSpec.icon,
      })
      .eq("id", editingSpec.id);
    
    if (error) {
      toast({ 
        title: "Failed to update specification", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      setSpecifications(specifications.map(s => 
        s.id === editingSpec.id ? editingSpec : s
      ));
      setEditingSpec(null);
      toast({ 
        title: "Specification Updated",
        description: `${editingSpec.spec_name} has been updated.`,
      });
    }
  };

  // Drag reordering state for specifications
  const [draggingSpecIndex, setDraggingSpecIndex] = useState<number | null>(null);
  const [dragOverSpecIndex, setDragOverSpecIndex] = useState<number | null>(null);

  const handleSpecDragStart = (e: React.DragEvent, index: number) => {
    setDraggingSpecIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleSpecDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggingSpecIndex !== null && draggingSpecIndex !== index) {
      setDragOverSpecIndex(index);
    }
  };

  const handleSpecDragEnd = async () => {
    if (draggingSpecIndex === null || dragOverSpecIndex === null || draggingSpecIndex === dragOverSpecIndex) {
      setDraggingSpecIndex(null);
      setDragOverSpecIndex(null);
      return;
    }

    // Reorder locally first
    const newSpecs = [...specifications];
    const [movedSpec] = newSpecs.splice(draggingSpecIndex, 1);
    newSpecs.splice(dragOverSpecIndex, 0, movedSpec);

    // Update sort_order values
    const updatedSpecs = newSpecs.map((spec, idx) => ({
      ...spec,
      sort_order: idx
    }));

    setSpecifications(updatedSpecs);
    setDraggingSpecIndex(null);
    setDragOverSpecIndex(null);

    // Save new order to database
    for (let i = 0; i < updatedSpecs.length; i++) {
      await supabase
        .from("product_specifications")
        .update({ sort_order: i })
        .eq("id", updatedSpecs[i].id);
    }

    toast({
      title: "Order Updated",
      description: "Specification order has been saved.",
    });
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

    // Upload first color image if file provided (takes priority) - this becomes the main color image
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
      // Upload additional images as color-linked product_images
      if (colorImageFiles.length > 0) {
        for (let i = 0; i < colorImageFiles.length; i++) {
          const file = colorImageFiles[i];
          const compressedFile = await compressImage(file, 1200, 0.8);
          const fileName = `color-img-${Date.now()}-${i}-${compressedFile.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(fileName, compressedFile);

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("product-images")
              .getPublicUrl(fileName);
            
            // Add to product_images with color_id link
            await supabase.from("product_images").insert({
              product_id: editingProduct.id,
              image_url: urlData.publicUrl,
              color_id: data.id,
              sort_order: galleryImages.length + i,
              is_360: false,
            });
          }
        }
        // Refresh gallery images
        await fetchGalleryImages(editingProduct.id);
      }
      
      setProductColors([...productColors, data as ProductColor]);
      setNewColor({ name: "", hex: "#000000" });
      setColorImageFile(null);
      setColorImageFiles([]);
      setColorImageUrl(null);
      toast({ 
        title: "Color Added",
        description: `${data.color_name} has been added${colorImageFiles.length > 0 ? ` with ${colorImageFiles.length} images` : ''}.`,
      });
    }
    setUploadingColor(false);
  };

  // Add images to existing color
  const handleAddColorImages = async (colorId: string, files: FileList) => {
    if (!editingProduct) return;
    
    setUploadingColor(true);
    const filesToUpload = Array.from(files);
    
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const compressedFile = await compressImage(file, 1200, 0.8);
      const fileName = `color-img-${Date.now()}-${i}-${compressedFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, compressedFile);

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);
        
        await supabase.from("product_images").insert({
          product_id: editingProduct.id,
          image_url: urlData.publicUrl,
          color_id: colorId,
          sort_order: galleryImages.length + i,
          is_360: false,
        });
      }
    }
    
    await fetchGalleryImages(editingProduct.id);
    setUploadingColor(false);
    toast({
      title: "Images Added",
      description: `${filesToUpload.length} image(s) added to color.`,
    });
  };

  // Delete color-specific image
  const handleDeleteColorImage = async (imageId: string) => {
    const { error } = await supabase.from("product_images").delete().eq("id", imageId);
    if (!error) {
      setGalleryImages(galleryImages.filter(img => img.id !== imageId));
      toast({
        title: "Image Removed",
        description: "Color image has been removed.",
      });
    }
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
        item_code: formData.item_code.trim() || null,
        hidden_from_shop: formData.hidden_from_shop,
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

      await onRefresh();
      resetForm();
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">Products</h2>
          <p className="text-xs text-muted-foreground">
            {filteredProducts.length} of {products.length} items
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>
        <div className="relative w-full sm:w-36">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Item code"
            value={itemCodeSearch}
            onChange={(e) => setItemCodeSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-mono"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48 rounded-xl">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Product name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                />
                <input
                  type="text"
                  placeholder="Item Code / SKU"
                  value={formData.item_code}
                  onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent font-mono"
                />
              </div>
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

              {/* Visible in Shop Toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, hidden_from_shop: !formData.hidden_from_shop })}
                  className={`relative inline-flex w-10 h-5 rounded-full transition-colors ${!formData.hidden_from_shop ? "bg-primary" : "bg-muted border border-border"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${!formData.hidden_from_shop ? "translate-x-5" : "translate-x-0"}`} />
                </button>
                <span className="text-sm flex items-center gap-1">
                  {formData.hidden_from_shop ? (
                    <><EyeOff className="w-3.5 h-3.5 text-amber-500" /> Hidden from Shop</>
                  ) : (
                    <><Eye className="w-3.5 h-3.5 text-primary" /> Visible in Shop</>
                  )}
                </span>
              </div>
            </div>

            {/* Main Product Image */}
            <div className="border border-border rounded-xl p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Main Product Image</p>
              <div className="flex items-center gap-4">
                {/* Preview */}
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted/50 border border-border flex-shrink-0 group">
                  {(imageFile || editingProduct?.image_url) ? (
                    <>
                      <img
                        src={imageFile ? URL.createObjectURL(imageFile) : editingProduct?.image_url || ''}
                        alt="Main product"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label className="cursor-pointer p-1.5 bg-background/80 rounded-full hover:bg-background">
                          <Upload className="w-4 h-4 text-foreground" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/70 transition-colors">
                      <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                      <span className="text-[10px] text-muted-foreground">Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {imageFile ? imageFile.name : (editingProduct?.image_url ? 'Current image set' : 'No image selected')}
                  </p>
                  {(imageFile || editingProduct?.image_url) && (
                    <div className="flex gap-2 mt-1.5">
                      <label className="text-xs text-primary cursor-pointer hover:underline">
                        Change
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                      {imageFile && (
                        <button type="button" onClick={() => setImageFile(null)} className="text-xs text-destructive hover:underline">
                          Remove new
                        </button>
                      )}
                    </div>
                  )}
                </div>
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
                    <div className="grid gap-2 mb-3 md:grid-cols-1">
                      {specifications.map((spec, index) => {
                        const isEditing = editingSpec?.id === spec.id;
                        const iconOption = specIconOptions.find(o => o.value === (isEditing ? editingSpec.icon : spec.icon)) || specIconOptions.find(o => o.value === "box");
                        const IconComponent = iconOption?.Icon || Box;
                        const isDragging = draggingSpecIndex === index;
                        const isDragOver = dragOverSpecIndex === index;
                        
                        if (isEditing) {
                          return (
                            <div key={spec.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-primary/10 rounded-lg p-3 border border-primary/30">
                              <Select
                                value={editingSpec.icon || "box"}
                                onValueChange={(value) => setEditingSpec({ ...editingSpec, icon: value })}
                              >
                                <SelectTrigger className="w-full sm:w-[120px] bg-background h-9">
                                  <SelectValue>
                                    {(() => {
                                      const selOption = specIconOptions.find(o => o.value === editingSpec.icon);
                                      const SelIcon = selOption?.Icon || Box;
                                      return <SelIcon className="w-4 h-4" />;
                                    })()}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {specIconOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      <span className="flex items-center gap-2">
                                        <option.Icon className="w-4 h-4" />
                                        <span>{option.label}</span>
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <input
                                type="text"
                                value={editingSpec.spec_name}
                                onChange={(e) => setEditingSpec({ ...editingSpec, spec_name: e.target.value })}
                                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm h-9"
                                placeholder="Name"
                              />
                              <input
                                type="text"
                                value={editingSpec.spec_value}
                                onChange={(e) => setEditingSpec({ ...editingSpec, spec_value: e.target.value })}
                                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm h-9"
                                placeholder="Value"
                              />
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={handleUpdateSpec}
                                  className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30"
                                >
                                  <Save className="w-4 h-4 text-primary" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSpec(null)}
                                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
                                >
                                  <X className="w-4 h-4 text-muted-foreground" />
                                </button>
                              </div>
                            </div>
                          );
                        }
                        
                        return (
                          <div 
                            key={spec.id} 
                            draggable
                            onDragStart={(e) => handleSpecDragStart(e, index)}
                            onDragOver={(e) => handleSpecDragOver(e, index)}
                            onDragEnd={handleSpecDragEnd}
                            className={`flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing transition-all ${
                              isDragging ? 'opacity-50 scale-95' : ''
                            } ${isDragOver ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                          >
                            <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <IconComponent className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="font-medium text-sm flex-1">{spec.spec_name}</span>
                            <span className="text-sm text-muted-foreground flex-1">{spec.spec_value}</span>
                            <button
                              type="button"
                              onClick={() => setEditingSpec(spec)}
                              className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20"
                            >
                              <Pencil className="w-3 h-3 text-primary" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSpec(spec.id, spec.spec_name)}
                              className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20"
                            >
                              <X className="w-3 h-3 text-destructive" />
                            </button>
                          </div>
                        );
                      })}
                      {specifications.length === 0 && (
                        <p className="text-sm text-muted-foreground col-span-2">No specifications yet.</p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Select
                        value={newSpec.icon}
                        onValueChange={(value) => setNewSpec({ ...newSpec, icon: value })}
                      >
                        <SelectTrigger className="w-full sm:w-[160px] bg-background">
                          <SelectValue placeholder="Icon">
                            {(() => {
                              const selectedOption = specIconOptions.find(o => o.value === newSpec.icon);
                              const SelectedIcon = selectedOption?.Icon || Box;
                              return (
                                <span className="flex items-center gap-2">
                                  <SelectedIcon className="w-4 h-4" />
                                  <span className="text-xs truncate">{selectedOption?.label || "Default"}</span>
                                </span>
                              );
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {specIconOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <span className="flex items-center gap-2">
                                <option.Icon className="w-4 h-4" />
                                <span>{option.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input
                        type="text"
                        placeholder="Spec name (e.g., Speed)"
                        value={newSpec.name}
                        onChange={(e) => setNewSpec({ ...newSpec, name: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g., 45 km/h)"
                        value={newSpec.value}
                        onChange={(e) => setNewSpec({ ...newSpec, value: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent text-sm"
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
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary via-accent to-destructive" />
                  <h4 className="font-medium text-sm">Product Colors</h4>
                  <span className="text-xs text-muted-foreground">(unlimited images per color)</span>
                </div>
                
                {loadingColors ? (
                  <p className="text-sm text-muted-foreground">Loading colors...</p>
                ) : (
                  <>
                    {/* Existing colors with expandable image management */}
                    <div className="space-y-2 mb-3">
                      {productColors.map((color) => {
                        const colorImages = galleryImages.filter(img => img.color_id === color.id);
                        const isExpanded = expandedColorId === color.id;
                        const imageCount = colorImages.length + (color.image_url ? 1 : 0);
                        
                        return (
                          <div key={color.id} className="bg-muted/30 rounded-xl p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-6 h-6 rounded-full border-2 border-border flex-shrink-0 shadow-sm"
                                  style={{ backgroundColor: color.color_hex }}
                                />
                                <span className="text-sm font-medium">{color.color_name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {imageCount} image{imageCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setExpandedColorId(isExpanded ? null : color.id)}
                                  className="text-xs text-primary hover:underline"
                                >
                                  {isExpanded ? 'Hide' : 'Manage Images'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteColor(color.id, color.color_name)}
                                  className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20"
                                >
                                  <X className="w-3 h-3 text-destructive" />
                                </button>
                              </div>
                            </div>
                            
                            {/* Expandable image section */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <div className="grid grid-cols-4 gap-2 mb-2">
                                  {/* Main color image */}
                                  {color.image_url && (
                                    <div className="relative group">
                                      <img 
                                        src={color.image_url} 
                                        alt={color.color_name}
                                        className="w-full aspect-square rounded-lg object-cover"
                                      />
                                      <span className="absolute bottom-1 left-1 text-[10px] bg-background/80 px-1 rounded">Main</span>
                                    </div>
                                  )}
                                  {/* Additional color images */}
                                  {colorImages.map((img) => (
                                    <div key={img.id} className="relative group">
                                      <img 
                                        src={img.image_url} 
                                        alt={`${color.color_name} variant`}
                                        className="w-full aspect-square rounded-lg object-cover"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteColorImage(img.id)}
                                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                  {/* Add more images slot */}
                                  <label className="aspect-square rounded-lg border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                                    <Upload className="w-4 h-4 text-muted-foreground mb-1" />
                                    <span className="text-[10px] text-muted-foreground">Add</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      onChange={(e) => e.target.files && handleAddColorImages(color.id, e.target.files)}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {productColors.length === 0 && (
                        <p className="text-sm text-muted-foreground">No colors yet.</p>
                      )}
                    </div>

                    {/* Add new color form */}
                    <div className="bg-muted/20 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground mb-2">Add new color:</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="Color name (e.g., Red, Black)"
                          value={newColor.name}
                          onChange={(e) => handleColorNameChange(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
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
                            {colorImageFile ? '1 file' : 'Main'}
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
                          <label className="flex items-center gap-1 px-3 py-2 rounded-lg border border-dashed border-primary/50 bg-primary/5 cursor-pointer hover:bg-primary/10 text-xs text-primary">
                            <Image className="w-3 h-3" />
                            {colorImageFiles.length > 0 ? `+${colorImageFiles.length}` : '+Extra'}
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => {
                                const files = e.target.files ? Array.from(e.target.files) : [];
                                setColorImageFiles(files);
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddColor}
                          disabled={uploadingColor || !newColor.name.trim()}
                          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap disabled:opacity-50"
                        >
                          {uploadingColor ? "Adding..." : "Add Color"}
                        </button>
                      </div>
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
        {filteredProducts.map((product) => (
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
                {product.item_code && (
                  <p className="text-xs text-primary font-mono">{product.item_code}</p>
                )}
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
        {filteredProducts.length === 0 && (
          <div className="col-span-full text-center py-12">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {searchQuery || categoryFilter !== "all" 
                ? "No products match your search or filter criteria." 
                : "No products yet. Add your first product!"}
            </p>
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
  onRefresh,
  isSuperAdmin,
  isReordering,
  onToggleReorder,
}: { 
  settings: SystemSettings; 
  onRefresh: () => void;
  isSuperAdmin: boolean;
  isReordering: boolean;
  onToggleReorder: () => void;
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
    site_title: settings.site_title || "",
    favicon_url: settings.favicon_url || "",
    og_image_url: settings.og_image_url || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingOgImage, setUploadingOgImage] = useState(false);
  const [showGoogleSetupGuide, setShowGoogleSetupGuide] = useState(false);

  // Track last synced values to detect actual data changes from server
  const [lastSyncedData, setLastSyncedData] = useState({
    site_title: settings.site_title || "",
    favicon_url: settings.favicon_url || "",
    og_image_url: settings.og_image_url || "",
  });
  
  // Sync form data when settings prop changes with new data from server
  useEffect(() => {
    const serverData = {
      site_title: settings.site_title || "",
      favicon_url: settings.favicon_url || "",
      og_image_url: settings.og_image_url || "",
    };
    
    // Only update if server data actually changed (indicating a real refresh)
    if (
      serverData.site_title !== lastSyncedData.site_title ||
      serverData.favicon_url !== lastSyncedData.favicon_url ||
      serverData.og_image_url !== lastSyncedData.og_image_url
    ) {
      setFormData({
        site_name: settings.site_name,
        logo_url: settings.logo_url || "",
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        hero_title: settings.hero_title,
        hero_subtitle: settings.hero_subtitle,
        notification_email: settings.notification_email || "",
        notification_sender_name: settings.notification_sender_name || "RC Joy",
        google_login_enabled: settings.google_login_enabled ?? true,
        site_title: settings.site_title || "",
        favicon_url: settings.favicon_url || "",
        og_image_url: settings.og_image_url || "",
      });
      setLastSyncedData(serverData);
    }
  }, [settings]);

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

  const handleFaviconUpload = async (file: File | null) => {
    if (!file) return;
    
    setUploadingFavicon(true);
    try {
      const fileName = `favicon-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      setFormData({ ...formData, favicon_url: urlData.publicUrl });
      toast({ 
        title: "Favicon Uploaded",
        description: "Your new favicon has been uploaded. Save settings to apply.",
      });
    } catch (error: any) {
      toast({ 
        title: "Upload Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleOgImageUpload = async (file: File | null) => {
    if (!file) return;
    
    setUploadingOgImage(true);
    try {
      const fileName = `og-image-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      setFormData({ ...formData, og_image_url: urlData.publicUrl });
      toast({ 
        title: "Share Image Uploaded",
        description: "Your new share image has been uploaded. Save settings to apply.",
      });
    } catch (error: any) {
      toast({ 
        title: "Upload Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setUploadingOgImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const trimmedData = {
      site_name: formData.site_name.trim(),
      logo_url: formData.logo_url || null,
      primary_color: formData.primary_color,
      secondary_color: formData.secondary_color,
      hero_title: formData.hero_title.trim(),
      hero_subtitle: formData.hero_subtitle.trim(),
      notification_email: formData.notification_email.trim() || null,
      notification_sender_name: formData.notification_sender_name.trim() || "RC Joy",
      google_login_enabled: formData.google_login_enabled,
      site_title: formData.site_title.trim() || null,
      favicon_url: formData.favicon_url || null,
      og_image_url: formData.og_image_url || null,
    };

    try {
      const { error } = await supabase
        .from("system_settings")
        .update(trimmedData)
        .eq("id", settings.id);

      if (error) throw error;
      
      // Update document metadata immediately after successful save
      if (trimmedData.site_title) {
        document.title = trimmedData.site_title;
      }
      if (trimmedData.favicon_url) {
        let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
        if (favicon) favicon.href = trimmedData.favicon_url;
      }
      if (trimmedData.og_image_url) {
        const ogImage = document.querySelector("meta[property='og:image']") as HTMLMetaElement;
        if (ogImage) ogImage.content = trimmedData.og_image_url;
        const twitterImage = document.querySelector("meta[name='twitter:image']") as HTMLMetaElement;
        if (twitterImage) twitterImage.content = trimmedData.og_image_url;
      }
      
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
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">System Settings</h2>
            <p className="text-xs text-muted-foreground">Configure your site appearance</p>
          </div>
          {isSuperAdmin && (
            <Button
              variant={isReordering ? "default" : "outline"}
              size="sm"
              onClick={onToggleReorder}
              className="gap-2"
            >
              <GripVertical className="w-4 h-4" />
              {isReordering ? "Done" : "Reorder Menu"}
            </Button>
          )}
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
                  value={formData.notification_email || ""}
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
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground">Google Login</h4>
                  <button
                    type="button"
                    onClick={() => setShowGoogleSetupGuide(!showGoogleSetupGuide)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Setup guide for custom branding"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Allow users to sign in with Google</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, google_login_enabled: !formData.google_login_enabled })}
                className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
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

            {/* Google OAuth Setup Guide */}
            {showGoogleSetupGuide && (
              <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border space-y-4">
                <div className="flex items-start justify-between">
                  <h5 className="font-medium text-foreground text-sm">Custom Branding Setup Guide</h5>
                  <button
                    type="button"
                    onClick={() => setShowGoogleSetupGuide(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  By default, Google's consent screen shows generic branding. To display "Sign in to RC Joy" instead, follow these steps:
                </p>

                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <h6 className="text-xs font-semibold text-foreground mb-2">1. Google Cloud Console</h6>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Go to <span className="font-medium text-foreground">console.cloud.google.com</span></li>
                      <li>Create a new project or select existing one</li>
                      <li>Go to <span className="font-medium text-foreground">APIs & Services → OAuth consent screen</span></li>
                      <li>Set <span className="font-medium text-foreground">App name</span> to "RC Joy"</li>
                      <li>Add your domain: <span className="font-medium text-foreground">rcjoy.store</span></li>
                      <li>Configure scopes: email, profile, openid</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-background border border-border">
                    <h6 className="text-xs font-semibold text-foreground mb-2">2. Create OAuth Credentials</h6>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Go to <span className="font-medium text-foreground">APIs & Services → Credentials</span></li>
                      <li>Click <span className="font-medium text-foreground">Create Credentials → OAuth Client ID</span></li>
                      <li>Application type: <span className="font-medium text-foreground">Web application</span></li>
                      <li>Name: "RC Joy Web"</li>
                      <li>Add the <span className="font-medium text-foreground">Authorized redirect URI</span> from Cloud Dashboard</li>
                      <li>Copy your <span className="font-medium text-foreground">Client ID</span> and <span className="font-medium text-foreground">Client Secret</span></li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-background border border-border">
                    <h6 className="text-xs font-semibold text-foreground mb-2">3. Configure in Admin Settings</h6>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Open your <span className="font-medium text-foreground">Cloud Dashboard</span> (button below)</li>
                      <li>Go to <span className="font-medium text-foreground">Users → Auth Settings → Google</span></li>
                      <li>Copy the redirect URL shown → paste into Google Console</li>
                      <li>Enter your Client ID and Client Secret</li>
                    </ul>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground italic">
                  💡 Tip: After setup, users will see "Sign in to RC Joy" on Google's consent screen.
                </p>
              </div>
            )}
          </div>

          {/* Website Info Section */}
          <div className="pt-4 border-t border-border">
            <h4 className="font-medium text-foreground mb-3">Website Info (SEO)</h4>
            <p className="text-xs text-muted-foreground mb-4">Configure your site's title, favicon, and social share image</p>
            
            <div className="space-y-4">
              {/* Site Title */}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Page Title</label>
                <input
                  type="text"
                  value={formData.site_title}
                  onChange={(e) => setFormData({ ...formData, site_title: e.target.value })}
                  placeholder="e.g., RC Joy - Premium RC Toys"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This appears in browser tabs and search results.
                </p>
              </div>

              {/* Favicon */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Favicon</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border flex-shrink-0">
                    {formData.favicon_url ? (
                      <img src={formData.favicon_url} alt="Favicon" className="w-full h-full object-contain" />
                    ) : (
                      <Image className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {uploadingFavicon ? "Uploading..." : "Upload favicon"}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/x-icon,image/ico"
                        onChange={(e) => handleFaviconUpload(e.target.files?.[0] || null)}
                        className="hidden"
                        disabled={uploadingFavicon}
                      />
                    </label>
                    {formData.favicon_url && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, favicon_url: "" })}
                        className="text-sm text-destructive mt-2 hover:underline"
                      >
                        Remove favicon
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Small icon shown in browser tabs. Use a square PNG or ICO file.
                </p>
              </div>

              {/* Share Image (OG Image) */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Share Image</label>
                <div className="flex flex-col gap-3">
                  <div className="w-full aspect-video max-w-xs rounded-xl bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
                    {formData.og_image_url ? (
                      <img src={formData.og_image_url} alt="Share Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <span className="text-xs text-muted-foreground">1200 x 630px recommended</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors max-w-xs">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {uploadingOgImage ? "Uploading..." : "Upload share image"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleOgImageUpload(e.target.files?.[0] || null)}
                        className="hidden"
                        disabled={uploadingOgImage}
                      />
                    </label>
                    {formData.og_image_url && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, og_image_url: "" })}
                        className="text-sm text-destructive mt-2 hover:underline"
                      >
                        Remove share image
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This image appears when your site is shared on social media (Facebook, Twitter, WhatsApp).
                </p>
              </div>
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
