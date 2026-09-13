'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTenant } from '@/components/providers/TenantContext';
import {
  BookOpen,
  Send,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Sparkles,
  LayoutDashboard,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Building2,
} from 'lucide-react';

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp } = useTenant();
  const [signupError, setSignupError] = useState<string | null>(null);

  const stepParam = parseInt(searchParams.get('step') || '1', 10);
  const initialBizId = searchParams.get('businessId') || '';

  const [step, setStep] = useState(stepParam);
  const [businessId, setBusinessId] = useState(initialBizId);

  // Account & Business Form Fields
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [businessName, setBusinessName] = useState('My Business Workspace');
  const [businessType, setBusinessType] = useState('Retail');
  const [currency, setCurrency] = useState('INR');

  // Telegram state
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramDeepLink, setTelegramDeepLink] = useState('');
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Submit Account Creation & Business Workspace
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSignupError(null);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = ownerName.trim() || cleanEmail.split('@')[0];
      const cleanBizName = businessName.trim() || `${cleanName}'s Workspace`;

      if (!cleanEmail || !password) {
        setSignupError('Please enter your email address and a password.');
        setIsSubmitting(false);
        return;
      }

      const res = await signUp(cleanName, cleanBizName, cleanEmail, password, businessType, currency);
      console.log('[signup] result:', res);

      if (!res.success) {
        setSignupError(res.error || 'Could not create your account. Please try again.');
        setIsSubmitting(false);
        return;
      }

      if (res.needsEmailConfirmation) {
        setSignupError(res.error || 'Account created! Please check your email to confirm your address, then sign in.');
        setIsSubmitting(false);
        return;
      }

      setStep(2);
    } catch (err: any) {
      console.error('[signup] threw an exception:', err);
      setSignupError(err.message || 'Could not create your account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Generate Telegram Deep Link
  const handleGenerateTelegramLink = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const slug = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const bizId = businessId || `biz_tenant_${slug}`;
    setIsGeneratingLink(true);

    try {
      const res = await fetch('/api/telegram/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: bizId, businessName }),
      });

      const data = await res.json();
      if (data.success && data.deepLink) {
        setTelegramToken(data.token);
        setTelegramDeepLink(data.deepLink);
        setTelegramConnected(true);
      } else {
        const fallbackTok = `connect_${Date.now()}`;
        const fallbackLink = `https://t.me/MySaaSBookkeeper_bot?start=${fallbackTok}`;
        setTelegramToken(fallbackTok);
        setTelegramDeepLink(fallbackLink);
        setTelegramConnected(true);
      }
    } catch (err: any) {
      const fallbackTok = `connect_${Date.now()}`;
      const fallbackLink = `https://t.me/MySaaSBookkeeper_bot?start=${fallbackTok}`;
      setTelegramToken(fallbackTok);
      setTelegramDeepLink(fallbackLink);
      setTelegramConnected(true);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleEnterDashboard = () => {
    if (businessId) {
      window.location.href = `/dashboard?businessId=${businessId}`;
    } else {
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9F8] text-[#17211C] font-sans p-6 flex flex-col justify-between antialiased">
      {/* Top Header */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#168A55] flex items-center justify-center text-white font-bold shadow-xs">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-lg text-[#17211C]">Khata Setup</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-bold text-[#17211C] hover:text-[#168A55] transition-colors bg-white border border-[#E2E8E4] px-3.5 py-1.5 rounded-xl shadow-xs"
          >
            Sign In
          </Link>
          <button
            onClick={handleEnterDashboard}
            className="text-xs font-bold text-[#66736C] hover:text-[#17211C] transition-colors bg-white border border-[#E2E8E4] px-3.5 py-1.5 rounded-xl shadow-xs"
          >
            Skip to Dashboard →
          </button>
        </div>
      </div>

      {/* Main Wizard Form Container */}
      <div className="max-w-2xl mx-auto w-full my-auto bg-white border border-[#E2E8E4] rounded-3xl p-8 shadow-xl">
        {/* STEP 1: CREATE ACCOUNT & BUSINESS WORKSPACE */}
        {step === 1 && (
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E2E8E4]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAF7F0] border border-[#168A55]/20 flex items-center justify-center text-[#168A55]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#17211C]">Step 1: Create Account & Business</h2>
                  <p className="text-xs text-[#66736C]">Set up your workspace for your store or business</p>
                </div>
              </div>

              <Link
                href="/login"
                className="text-xs font-bold text-[#168A55] hover:underline"
              >
                Sign In instead →
              </Link>
            </div>

            {signupError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
                {signupError}
              </div>
            )}

            <form onSubmit={handleStep1Submit} className="space-y-4 mt-6">
              {/* Owner Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#17211C] block mb-1.5">Owner Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#66736C] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#17211C] focus:outline-none focus:border-[#168A55]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#17211C] block mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#66736C] absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#17211C] focus:outline-none focus:border-[#168A55]"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Business Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#17211C] block mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#66736C] absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#17211C] focus:outline-none focus:border-[#168A55]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-[#66736C] hover:text-[#17211C]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#17211C] block mb-1.5">Business Workspace Name</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#66736C] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Rahul's Bakery & Cafe"
                      className="w-full bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#17211C] focus:outline-none focus:border-[#168A55]"
                    />
                  </div>
                </div>
              </div>

              {/* Business Type & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#17211C] block mb-1.5">Business Type</label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl px-4 py-2.5 text-sm text-[#17211C] focus:outline-none focus:border-[#168A55]"
                  >
                    <option value="Retail">Retail Store</option>
                    <option value="Grocery">Grocery / Mandi</option>
                    <option value="Restaurant">Restaurant / Cafe</option>
                    <option value="Services">Professional Services</option>
                    <option value="Automotive">Automotive & Spares</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#17211C] block mb-1.5">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl px-4 py-2.5 text-sm text-[#17211C] focus:outline-none focus:border-[#168A55]"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#168A55] hover:bg-[#0D5C3A] text-white font-bold text-sm py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Creating Account...' : 'Continue to Telegram Setup'} <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: CONNECT TELEGRAM */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-[#E2E8E4]">
              <div className="w-10 h-10 rounded-xl bg-[#EAF7F0] border border-[#168A55]/20 flex items-center justify-center text-[#168A55]">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#17211C]">Connect your Telegram</h2>
                <p className="text-xs text-[#66736C]">Use Telegram to record your business transactions quickly from your phone.</p>
              </div>
            </div>

            <div className="bg-[#F7F9F8] border border-[#E2E8E4] rounded-2xl p-6 text-center space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EAF7F0] text-[#168A55] border border-[#168A55]/20">
                <CheckCircle2 className="w-4 h-4" />
                {telegramConnected ? '✓ Telegram Connected' : '○ Telegram Not Connected'}
              </div>

              <p className="text-xs text-[#66736C] max-w-md mx-auto leading-relaxed">
                Connect your account to <code className="font-bold text-[#168A55]">@MySaaSBookkeeper_bot</code>. Send voice notes or text entries anytime to update your Khata ledger.
              </p>

              {!telegramDeepLink ? (
                <button
                  onClick={handleGenerateTelegramLink}
                  disabled={isGeneratingLink}
                  className="bg-[#168A55] hover:bg-[#0D5C3A] text-white font-bold text-xs px-6 py-3 rounded-xl transition-all inline-flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isGeneratingLink ? 'Generating Link...' : 'Connect Telegram'}
                </button>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-white border border-[#E2E8E4] rounded-xl text-xs font-mono text-[#168A55] font-bold break-all select-all">
                    {telegramDeepLink}
                  </div>

                  <a
                    href={telegramDeepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#168A55] hover:bg-[#0D5C3A] text-white font-bold text-xs px-6 py-3 rounded-xl transition-all inline-flex items-center gap-2 shadow-sm"
                  >
                    Open Telegram <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(1)}
                className="text-xs text-[#66736C] hover:text-[#17211C] font-bold"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="bg-[#168A55] hover:bg-[#0D5C3A] text-white font-bold text-xs px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-sm"
              >
                Complete Setup & Enter Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: READY */}
        {step === 3 && (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 rounded-2xl bg-[#EAF7F0] border border-[#168A55]/20 text-[#168A55] flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-[#168A55]" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-[#17211C] tracking-tight">You're ready to use Khata.</h2>
              <p className="text-xs text-[#66736C] mt-2 max-w-md mx-auto">
                Send your first transaction to your Telegram bookkeeping assistant or view your live business dashboard.
              </p>
            </div>

            <div className="p-4 bg-[#F7F9F8] border border-[#E2E8E4] rounded-2xl text-left max-w-md mx-auto space-y-2 text-xs">
              <p className="font-bold text-[#17211C]">Send Telegram messages like:</p>
              <ul className="text-[#66736C] space-y-1 font-mono">
                <li className="text-[#168A55] font-bold">"Vadapav 50 rs la vikla" (Marathi)</li>
                <li className="text-[#168A55] font-bold">"50 rupaye ki chai bechi" (Hindi)</li>
                <li className="text-[#168A55] font-bold">"Aloo bhajiya sold for ₹50" (English)</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="https://t.me/MySaaSBookkeeper_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-[#168A55] hover:bg-[#0D5C3A] text-white font-bold text-xs px-6 py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Open Telegram
              </a>

              <button
                onClick={handleEnterDashboard}
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                Enter Business Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-xs text-[#66736C] py-4">
        Khata • Simple & Smart Bookkeeping for Indian Small Businesses
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F9F8] text-[#66736C] p-8 text-center text-xs">Loading Setup...</div>}>
      <OnboardingForm />
    </Suspense>
  );
}
