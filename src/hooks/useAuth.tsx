import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isStaff: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const checkAdminRole = async (userId: string) => {
    try {
      // Check for admin/super_admin roles
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .or("role.eq.admin,role.eq.super_admin")
        .limit(1);
      
      if (roleError) {
        console.error("Error checking admin role:", roleError);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsStaff(false);
        return;
      }
      
      const hasAdminRole = roleData && roleData.length > 0;
      const hasSuperAdminRole = roleData?.some(r => r.role === 'super_admin') || false;
      
      // If not admin, check if user has staff permissions
      if (!hasAdminRole) {
        const { data: staffData, error: staffError } = await supabase
          .from("staff_permissions")
          .select("permission_key")
          .eq("user_id", userId)
          .limit(1);
        
        if (!staffError && staffData && staffData.length > 0) {
          // User is a staff member with permissions
          setIsStaff(true);
          setIsAdmin(true); // Grant admin panel access
          setIsSuperAdmin(false);
          return;
        }
      }
      
      setIsAdmin(hasAdminRole);
      setIsSuperAdmin(hasSuperAdminRole);
      setIsStaff(false);
    } catch (error) {
      console.error("Error checking admin role:", error);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setIsStaff(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Get initial session first
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await checkAdminRole(session.user.id);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // Then set up the listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to prevent potential deadlock with Supabase client
          setTimeout(() => {
            if (mounted) checkAdminRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setIsStaff(false);
        }
        
        // Only update loading if we've already initialized
        if (initialized) {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [initialized]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      // Clear local state first
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setIsStaff(false);
      
      // Then attempt to sign out from Supabase (ignore errors if session already expired)
      await supabase.auth.signOut();
    } catch (error) {
      console.log("Sign out completed (session may have already expired)");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAdmin,
        isSuperAdmin,
        isStaff,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
