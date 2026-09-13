'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, Business } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface TenantContextType {
  user: Profile | null;
  businesses: Business[];
  currentBusiness: Business | null;
  setCurrentBusiness: (biz: Business) => void;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    name: string,
    businessName: string,
    email: string,
    password: string,
    businessType?: string,
    currency?: string
  ) => Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
}

const TenantContext = createContext<TenantContextType>({
  user: null,
  businesses: [],
  currentBusiness: null,
  setCurrentBusiness: () => {},
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  forgotPassword: async () => ({ success: false, message: '' }),
  logout: async () => {},
  loading: true,
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<Profile | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  // Ask the server (which knows the real, cookie-based Supabase session) who
  // is logged in, and make sure they have a business workspace.
  const loadSessionFromServer = async (): Promise<boolean> => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (meData.success && meData.authenticated && meData.user && meData.business) {
        setUser(meData.user);
        setCurrentBusiness(meData.business);
        setBusinesses(meData.businesses || [meData.business]);
        return true;
      }
    } catch (e) {
      console.error('Failed to load session from server', e);
    }
    return false;
  };

  const initializeTenantSession = async () => {
    setLoading(true);
    try {
      // Source of truth is the real Supabase auth session (managed via
      // cookies + middleware), not localStorage.
      const { data: authData } = await supabase.auth.getUser();

      if (authData?.user) {
        const ok = await loadSessionFromServer();
        if (!ok) {
          setUser(null);
          setCurrentBusiness(null);
          setBusinesses([]);
        }
      } else {
        setUser(null);
        setCurrentBusiness(null);
        setBusinesses([]);
      }
    } catch (err) {
      console.error('Session initialization error:', err);
      setUser(null);
      setCurrentBusiness(null);
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeTenantSession();

    // Keep state in sync if the user signs in/out in another tab, or the
    // session gets refreshed.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        setCurrentBusiness(null);
        setBusinesses([]);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetCurrentBusiness = (biz: Business) => {
    setCurrentBusiness(biz);
  };

  // Sign In with Email and Password — this now genuinely verifies the
  // password against Supabase Auth. Wrong password / unknown email will
  // correctly return an error instead of silently "succeeding".
  const signIn = async (emailInput: string, passwordInput: string) => {
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !passwordInput) {
      return { success: false, error: 'Please enter your email address and password.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: passwordInput,
    });

    if (error || !data.user) {
      return { success: false, error: error?.message || 'Invalid email or password.' };
    }

    const ok = await loadSessionFromServer();
    if (!ok) {
      return { success: false, error: 'Signed in, but could not load your workspace. Please try again.' };
    }

    return { success: true };
  };

  // Sign Up with Name, Business Name, Email and Password — creates a real
  // Supabase Auth user. The business workspace is provisioned the first
  // time /api/auth/me is called (see route), using the metadata below.
  const signUp = async (
    nameInput: string,
    businessNameInput: string,
    emailInput: string,
    passwordInput: string,
    businessType: string = 'General Business',
    currency: string = 'INR'
  ) => {
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanName = nameInput.trim() || cleanEmail.split('@')[0];
    const cleanBizName = businessNameInput.trim() || `${cleanName}'s Business Workspace`;

    if (!cleanEmail || !passwordInput) {
      return { success: false, error: 'Please enter your email address and password.' };
    }
    if (passwordInput.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: passwordInput,
      options: {
        data: {
          name: cleanName,
          business_name: cleanBizName,
          business_type: businessType,
          currency,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // If email confirmation is required in your Supabase project settings,
    // there will be no active session yet.
    if (!data.session) {
      return {
        success: true,
        needsEmailConfirmation: true,
        error: 'Account created! Please check your email to confirm your address before signing in.',
      };
    }

    const ok = await loadSessionFromServer();
    if (!ok) {
      return { success: false, error: 'Account created, but we could not set up your workspace. Please try signing in.' };
    }

    return { success: true };
  };

  // Forgot Password Request
  const forgotPassword = async (emailInput: string) => {
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: '', error: 'Please enter a valid email address.' };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
    });

    if (error) {
      return { success: false, message: '', error: error.message };
    }

    return {
      success: true,
      message: `If an account exists for ${cleanEmail}, a password reset link has been sent.`,
    };
  };

  // Logout Functionality
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error signing out', e);
    }

    setUser(null);
    setCurrentBusiness(null);
    setBusinesses([]);

    window.location.href = '/login';
  };

  return (
    <TenantContext.Provider
      value={{
        user,
        businesses,
        currentBusiness,
        setCurrentBusiness: handleSetCurrentBusiness,
        signIn,
        signUp,
        forgotPassword,
        logout,
        loading,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
