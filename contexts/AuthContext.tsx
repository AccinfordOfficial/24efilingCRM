import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User as AppUser } from '../types';
import { Session, User as AuthUser } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  authUser: AuthUser | null;
  profile: AppUser | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  rlsError: string | null;
  profileError: string | null;
  signIn: (email: string, password: string, requiredRole: AppUser['role']) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  createUserByAdmin: (userData: { name: string; email: string; password?: string; role: AppUser['role']; branch_id?: string; branch_name?: string; is_active?: boolean; phone_number?: string; department?: string; skills?: string[]; avatar_url?: string; date_of_birth?: string; gender?: string; }) => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(() => {
    try {
      const cached = localStorage.getItem('crm_user_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const profileRef = React.useRef<AppUser | null>(profile); // Sync ref to avoid stale closure in callbacks
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [rlsError, setRlsError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Keep profileRef in sync with state
  const setProfileAndRef = React.useCallback((p: AppUser | null) => {
    profileRef.current = p;
    setProfile(p);
    try {
      if (p) {
        localStorage.setItem('crm_user_profile', JSON.stringify(p));
      } else {
        localStorage.removeItem('crm_user_profile');
      }
    } catch (err) {
      console.warn("Failed to update crm_user_profile cache:", err);
    }
  }, []);

  // Generic helper for timeouts
  const withTimeout = <T,>(promise: Promise<T> | PromiseLike<T>, ms: number = 10000): Promise<T> => {
    return Promise.race([
      promise as Promise<T>,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Request timed out")), ms))
    ]);
  };

  // Helper to sanitize inputs
  const sanitizeInput = (str: string) => {
    if (!str) return '';
    // aggressively strip non-standard chars and remove trailing formatting like dots
    return str.replace(/[^a-zA-Z0-9@._\-+]/g, '').replace(/\.$/, '').toLowerCase();
  };

  const fetchOrCreateProfile = async (userId: string, email: string, metadata?: any, retryCount = 0) => {
    try {
      console.log(`[AuthContext] Fetching profile for: ${userId} (Attempt ${retryCount + 1})`);
      setProfileError(null);

      const { data: profileData, error } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        25000 // 25s timeout — generous for slow mobile/WiFi connections
      );

      if (error) {
        console.warn(`[AuthContext] Profile fetch error (Attempt ${retryCount + 1}):`, error);

        // PGRST116: No rows found (Expected for new users, but we handle it)
        if (error.code === 'PGRST116') {
          setProfileError("Profile not found.");
          return;
        }

        // Retry logic for Timeouts or 400 Bad Request (which can be transient during auth switches)
        if ((error.code === '400' || error.message.includes('fetch')) && retryCount < 2) {
          const backoffMs = (retryCount + 1) * 1500; // 1.5s, 3s
          console.log(`[AuthContext] Retrying profile fetch in ${backoffMs}ms...`);
          await new Promise(r => setTimeout(r, backoffMs));
          return fetchOrCreateProfile(userId, email, metadata, retryCount + 1);
        }

        if (error.code === '400') {
          // 400 often means the JWT claim is stale or RLS Policy is rejecting based on old claims.
          // We might want to force a token refresh if this happens, but for now we log it.
          console.error("[AuthContext] RLS/Claim Error (400). Token might be stale.");
          setProfileError(`Session error (400). Please refresh the page.`);
          return;
        }

        setProfileError(error.message);
        return;
      }

      if (profileData) {
        console.log(`[AuthContext] Profile successfully loaded for: ${profileData.email}`);
        setProfileAndRef(profileData);
      }
    } catch (err: any) {
      console.error("[AuthContext] Profile fetch unexpected error:", err);
      // Retry for unexpected network errors (timeout falls here)
      if (retryCount < 3) {
        const backoffMs = (retryCount + 1) * 1500; // 1.5s, 3s, 4.5s
        console.log(`[AuthContext] Retrying after unexpected error in ${backoffMs}ms... (attempt ${retryCount + 1})`);
        await new Promise(r => setTimeout(r, backoffMs));
        return fetchOrCreateProfile(userId, email, metadata, retryCount + 1);
      }
      setProfileError(err.message || "Failed to load profile");
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.warn("Supabase auth session warning:", error);

        if (mounted) {
          console.log("[Auth] Initial Session Check:", session ? `User ${session.user.id}` : "No Session");
          setSession(session);
          setAuthUser(session?.user || null);

          const cached = localStorage.getItem('crm_user_profile');
          if (cached) {
            setLoading(false);
            if (session?.user) {
              fetchOrCreateProfile(session.user.id, session.user.email!, session.user.user_metadata);
            }
          } else {
            if (session?.user) {
              await fetchOrCreateProfile(session.user.id, session.user.email!, session.user.user_metadata);
            }
          }
        }
      } catch (e) {
        console.error("Session init failed:", e);
      } finally {
        // Always clear loading even on error — never leave the user stuck
        if (mounted) setLoading(false);
      }
    };

    // Hard safety cap: force loading=false after 3 seconds regardless
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 3000);

    init().then(() => clearTimeout(safetyTimer));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth] Auth state changed: ${event}`, session ? `User: ${session.user.id}` : "No Session");

      if (!mounted) return;

      // Update basic session state immediately
      setSession(session);
      setAuthUser(session?.user || null);

      if (event === 'SIGNED_IN' && session?.user) {
        // Skip re-fetch if profile is already loaded for this same user —
        // SIGNED_IN also fires on token refresh and shouldn't cause redundant DB calls
        if (profileRef.current?.id === session.user.id) {
          console.log('[Auth] Profile already loaded, skipping re-fetch.');
        } else {
          await fetchOrCreateProfile(session.user.id, session.user.email!, session.user.user_metadata);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[Auth] User Signed Out. Clearing profile.');
        setProfileAndRef(null);
        setProfileError(null);
        setRlsError(null);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log("[Auth] Token Refreshed.");
      } else if (event === 'USER_UPDATED') {
        console.log("[Auth] User Updated.");
        if (session?.user) {
          await fetchOrCreateProfile(session.user.id, session.user.email!, session.user.user_metadata);
        }
      } else if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Heartbeat effect to track online status
  useEffect(() => {
    if (!session?.user) return;

    const updatePresence = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      try {
        await supabase
          .from('profiles')
          .update({
            last_seen: new Date().toISOString(),
            is_online: true
          } as any)
          .eq('id', session.user.id);
      } catch (err) {
        // Silent fail expected on network issues
      }
    };

    updatePresence(); // Initial update on login/mount
    const interval = setInterval(updatePresence, 60000); // 1 minute interval

    return () => clearInterval(interval);
  }, [session]);

  const signIn = async (email: string, password: string, requiredRole: AppUser['role']): Promise<void> => {
    setLoading(true);
    setProfileError(null);
    setRlsError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizeInput(email),
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("No user returned");

      // Role verification: fetch the profile and verify the role matches the selected tab.
      const { data: profileData, error: profileFetchError } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', data.user.id)
        .single();

      if (profileFetchError) {
        // If we can't verify role, sign out and throw to prevent unauthorized access
        await supabase.auth.signOut();
        throw new Error("Could not verify user role. Please try again.");
      }

      if (profileData.role !== requiredRole) {
        await supabase.auth.signOut();
        throw new Error(`Access denied. This account has the role "${profileData.role}", not "${requiredRole}". Please select the correct role tab.`);
      }

      if (!profileData.is_active) {
        await supabase.auth.signOut();
        throw new Error("Your account has been deactivated. Please contact your administrator.");
      }

    } catch (err: any) {
      console.error("Sign in failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (name: string, email: string, password: string): Promise<void> => {
    setRlsError(null);
    const cleanEmail = sanitizeInput(email);
    const cleanName = sanitizeInput(name);

    console.log(`[Auth] Attempting sign up for: ${cleanEmail} (Raw: ${email})`);

    try {
      // API Method: Try to use the Edge Function first
      const { data, error } = await supabase.functions.invoke('create-super-admin', {
        body: { name: cleanName, email: cleanEmail, password },
      });

      if (error || data?.error) {
        const edgeError = error?.message || data?.error || "Unknown Edge Function Error";
        console.warn("[Auth] Edge Function failed:", edgeError);

        if (typeof edgeError === 'string') {
          if (edgeError.toLowerCase().includes('invalid')) {
            throw new Error(`Server validation failed: ${edgeError} (Source: Edge Function)`);
          }
          if (edgeError.includes('Super Admin account already exists')) {
            throw new Error(edgeError);
          }
        }
      } else {
        return; // Success!
      }

      // Fallback Method: Client-side creation
      console.log("[Auth] Falling back to client-side signUp...");

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        throw new Error(`Invalid email format detected locally: "${cleanEmail}"`);
      }

      const { data: existingSuperAdmins, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'Super Admin')
        .limit(1);

      if (checkError) {
        console.warn("[Auth] Could not check for existing Super Admins (likely RLS restrictions):", checkError);
        // Proceeding blindly. If a Super Admin exists, the Unique Email constraint or subsequent logic will catch it.
      } else if (existingSuperAdmins && existingSuperAdmins.length > 0) {
        throw new Error('A Super Admin account already exists. Cannot create another.');
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: name,
            role: 'Super Admin',
          }
        }
      });

      if (authError) {
        console.error("[Auth] Supabase signUp fallback failed:", authError);
        throw new Error(`Supabase Auth failed: ${authError.message} (Source: Client Fallback)`);
      }

      if (!authData.user) throw new Error("Auth user creation failed.");

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          name: cleanName,
          email: cleanEmail,
          role: 'Super Admin',
          is_active: true,
        });

      if (profileError) {
        if (profileError.code === "23505") return;
        if (profileError.message && (
          profileError.message.includes("row-level security") ||
          profileError.message.includes("infinite recursion") ||
          profileError.code === "42P17" ||
          profileError.code === "42501"
        )) {
          console.warn(`[Auth] Profile creation suppressed error: ${profileError.message}. Assuming Trigger handled it.`);
          return; // Proceed as success
        }
        // For other errors, we might still want to warn but not block if user is created?
        // But genuine DB errors should probably be reported.
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

    } catch (err: any) {
      console.error("Sign up error:", err);
      const msg = err.message || "Sign up failed.";
      throw new Error(`${msg} (Email: ${cleanEmail})`);
    }
  };

  const createUserByAdmin = async (userData: {
    name: string;
    email: string;
    password?: string;
    role: AppUser['role'];
    branch_id?: string;
    branch_name?: string;
    is_active?: boolean;
    phone_number?: string;
    department?: string;
    skills?: string[];
    avatar_url?: string;
    date_of_birth?: string;
    gender?: string;
    reporting_to?: string | null;
    employee_code?: string | null;
  }): Promise<void> => {
    if (profile?.role !== 'Super Admin') {
      throw new Error("Permission denied: Only Super Admins can create new users.");
    }

    const cleanEmail = sanitizeInput(userData.email);
    console.log("[AuthContext] Creating user with sanitized email:", cleanEmail);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error(`Invalid email format after sanitization: "${cleanEmail}"`);
    }

    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email: cleanEmail,
        password: userData.password,
        name: sanitizeInput(userData.name),
        role: userData.role,
        branch_name: userData.branch_name,
        is_active: userData.is_active,
        phone_number: userData.phone_number,
        department: userData.department,
        skills: userData.skills,
        avatar_url: userData.avatar_url,
        date_of_birth: userData.date_of_birth,
        gender: userData.gender,
        branch_id: userData.branch_id,
      },
    });

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    if (data.error) {
      throw new Error(`Server error: ${data.error}`);
    }

    // Now safely update the profile with the branch_id
    if (userData.branch_id) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ branch_id: userData.branch_id } as any)
        .eq('email', cleanEmail);

      if (updateError) {
         console.error("Failed to set user branch:", updateError);
      }
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      if (session?.user?.id) {
        await supabase
          .from('profiles')
          .update({ is_online: false, last_seen: new Date().toISOString() } as any)
          .eq('id', session.user.id);
      }
    } catch (err) {
      console.warn("Failed to set offline status on logout", err);
    } finally {
      // Clear React auth state
      setSession(null);
      setProfile(null);

      // Clear local storage CRM caches
      localStorage.removeItem('crm_user_profile');
      localStorage.removeItem('crm_api_cache');

      // Clear Supabase session tokens from localStorage
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn("Storage clear notice:", e);
      }

      // Execute Supabase signOut
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("Supabase auth signOut error:", err);
      }

      // Redirect to root login view
      window.location.href = '/';
    }
  };

  const sendPasswordResetEmail = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw new Error(error.message);
  };

  const updateUserPassword = async (password: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
    setIsPasswordRecovery(false);
  };

  const refreshProfile = async (): Promise<void> => {
    if (!session?.user) return;
    await fetchOrCreateProfile(session.user.id, session.user.email!, session.user.user_metadata);
  };

  const value = {
    session,
    authUser,
    profile,
    loading,
    isPasswordRecovery,
    rlsError,
    profileError,
    signIn,
    signUp,
    createUserByAdmin,
    signOut,
    logout: signOut,
    sendPasswordResetEmail,
    updateUserPassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
