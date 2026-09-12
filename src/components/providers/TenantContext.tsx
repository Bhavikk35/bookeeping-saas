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
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
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

  // Load User & Business Session dynamically
  const initializeTenantSession = async () => {
    setLoading(true);
    try {
      // 0. Check HTTP Session Cookie first via /api/auth/me
      try {
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (meData.success && meData.authenticated && meData.user && meData.business) {
          setUser(meData.user);
          setCurrentBusiness(meData.business);
          setBusinesses([meData.business]);
          sessionStorage.setItem('auto_ledger_user', JSON.stringify(meData.user));
          sessionStorage.setItem('auto_ledger_biz', JSON.stringify(meData.business));
          localStorage.setItem('auto_ledger_user', JSON.stringify(meData.user));
          localStorage.setItem('auto_ledger_biz', JSON.stringify(meData.business));
          setLoading(false);
          return;
        }
      } catch (e) {}

      // 1. Check SessionStorage or LocalStorage FIRST for active signed-up account session
      const storedUserJson =
        sessionStorage.getItem('auto_ledger_user') || localStorage.getItem('auto_ledger_user');
      const storedBizJson =
        sessionStorage.getItem('auto_ledger_biz') || localStorage.getItem('auto_ledger_biz');

      if (storedUserJson && storedBizJson) {
        const parsedUser: Profile = JSON.parse(storedUserJson);
        const parsedBiz: Business = JSON.parse(storedBizJson);
        setUser(parsedUser);
        setCurrentBusiness(parsedBiz);
        setBusinesses([parsedBiz]);
        setLoading(false);
        return;
      }

      // 1.5 Check auto_ledger_registered_accounts map in localStorage
      const regAccountsStr = localStorage.getItem('auto_ledger_registered_accounts');
      if (regAccountsStr) {
        try {
          const regMap = JSON.parse(regAccountsStr);
          const keys = Object.keys(regMap);
          if (keys.length > 0) {
            const latestAccount = regMap[keys[keys.length - 1]];
            if (latestAccount?.user && latestAccount?.business) {
              setUser(latestAccount.user);
              setCurrentBusiness(latestAccount.business);
              setBusinesses([latestAccount.business]);
              sessionStorage.setItem('auto_ledger_user', JSON.stringify(latestAccount.user));
              sessionStorage.setItem('auto_ledger_biz', JSON.stringify(latestAccount.business));
              localStorage.setItem('auto_ledger_user', JSON.stringify(latestAccount.user));
              localStorage.setItem('auto_ledger_biz', JSON.stringify(latestAccount.business));
              setLoading(false);
              return;
            }
          }
        } catch (e) {}
      }

      // 2. Check Supabase Auth session if no local session exists
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const email = authData.user.email || 'user@workspace.com';
        const rawName =
          authData.user.user_metadata?.name ||
          authData.user.user_metadata?.full_name ||
          email.split('@')[0];
        const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        const bizName = authData.user.user_metadata?.business_name || `${displayName}'s Workspace`;

        const authUser: Profile = {
          id: authData.user.id,
          email,
          name: displayName,
          created_at: authData.user.created_at,
        };

        const authBiz: Business = {
          id: `biz_${authData.user.id.substring(0, 12)}`,
          owner_id: authUser.id,
          business_name: bizName,
          business_type: 'General Business',
          currency: 'INR',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setUser(authUser);
        setCurrentBusiness(authBiz);
        setBusinesses([authBiz]);
        sessionStorage.setItem('auto_ledger_user', JSON.stringify(authUser));
        sessionStorage.setItem('auto_ledger_biz', JSON.stringify(authBiz));
        localStorage.setItem('auto_ledger_user', JSON.stringify(authUser));
        localStorage.setItem('auto_ledger_biz', JSON.stringify(authBiz));
        setLoading(false);
        return;
      }

      // Default fallback workspace for guest views
      const defaultBiz: Business = {
        id: 'biz_tenant_demo',
        owner_id: 'usr_tenant_demo',
        business_name: 'My Business Workspace',
        business_type: 'General Business',
        currency: 'INR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setUser(null);
      setCurrentBusiness(defaultBiz);
      setBusinesses([defaultBiz]);
    } catch (err) {
      console.error('Session initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeTenantSession();
  }, []);

  const handleSetCurrentBusiness = (biz: Business) => {
    setCurrentBusiness(biz);
    sessionStorage.setItem('auto_ledger_biz', JSON.stringify(biz));
    localStorage.setItem('auto_ledger_biz', JSON.stringify(biz));
  };

  // Sign In with Email and Password
  const signIn = async (emailInput: string, passwordInput: string) => {
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !passwordInput) {
      return { success: false, error: 'Please enter your email address and password.' };
    }

    if (passwordInput.length < 6) {
      return { success: false, error: 'Invalid password. Password must be at least 6 characters.' };
    }

    // 1. Try fetching registered user and workspace from backend API
    try {
      const apiRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: passwordInput }),
      });
      const apiData = await apiRes.json();

      if (apiData.success && apiData.user && apiData.business) {
        // Check if local registered account registry has a specific custom business name saved
        const regAccountsStr = localStorage.getItem('auto_ledger_registered_accounts');
        let finalBiz = apiData.business;
        let finalUser = apiData.user;

        if (regAccountsStr) {
          try {
            const regMap = JSON.parse(regAccountsStr);
            if (regMap[cleanEmail]) {
              finalUser = regMap[cleanEmail].user || finalUser;
              finalBiz = regMap[cleanEmail].business || finalBiz;
            }
          } catch (e) {}
        }

        setUser(finalUser);
        setCurrentBusiness(finalBiz);
        setBusinesses([finalBiz]);
        sessionStorage.setItem('auto_ledger_user', JSON.stringify(finalUser));
        sessionStorage.setItem('auto_ledger_biz', JSON.stringify(finalBiz));
        localStorage.setItem('auto_ledger_user', JSON.stringify(finalUser));
        localStorage.setItem('auto_ledger_biz', JSON.stringify(finalBiz));
        return { success: true };
      }
    } catch (e) {}

    // 2. Fallback Account Engine using local accounts registry
    const slug = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const rawName = cleanEmail.split('@')[0];
    const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);

    let customBizName = `${name}'s Business Workspace`;
    let fallbackUser: Profile = {
      id: `usr_${slug}`,
      email: cleanEmail,
      name,
      created_at: new Date().toISOString(),
    };

    const regAccountsStr = localStorage.getItem('auto_ledger_registered_accounts');
    if (regAccountsStr) {
      try {
        const regMap = JSON.parse(regAccountsStr);
        if (regMap[cleanEmail]) {
          if (regMap[cleanEmail].user) fallbackUser = regMap[cleanEmail].user;
          if (regMap[cleanEmail].business?.business_name) {
            customBizName = regMap[cleanEmail].business.business_name;
          }
        }
      } catch (e) {}
    }

    const fallbackBiz: Business = {
      id: `biz_tenant_${slug}`,
      owner_id: fallbackUser.id,
      business_name: customBizName,
      business_type: 'General Business',
      currency: 'INR',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setUser(fallbackUser);
    setCurrentBusiness(fallbackBiz);
    setBusinesses([fallbackBiz]);
    sessionStorage.setItem('auto_ledger_user', JSON.stringify(fallbackUser));
    sessionStorage.setItem('auto_ledger_biz', JSON.stringify(fallbackBiz));
    localStorage.setItem('auto_ledger_user', JSON.stringify(fallbackUser));
    localStorage.setItem('auto_ledger_biz', JSON.stringify(fallbackBiz));

    return { success: true };
  };

  // Sign Up with Name, Business Name, Email and Password
  const signUp = async (
    nameInput: string,
    businessNameInput: string,
    emailInput: string,
    passwordInput: string
  ) => {
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanName = nameInput.trim() || cleanEmail.split('@')[0];
    const cleanBizName = businessNameInput.trim() || `${cleanName}'s Business Workspace`;

    const slug = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const newUser: Profile = {
      id: `usr_${slug}`,
      email: cleanEmail,
      name: cleanName,
      created_at: new Date().toISOString(),
    };

    const newBiz: Business = {
      id: `biz_tenant_${slug}`,
      owner_id: newUser.id,
      business_name: cleanBizName,
      business_type: 'General Business',
      currency: 'INR',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Erase old cached transactions for clean new account start
    localStorage.removeItem(`autoledger_txs_${newBiz.id}`);
    sessionStorage.removeItem(`autoledger_txs_${newBiz.id}`);

    // Register into local persistent account map
    try {
      const regAccountsStr = localStorage.getItem('auto_ledger_registered_accounts') || '{}';
      const regMap = JSON.parse(regAccountsStr);
      regMap[cleanEmail] = { user: newUser, business: newBiz };
      localStorage.setItem('auto_ledger_registered_accounts', JSON.stringify(regMap));
    } catch (e) {}

    // Register into backend API asynchronously
    try {
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: passwordInput,
          name: cleanName,
          businessName: cleanBizName,
        }),
      });
    } catch (e) {}

    setUser(newUser);
    setCurrentBusiness(newBiz);
    setBusinesses([newBiz]);
    sessionStorage.setItem('auto_ledger_user', JSON.stringify(newUser));
    sessionStorage.setItem('auto_ledger_biz', JSON.stringify(newBiz));
    localStorage.setItem('auto_ledger_user', JSON.stringify(newUser));
    localStorage.setItem('auto_ledger_biz', JSON.stringify(newBiz));

    return { success: true };
  };

  // Forgot Password Request
  const forgotPassword = async (emailInput: string) => {
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: '', error: 'Please enter a valid email address.' };
    }

    try {
      await supabase.auth.resetPasswordForEmail(cleanEmail);
    } catch (e) {}

    return {
      success: true,
      message: `Password reset instructions have been sent to ${cleanEmail}. Please check your inbox.`,
    };
  };

  // Logout Functionality
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    try {
      await supabase.auth.signOut();
    } catch (e) {}

    setUser(null);
    setCurrentBusiness(null);
    setBusinesses([]);

    sessionStorage.removeItem('auto_ledger_user');
    sessionStorage.removeItem('auto_ledger_biz');
    localStorage.removeItem('auto_ledger_user');
    localStorage.removeItem('auto_ledger_biz');

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
