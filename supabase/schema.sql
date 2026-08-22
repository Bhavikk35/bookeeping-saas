-- Multi-Tenant Telegram Bookkeeping SaaS Schema
-- Run this in your Supabase SQL Editor or PostgreSQL Database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Businesses Table
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL DEFAULT 'Retail',
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Business Members & Roles Table
CREATE TABLE IF NOT EXISTS public.business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'accountant', 'employee')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

-- 4. Telegram Connection Tokens Table
CREATE TABLE IF NOT EXISTS public.telegram_connection_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Telegram Connections Table
CREATE TABLE IF NOT EXISTS public.telegram_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL,
  telegram_chat_id TEXT UNIQUE NOT NULL,
  telegram_username TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disconnected')),
  last_message_at TIMESTAMPTZ
);

-- 6. Google Connections Table
CREATE TABLE IF NOT EXISTS public.google_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
  google_user_id TEXT,
  spreadsheet_id TEXT,
  spreadsheet_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'disconnected'))
);

-- 7. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),
  telegram_connection_id UUID REFERENCES public.telegram_connections(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'expense', 'purchase', 'money_received', 'money_paid', 'receivable', 'payable')),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  item TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  category TEXT NOT NULL DEFAULT 'General',
  customer_name TEXT,
  supplier_name TEXT,
  payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'partial')),
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'telegram' CHECK (source IN ('telegram', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Sync Logs Table
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  target TEXT NOT NULL DEFAULT 'google_sheets',
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  retries INT DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR MULTI-TENANCY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_business_members_user ON public.business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_business ON public.business_members(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_business ON public.transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_telegram_connections_chat ON public.telegram_connections(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_tokens_token ON public.telegram_connection_tokens(token);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_connection_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Helper Function: Check if user belongs to business
CREATE OR REPLACE FUNCTION public.is_business_member(b_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = b_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for Businesses
CREATE POLICY "Members can view their businesses" ON public.businesses
  FOR SELECT USING (public.is_business_member(id));
CREATE POLICY "Owners can update their businesses" ON public.businesses
  FOR UPDATE USING (public.is_business_member(id));
CREATE POLICY "Users can create business" ON public.businesses
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- RLS Policies for Transactions
CREATE POLICY "Members can view transactions" ON public.transactions
  FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "Members can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (public.is_business_member(business_id));
CREATE POLICY "Members can update transactions" ON public.transactions
  FOR UPDATE USING (public.is_business_member(business_id));
CREATE POLICY "Members can delete transactions" ON public.transactions
  FOR DELETE USING (public.is_business_member(business_id));

-- RLS Policies for Connections & Tokens
CREATE POLICY "Members can view telegram tokens" ON public.telegram_connection_tokens
  FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "Members can insert telegram tokens" ON public.telegram_connection_tokens
  FOR INSERT WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Members can view telegram connections" ON public.telegram_connections
  FOR SELECT USING (public.is_business_member(business_id));

CREATE POLICY "Members can view google connections" ON public.google_connections
  FOR SELECT USING (public.is_business_member(business_id));

-- Auto-create profile trigger on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
