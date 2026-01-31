import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Check, User as UserIcon, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import rcJoyLogo from "@/assets/rc-joy-logo.jpg";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [googleLoginEnabled, setGoogleLoginEnabled] = useState(true);
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("logo_url, google_login_enabled")
        .limit(1)
        .maybeSingle();
      
      if (data) {
        if (data.logo_url) setLogoUrl(data.logo_url);
        setGoogleLoginEnabled(data.google_login_enabled ?? true);
      }
    };
    fetchSettings();
  }, []);

  // Check if user is already logged in and redirect
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        navigate("/home", { replace: true });
      }
    };
    checkAuthAndRedirect();
  }, [navigate]);

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: "Enter your email", description: "Please enter your email address first.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reset Email Sent", description: "Check your email for the password reset link." });
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      
      // If redirected to Google, the page will redirect - nothing more to do
      if (result.redirected) {
        return;
      }
      
      if (result.error) {
        toast({
          title: "Google login failed",
          description: result.error.message,
          variant: "destructive",
        });
        setGoogleLoading(false);
        return;
      }
      
      // If we get here, login was successful (returned from OAuth with tokens)
      toast({
        title: "Welcome!",
        description: "You have successfully logged in with Google.",
      });
      navigate("/home");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Login failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "You have successfully logged in.",
          });
          navigate("/");
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Account created!",
            description: "Welcome to RC Joy!",
          });
          navigate("/");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-md mx-auto px-4 pt-8 pb-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Header with system logo */}
        <div className="glass-card rounded-3xl p-8 text-center shadow-soft">
          <div className="w-20 h-20 mx-auto mb-4 overflow-hidden flex items-center justify-center">
            <img 
              src={logoUrl || rcJoyLogo} 
              alt="Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {isLogin ? "Welcome Back!" : "Create Account"}
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            {isLogin ? "Sign in to continue" : "Join us today"}
          </p>
        </div>

        {/* Toggle buttons */}
        <div className="flex mt-6 glass-card rounded-full p-1 shadow-soft">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-3 rounded-full font-medium transition-all ${
              isLogin
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-3 rounded-full font-medium transition-all ${
              !isLogin
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Google Login Button */}
        {googleLoginEnabled && (
          <>
            <button 
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full mt-6 py-3.5 rounded-2xl glass-card border border-border flex items-center justify-center gap-3 hover:bg-white/80 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="font-medium text-foreground">
                {googleLoading ? "Connecting..." : "Continue with Google"}
              </span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground">or continue with email</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-sm text-muted-foreground">Full Name</label>
              <div className="mt-1 relative">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-3 pl-10 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                required={!isLogin}
              />
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm text-muted-foreground">Email address</label>
            <div className="mt-1 relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 pl-10 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">
              {isLogin ? "Password" : "Enter Password"}
            </label>
            <div className="mt-1 relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password.."
                className="w-full px-4 py-3 pl-10 pr-10 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {isLogin ? (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    rememberMe
                      ? "bg-primary border-primary"
                      : "border-border"
                  }`}
                >
                  {rememberMe && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-sm text-coral font-medium hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          ) : (
            <label className="flex items-start gap-2 cursor-pointer">
              <div
                onClick={() => setRememberMe(!rememberMe)}
                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 mt-0.5 ${
                  rememberMe
                    ? "bg-primary border-primary"
                    : "border-border"
                }`}
              >
                {rememberMe && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
              <span className="text-sm text-muted-foreground">
                I agree to the{" "}
                <span className="font-semibold text-foreground">Terms & Conditions</span>{" "}
                and{" "}
                <span className="font-semibold text-foreground">Privacy Policy</span>
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-full bg-primary text-primary-foreground font-semibold shadow-soft hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Please wait..." : isLogin ? "Log In" : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Continue as Guest →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
