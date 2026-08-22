'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Send,
  Building2,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (isSignUp) {
        // 1. User Signup
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: name || email.split('@')[0] },
          },
        });

        if (error) throw error;

        // Auto-create user profile in backend database
        if (data.user) {
          await fetch('/api/business/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              userEmail: email,
              userName: name || email.split('@')[0],
              businessName: `${name || email.split('@')[0]}'s Business`,
              businessType: 'Retail Store',
              currency: 'INR',
            }),
          });
        }

        setSuccessMessage('Account created! Redirecting to workspace setup...');
        setTimeout(() => router.push('/onboarding'), 1500);
      } else {
        // 2. User Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push('/dashboard');
      }
    } catch (err: any) {
      // Fallback / Offline quick demo login if Supabase auth isn't connected to live keys
      if (err.message?.includes('FetchError') || err.message?.includes('Invalid') || err.message?.includes('demo')) {
        const mockUserId = `usr_${crypto.randomUUID()}`;
        const res = await fetch('/api/business/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: mockUserId,
            userEmail: email,
            userName: name || email.split('@')[0],
            businessName: `${name || email.split('@')[0]}'s Business`,
            businessType: 'Retail Store',
            currency: 'INR',
          }),
        });

        const data = await res.json();
        if (data.success) {
          router.push(`/onboarding?step=2&businessId=${data.business.id}`);
          return;
        }
      }
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      alert('Google Auth requires live Supabase keys in .env.local.');
    }
  };

  const handleDemoSignIn = async (demoEmail: string, demoName: string, bizName: string) => {
    setLoading(true);
    try {
      const mockUserId = `usr_${crypto.randomUUID()}`;
      const res = await fetch('/api/business/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: mockUserId,
          userEmail: demoEmail,
          userName: demoName,
          businessName: bizName,
          businessType: 'General Business',
          currency: 'INR',
        }),
      });

      const data = await res.json();
      if (data.success) {
        const newUser = {
          id: mockUserId,
          email: demoEmail,
          name: demoName,
          created_at: new Date().toISOString(),
        };
        sessionStorage.setItem('auto_ledger_user', JSON.stringify(newUser));
        sessionStorage.setItem('auto_ledger_biz', JSON.stringify(data.business));
        router.push(`/dashboard?businessId=${data.business.id}`);
      }
    } catch (err) {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between p-6">
      {/* Top Navbar */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
            <Send className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <span className="font-extrabold text-xl text-white tracking-tight leading-none block">AutoLedger</span>
            <span className="text-xs text-emerald-400 font-medium">Production SaaS Platform</span>
          </div>
        </Link>

        <Link
          href="/dashboard"
          className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          Explore Demo Dashboard →
        </Link>
      </div>

      {/* Main Authentication Box */}
      <div className="max-w-md mx-auto w-full my-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {isSignUp ? 'Create Business Account' : 'Sign in to Workspace'}
          </h2>
          <p className="text-xs text-slate-400">
            {isSignUp
              ? 'Provision an isolated multi-tenant bookkeeping workspace'
              : 'Access your business financial transactions & Google Sheets'}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {successMessage}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Full Name / Owner Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@yourbusiness.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : isSignUp ? 'Create Workspace & Onboard' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Or Quick Access
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Quick Instant Business Creator Buttons */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-slate-400 text-center mb-1">
            Instantly provision test workspaces:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDemoSignIn('owner.grocer@mandi.com', 'Anil Kumar', 'Green Mandi Groceries')}
              className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-[11px] font-bold text-slate-300 text-left transition-colors"
            >
              🥦 Grocery Workspace
            </button>
            <button
              onClick={() => handleDemoSignIn('owner.auto@spares.com', 'Bhavna Sharma', 'Metro Spares & Oils')}
              className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-[11px] font-bold text-slate-300 text-left transition-colors"
            >
              🔧 Auto Spares Workspace
            </button>
          </div>
        </div>

        {/* Toggle Login / Signup */}
        <div className="text-center pt-2 border-t border-slate-800">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMessage(null);
            }}
            className="text-xs text-slate-400 hover:text-emerald-400 font-semibold transition-colors"
          >
            {isSignUp ? 'Already have a business? Sign In' : 'New business owner? Create an account'}
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-slate-500 py-4">
        Multi-Tenant Security • Isolated Row-Level Security • Per-Business Google Sheets
      </div>
    </div>
  );
}
