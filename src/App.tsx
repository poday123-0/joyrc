import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { CartProvider } from "@/hooks/useCart";
import { AuthProvider } from "@/hooks/useAuth";
import { useEffect, useState, ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import SiteMetadata from "@/components/SiteMetadata";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import Login from "./pages/Login";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Categories from "./pages/Categories";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";

// Redirect desktop users from landing to home
const LandingOrHome = () => {
  const isMobile = useIsMobile();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait a tick for isMobile to be determined
    const timer = setTimeout(() => setIsReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Show nothing briefly while detecting device
  if (!isReady || isMobile === undefined) {
    return <div className="min-h-screen bg-background" />;
  }
  
  // On desktop, go directly to home
  if (isMobile === false) {
    return <Navigate to="/home" replace />;
  }
  
  // On mobile, show landing with swipe
  return <Landing />;
};

const queryClient = new QueryClient();

// Page transition wrapper
const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [content, setContent] = useState(children);

  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => {
      setContent(children);
      setIsVisible(true);
    }, 150);
    return () => clearTimeout(timer);
  }, [location.pathname, children]);

  return (
    <div
      className={`min-h-screen transition-opacity duration-200 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {content}
    </div>
  );
};

const AppRoutes = () => (
  <PageTransition>
    <Routes>
      <Route path="/" element={<LandingOrHome />} />
      <Route path="/home" element={<Index />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/categories" element={<Categories />} />
      <Route path="/support" element={<Support />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </PageTransition>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <SiteMetadata />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
