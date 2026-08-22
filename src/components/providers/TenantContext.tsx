'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, Business } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface TenantContextType {
  user: Profile | null;
  businesses: Business[];
  currentBusiness: Business | null;
  setCurrentBusiness: (biz: Business) => void;
  setUserSession: (user: Profile, business: Business) => void;
  switchUserRole: (email: string) => void;
  refreshBusinesses: () => Promise<void>;
  loading: boolean;
}

const TenantContext = createContext<TenantContextType>({
  user: null,
  businesses: [],
  currentBusiness: null,
  setCurrentBusiness: () => {},
  setUserSession: () => {},
  switchUserRole: () => {},
  refreshBusinesses: async () => {},
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
      // 1. Check Supabase Auth session first
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const uProfile: Profile = {
          id: authData.user.id,
          email: authData.user.email || 'user@workspace.com',
          name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'Business Owner',
          created_at: authData.user.created_at,
        };
        setUser(uProfile);
      }

      // 2. Check SessionStorage for active logged in workspace
      const storedUserJson = sessionStorage.getItem('auto_ledger_user');
      const storedBizJson = sessionStorage.getItem('auto_ledger_biz');

      if (storedUserJson && storedBizJson) {
        const parsedUser: Profile = JSON.parse(storedUserJson);
        const parsedBiz: Business = JSON.parse(storedBizJson);
        setUser(parsedUser);
        setCurrentBusiness(parsedBiz);
        setBusinesses([parsedBiz]);
        setLoading(false);
        return;
      }

      // 3. Fallback: Check URL search parameter businessId
      const urlParams = new URLSearchParams(window.location.search);
      const urlBizId = urlParams.get('businessId');

      if (urlBizId) {
        const res = await fetch(`/api/transactions/list?businessId=${urlBizId}`);
        const data = await res.json();
        if (data.success && data.transactions) {
          const customBiz: Business = {
            id: urlBizId,
            owner_id: user?.id || 'usr_owner',
            business_name: 'My Business Workspace',
            business_type: 'Retail Store',
            currency: 'INR',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setCurrentBusiness(customBiz);
          setBusinesses([customBiz]);
          setLoading(false);
          return;
        }
      }

      // 4. Default Demo Business (only if no custom session exists)
      const defaultUser: Profile = {
        id: 'usr_aaaa1111-1111-1111-1111-111111111111',
        email: 'owner.a@greengroceries.com',
        name: 'Anil Kumar',
        created_at: new Date().toISOString(),
      };
      const defaultBiz: Business = {
        id: 'biz_aaaa1111-1111-1111-1111-111111111111',
        owner_id: defaultUser.id,
        business_name: 'Fresh Green Groceries',
        business_type: 'Grocery Store',
        currency: 'INR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (!user) setUser(defaultUser);
      if (!currentBusiness) {
        setCurrentBusiness(defaultBiz);
        setBusinesses([defaultBiz]);
      }
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
  };

  const setUserSession = (newUser: Profile, newBiz: Business) => {
    setUser(newUser);
    setCurrentBusiness(newBiz);
    setBusinesses([newBiz]);
    sessionStorage.setItem('auto_ledger_user', JSON.stringify(newUser));
    sessionStorage.setItem('auto_ledger_biz', JSON.stringify(newBiz));
  };

  const switchUserRole = (email: string) => {
    let newUser: Profile;
    let newBiz: Business;

    if (email.includes('metro')) {
      newUser = {
        id: 'usr_bbbb2222-2222-2222-2222-222222222222',
        email: 'owner.b@metroparts.com',
        name: 'Bhavna Sharma',
        created_at: new Date().toISOString(),
      };
      newBiz = {
        id: 'biz_bbbb2222-2222-2222-2222-222222222222',
        owner_id: newUser.id,
        business_name: 'Metro Auto Parts',
        business_type: 'Automotive & Spares',
        currency: 'INR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } else if (email.includes('chai')) {
      newUser = {
        id: 'usr_cccc3333-3333-3333-3333-333333333333',
        email: 'owner.c@chaicafe.com',
        name: 'Chirag Patel',
        created_at: new Date().toISOString(),
      };
      newBiz = {
        id: 'biz_cccc3333-3333-3333-3333-333333333333',
        owner_id: newUser.id,
        business_name: 'Chai & Snacks Cafe',
        business_type: 'Restaurant / Cafe',
        currency: 'INR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } else {
      newUser = {
        id: 'usr_aaaa1111-1111-1111-1111-111111111111',
        email: 'owner.a@greengroceries.com',
        name: 'Anil Kumar',
        created_at: new Date().toISOString(),
      };
      newBiz = {
        id: 'biz_aaaa1111-1111-1111-1111-111111111111',
        owner_id: newUser.id,
        business_name: 'Fresh Green Groceries',
        business_type: 'Grocery Store',
        currency: 'INR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    setUserSession(newUser, newBiz);
  };

  const refreshBusinesses = async () => {
    await initializeTenantSession();
  };

  return (
    <TenantContext.Provider
      value={{
        user,
        businesses,
        currentBusiness,
        setCurrentBusiness: handleSetCurrentBusiness,
        setUserSession,
        switchUserRole,
        refreshBusinesses,
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
