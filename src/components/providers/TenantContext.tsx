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
  switchAccountByEmail: (emailInput: string) => void;
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
  switchAccountByEmail: () => {},
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
      const urlParams = new URLSearchParams(window.location.search);
      const urlTenantParam = urlParams.get('tenant');
      const urlBizId = urlParams.get('businessId');

      // 1. Check URL `?tenant=name` parameter (e.g. ?tenant=bhavik)
      if (urlTenantParam && urlTenantParam.trim().length > 0) {
        const tenantSlug = urlTenantParam.trim().toLowerCase();
        const tenantDisplayName = tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1);

        const tenantUser: Profile = {
          id: `usr_tenant_${tenantSlug}`,
          email: `${tenantSlug}@workspace.com`,
          name: tenantDisplayName,
          created_at: new Date().toISOString(),
        };

        const tenantBiz: Business = {
          id: `biz_tenant_${tenantSlug}`,
          owner_id: tenantUser.id,
          business_name: `${tenantDisplayName}'s Business Workspace`,
          business_type: 'General Business',
          currency: 'INR',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setUser(tenantUser);
        setCurrentBusiness(tenantBiz);
        setBusinesses([tenantBiz]);
        sessionStorage.setItem('auto_ledger_user', JSON.stringify(tenantUser));
        sessionStorage.setItem('auto_ledger_biz', JSON.stringify(tenantBiz));
        setLoading(false);
        return;
      }

      // 2. Check URL `?businessId=xyz` parameter
      if (urlBizId && urlBizId.trim().length > 0) {
        const customBiz: Business = {
          id: urlBizId,
          owner_id: 'usr_owner',
          business_name: 'My Business Workspace',
          business_type: 'Retail Store',
          currency: 'INR',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const customUser: Profile = {
          id: 'usr_owner',
          email: 'owner@workspace.com',
          name: 'Business Owner',
          created_at: new Date().toISOString(),
        };

        setUser(customUser);
        setCurrentBusiness(customBiz);
        setBusinesses([customBiz]);
        sessionStorage.setItem('auto_ledger_user', JSON.stringify(customUser));
        sessionStorage.setItem('auto_ledger_biz', JSON.stringify(customBiz));
        setLoading(false);
        return;
      }

      // 3. Check Supabase Auth session (e.g., Google Auth or Email Login)
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const email = authData.user.email || 'user@workspace.com';
        const rawName =
          authData.user.user_metadata?.name ||
          authData.user.user_metadata?.full_name ||
          email.split('@')[0];
        const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

        const authUser: Profile = {
          id: authData.user.id,
          email,
          name: displayName,
          created_at: authData.user.created_at,
        };

        const authBiz: Business = {
          id: `biz_${authData.user.id}`,
          owner_id: authUser.id,
          business_name: `${displayName}'s Workspace`,
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
        setLoading(false);
        return;
      }

      // 4. Check SessionStorage for active saved workspace session
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

      // 5. Default Fallback Demo Workspace (only if completely unauthenticated guest)
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

      setUser(defaultUser);
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
  };

  const setUserSession = (newUser: Profile, newBiz: Business) => {
    setUser(newUser);
    setCurrentBusiness(newBiz);
    setBusinesses([newBiz]);
    sessionStorage.setItem('auto_ledger_user', JSON.stringify(newUser));
    sessionStorage.setItem('auto_ledger_biz', JSON.stringify(newBiz));
  };

  const switchAccountByEmail = (emailInput: string) => {
    const cleanEmail = emailInput.trim();
    if (!cleanEmail) return;

    const slug = cleanEmail.split('@')[0].toLowerCase();
    const name = slug.charAt(0).toUpperCase() + slug.slice(1);

    const newUser: Profile = {
      id: `usr_${slug}`,
      email: cleanEmail.includes('@') ? cleanEmail : `${slug}@workspace.com`,
      name: name,
      created_at: new Date().toISOString(),
    };

    const newBiz: Business = {
      id: `biz_${slug}`,
      owner_id: newUser.id,
      business_name: `${name}'s Business Workspace`,
      business_type: 'General Business',
      currency: 'INR',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setUserSession(newUser, newBiz);
  };

  const switchUserRole = (email: string) => {
    switchAccountByEmail(email);
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
        switchAccountByEmail,
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
