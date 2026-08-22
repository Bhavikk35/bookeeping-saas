'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Send,
  FileSpreadsheet,
  Building2,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Lock,
  TrendingUp,
  MessageSquareText,
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Retail');
  const [currency, setCurrency] = useState('INR');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !businessName) return;
    setIsSubmitting(true);

    try {
      const mockUserId = `usr_${crypto.randomUUID()}`;
      const res = await fetch('/api/business/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: mockUserId,
          userEmail: email,
          userName: email.split('@')[0],
          businessName,
          businessType,
          currency,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const newUser = {
          id: mockUserId,
          email,
          name: email.split('@')[0],
          created_at: new Date().toISOString(),
        };
        sessionStorage.setItem('auto_ledger_user', JSON.stringify(newUser));
        sessionStorage.setItem('auto_ledger_biz', JSON.stringify(data.business));
        router.push(`/onboarding?step=2&businessId=${data.business.id}`);
      } else {
        alert(data.error || 'Signup failed');
      }
    } catch (err: any) {
      alert(err.message || 'Quick signup failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
              <Send className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="font-extrabold text-xl text-white tracking-tight leading-none block">AutoLedger</span>
              <span className="text-xs text-emerald-400 font-medium">Multi-Tenant Bookkeeping SaaS</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Demo Dashboard
            </Link>
            <Link
              href="/onboarding"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              Create Business
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
          <ShieldCheck className="w-4 h-4" /> Multi-Tenant SaaS Architecture • Isolated Google Sheets & Telegram
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto mb-6">
          Conversational Bookkeeping for your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Business Workspace</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Record sales, expenses, purchases, and receivables naturally over Telegram. All transactions sync in real-time to your private Google Sheet and web dashboard.
        </p>

        {/* Business Creation Card */}
        <div className="max-w-xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm text-left">
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" /> Start Your Business Workspace
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            Creates an isolated database environment, deep-links your Telegram chat, and pairs your Google Sheet.
          </p>

          <form onSubmit={handleQuickSignup} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Owner Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@yourcompany.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Business Name</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Hardware"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Provisioning Workspace...' : 'Launch Workspace & Connect Telegram'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-800/80">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Built for Multi-Tenant Reliability</h2>
          <p className="text-sm text-slate-400 mt-2">Complete data isolation across every business workspace</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <MessageSquareText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Universal Telegram Bot</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              All businesses share a single Telegram bot (<code className="text-emerald-400 font-mono text-xs">@UniversalBookkeeperBot</code>). Cryptographic single-use deep links map incoming chats securely to your business ID.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Per-Tenant Google Sheets</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Connect your own Google Account via OAuth. Each business gets its own isolated spreadsheet ledger. Database acts as primary source of truth.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Gemini AI NLP & Ambiguity Guard</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Natural language extraction converts text into structured sales, expenses, and receivables. If details are ambiguous, the bot asks concise clarification.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
