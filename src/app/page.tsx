'use client';

import React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Send,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Clock,
  Zap,
  Smartphone,
  Lock,
  ChevronRight,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F7F9F8] text-[#17211C] font-sans flex flex-col justify-between antialiased">
      {/* Navigation Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#168A55] flex items-center justify-center text-white font-bold shadow-sm">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-xl text-[#17211C] tracking-tight leading-none">Khata</h1>
            <span className="text-xs text-[#168A55] font-bold">Small Business Bookkeeping</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-bold text-[#17211C] hover:text-[#168A55] transition-colors px-4 py-2"
          >
            Sign In
          </Link>
          <Link
            href="/onboarding"
            className="px-5 py-2.5 bg-[#168A55] hover:bg-[#0D5C3A] text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto w-full px-6 py-12 md:py-20 flex flex-col items-center text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF7F0] border border-[#168A55]/20 text-[#168A55] text-xs font-bold shadow-xs">
          <Zap className="w-4 h-4" />
          <span>Conversational Bookkeeping for Indian Kirana & Small Businesses</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-[#17211C] tracking-tight leading-tight max-w-4xl">
          Record your daily business sales & expenses in <span className="text-[#168A55]">seconds</span> via Telegram.
        </h1>

        <p className="text-base md:text-lg text-[#66736C] max-w-2xl font-medium leading-relaxed">
          No complicated accounting software. Just send text or voice messages like <span className="text-[#168A55] font-mono font-bold">"Vadapav 50 rs la vikla"</span> or <span className="text-[#168A55] font-mono font-bold">"Batate 400 rs la ghetle"</span> and let Khata manage your ledger.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 w-full sm:w-auto">
          <Link
            href="/onboarding"
            className="w-full sm:w-auto px-8 py-4 bg-[#168A55] hover:bg-[#0D5C3A] text-white font-extrabold text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            Start Your Business Khata Free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-[#F7F9F8] text-[#17211C] font-extrabold text-sm rounded-2xl transition-all border border-[#E2E8E4] shadow-xs flex items-center justify-center gap-2"
          >
            Sign In to Existing Account
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 w-full text-left">
          <div className="bg-white border border-[#E2E8E4] rounded-2xl p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF7F0] text-[#168A55] flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-[#17211C]">Telegram Voice & Text</h3>
            <p className="text-xs text-[#66736C] leading-relaxed">
              Record sales, purchases, and expenses naturally in Marathi, Hindi, Hinglish, or English directly from your phone.
            </p>
          </div>

          <div className="bg-white border border-[#E2E8E4] rounded-2xl p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#D97706] flex items-center justify-center border border-amber-200">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-[#17211C]">Khata Credit & Debt</h3>
            <p className="text-xs text-[#66736C] leading-relaxed">
              Instantly see who owes your business money to collect and what suppliers you need to settle with.
            </p>
          </div>

          <div className="bg-white border border-[#E2E8E4] rounded-2xl p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#17211C] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-[#17211C]">1-Click Excel & PDF Exports</h3>
            <p className="text-xs text-[#66736C] leading-relaxed">
              Your business records are maintained securely by Khata. Download your complete ledger anytime in Excel or PDF formats.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8E4] bg-white py-6 text-center text-xs text-[#66736C]">
        Khata B2B SaaS • Isolated Multi-Tenant Architecture • Made for Indian Small Businesses
      </footer>
    </div>
  );
}
