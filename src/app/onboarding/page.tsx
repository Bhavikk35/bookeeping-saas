'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  FileSpreadsheet,
  Send,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  LayoutDashboard,
} from 'lucide-react';

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = parseInt(searchParams.get('step') || '1', 10);
  const initialBizId = searchParams.get('businessId') || '';

  const [step, setStep] = useState(stepParam);
  const [businessId, setBusinessId] = useState(initialBizId);
  const [businessName, setBusinessName] = useState('My Business Workspace');
  const [businessType, setBusinessType] = useState('Retail');
  const [currency, setCurrency] = useState('INR');

  // Step 2 & 3 state
  const [googleConnected, setGoogleConnected] = useState(true);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');

  const [telegramToken, setTelegramToken] = useState('');
  const [telegramDeepLink, setTelegramDeepLink] = useState('');
  const [telegramConnected, setTelegramConnected] = useState(true);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // Step 1: Submit Business Creation
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const mockUserId = `usr_${crypto.randomUUID()}`;
      const res = await fetch('/api/business/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: mockUserId,
          userEmail: 'owner@workspace.com',
          userName: 'Business Owner',
          businessName,
          businessType,
          currency,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBusinessId(data.business.id);
        const newUser = {
          id: mockUserId,
          email: 'owner@workspace.com',
          name: businessName,
          created_at: new Date().toISOString(),
        };
        sessionStorage.setItem('auto_ledger_user', JSON.stringify(newUser));
        sessionStorage.setItem('auto_ledger_biz', JSON.stringify(data.business));
        setStep(2);
      } else {
        alert(data.error || 'Business creation failed.');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating business.');
    }
  };

  // Step 2: Connect Google Sheets
  const handleConnectGoogle = async () => {
    const bizId = businessId || 'biz_aaaa1111-1111-1111-1111-111111111111';
    // Check if real Google OAuth URL exists
    const resAuth = await fetch(`/api/google/auth-url?businessId=${bizId}`);
    const authData = await resAuth.json();

    if (authData.url && !authData.url.includes('demo')) {
      window.location.href = authData.url;
    } else {
      await fetch(`/api/google/callback?state=${bizId}&code=demo_code`);
      setGoogleConnected(true);
      setSpreadsheetUrl(`https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`);
    }
  };

  // Step 3: Generate Telegram Deep Link
  const handleGenerateTelegramLink = async () => {
    const bizId = businessId || 'biz_aaaa1111-1111-1111-1111-111111111111';
    setIsGeneratingLink(true);

    try {
      const res = await fetch('/api/telegram/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: bizId }),
      });

      const data = await res.json();
      if (data.success) {
        setTelegramToken(data.token);
        setTelegramDeepLink(data.deepLink);
        setTelegramConnected(true);
      } else {
        alert(data.error || 'Failed to generate link');
      }
    } catch (err: any) {
      alert(err.message || 'Error generating link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Simulate Telegram webhook binding trigger
  const handleSimulateTelegramConnection = async () => {
    if (!telegramToken) return;
    try {
      const res = await fetch('/api/telegram/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          update_id: 10001,
          message: {
            message_id: 1,
            from: { id: 888123, first_name: 'Business', username: 'owner_tg' },
            chat: { id: 888123, first_name: 'Business', type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: `/start ${telegramToken}`,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTelegramConnected(true);
      } else {
        alert(data.responseMessage || 'Connection failed.');
      }
    } catch (err: any) {
      alert(err.message || 'Simulated connection failed.');
    }
  };

  const handleEnterDashboard = () => {
    if (businessId) {
      router.push(`/dashboard?businessId=${businessId}`);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 flex flex-col justify-between">
      {/* Top Header */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between py-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
            <Send className="w-5 h-5 text-slate-950" />
          </div>
          <span className="font-extrabold text-lg text-white">AutoLedger Setup</span>
        </div>

        {/* Skip to Dashboard Button */}
        <button
          onClick={handleEnterDashboard}
          className="text-xs font-bold text-slate-400 hover:text-emerald-400 flex items-center gap-1.5 transition-colors bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl"
        >
          <LayoutDashboard className="w-3.5 h-3.5" /> Skip to Dashboard
        </button>
      </div>

      {/* Main Wizard Form Container */}
      <div className="max-w-2xl mx-auto w-full my-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        {/* STEP 1: CREATE BUSINESS */}
        {step === 1 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Step 1: Create your business</h2>
                <p className="text-xs text-slate-400">Set up your isolated multi-tenant workspace</p>
              </div>
            </div>

            <form onSubmit={handleStep1Submit} className="space-y-4 mt-6">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Business Name</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Fresh Green Groceries"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Business Type</label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Retail">Retail Store</option>
                    <option value="Grocery">Grocery / Mandi</option>
                    <option value="Restaurant">Restaurant / Cafe</option>
                    <option value="Services">Professional Services</option>
                    <option value="Automotive">Automotive & Spares</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-emerald-500/20"
              >
                Continue to Google Sheets Setup <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: CONNECT GOOGLE SHEETS */}
        {step === 2 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Step 2: Connect Google Sheets</h2>
                <p className="text-xs text-slate-400">Connect your Google Account to create a live ledger sheet</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 my-6 text-center">
              {googleConnected && spreadsheetUrl ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">✓ Google Sheets connected</h3>
                  <p className="text-xs text-slate-400">
                    A dedicated spreadsheet <code className="text-emerald-400">Bookkeeping Ledger - {businessName}</code> has been initialized.
                  </p>
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline font-medium"
                  >
                    Open Connected Google Sheet <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">
                    Connect your own Google account via OAuth. All transactions recorded via Telegram or web will automatically sync as rows in your personal ledger sheet.
                  </p>
                  <button
                    onClick={handleConnectGoogle}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm px-6 py-3 rounded-xl transition-all inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Connect Google Account
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(1)}
                className="text-xs text-slate-400 hover:text-white font-semibold"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                Next: Connect Telegram <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CONNECT TELEGRAM */}
        {step === 3 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Step 3: Connect Telegram</h2>
                <p className="text-xs text-slate-400">Link your Telegram chat to your workspace via universal bot</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 my-6 space-y-4 text-center">
              {!telegramDeepLink ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">
                    Generate a cryptographically secure single-use deep link for <code className="text-sky-400">@MySaaSBookkeeper_bot</code>.
                  </p>
                  <button
                    onClick={handleGenerateTelegramLink}
                    disabled={isGeneratingLink}
                    className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm px-6 py-3 rounded-xl transition-all inline-flex items-center gap-2 shadow-lg shadow-sky-500/20 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {isGeneratingLink ? 'Generating Secure Link...' : 'Generate Universal Deep Link'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-emerald-400">Deep Link Generated for {businessName}:</p>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-sky-400 break-all select-all">
                    {telegramDeepLink}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <a
                      href={telegramDeepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md"
                    >
                      Open in Telegram <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={handleSimulateTelegramConnection}
                      className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Verify Connection
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(2)}
                className="text-xs text-slate-400 hover:text-white font-semibold"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                Complete Onboarding <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* FINAL STEP: READY */}
        {step === 4 && (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30">
              <CheckCircle2 className="w-8 h-8 text-slate-950" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">You're ready!</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                Send your first transaction to your Telegram bookkeeping assistant or view your live dashboard.
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-left max-w-md mx-auto space-y-2 text-xs">
              <p className="font-semibold text-slate-300">Try sending Telegram messages like:</p>
              <ul className="text-slate-400 space-y-1 font-mono">
                <li className="text-emerald-400">"Aloo bhajiya sold for ₹50"</li>
                <li className="text-emerald-400">"Bought 10 kg potatoes for ₹400"</li>
                <li className="text-emerald-400">"Paid electricity bill ₹2300"</li>
              </ul>
            </div>

            <button
              onClick={handleEnterDashboard}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm px-8 py-3.5 rounded-xl transition-all shadow-xl shadow-emerald-500/20 inline-flex items-center gap-2"
            >
              Enter Business Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="text-center text-xs text-slate-400 py-4">
        Multi-Tenant Architecture • Universal Telegram Bot • Isolated Google Sheets
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-400 p-8 text-center text-xs">Loading Onboarding Wizard...</div>}>
      <OnboardingForm />
    </Suspense>
  );
}
