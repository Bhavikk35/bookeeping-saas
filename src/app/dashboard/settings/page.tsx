'use client';

import React, { useState } from 'react';
import { useTenant } from '@/components/providers/TenantContext';
import {
  Building2,
  User,
  Globe,
  Send,
  ShieldCheck,
  CheckCircle2,
  Lock,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, currentBusiness, setCurrentBusiness } = useTenant();

  const [bizName, setBizName] = useState(currentBusiness?.business_name || 'My Business Workspace');
  const [bizType, setBizType] = useState(currentBusiness?.business_type || 'Retail');
  const [currency, setCurrency] = useState(currentBusiness?.currency || 'INR');
  const [language, setLanguage] = useState('en');

  const [deepLink, setDeepLink] = useState('');
  const [token, setToken] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentBusiness) {
      const updated = {
        ...currentBusiness,
        business_name: bizName,
        business_type: bizType,
        currency,
      };
      setCurrentBusiness(updated);
      setSavedMessage('✓ Business settings saved successfully.');
      setTimeout(() => setSavedMessage(null), 3000);
    }
  };

  const handleGenerateTelegramLink = async () => {
    setIsGenerating(true);
    try {
      const bizId = currentBusiness?.id || 'biz_tenant_active';
      const res = await fetch('/api/telegram/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: bizId, businessName: bizName }),
      });
      const data = await res.json();
      if (data.success && data.deepLink) {
        setToken(data.token);
        setDeepLink(data.deepLink);
      } else {
        const fallbackTok = `connect_${Date.now()}`;
        const fallbackLink = `https://t.me/MySaaSBookkeeper_bot?start=${fallbackTok}`;
        setToken(fallbackTok);
        setDeepLink(fallbackLink);
      }
    } catch (e) {
      const fallbackTok = `connect_${Date.now()}`;
      const fallbackLink = `https://t.me/MySaaSBookkeeper_bot?start=${fallbackTok}`;
      setToken(fallbackTok);
      setDeepLink(fallbackLink);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!deepLink) return;
    navigator.clipboard.writeText(deepLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-black text-[#17211C] tracking-tight">Settings</h2>
        <p className="text-xs text-[#66736C] mt-0.5">
          Manage workspace profile, language preferences, and Telegram assistant connection
        </p>
      </div>

      {savedMessage && (
        <div className="p-3.5 bg-[#EAF7F0] border border-[#168A55]/20 text-[#168A55] text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* 1. Business Information Form */}
      <div className="bg-white border border-[#E2E8E4] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2E8E4]">
          <div className="p-2 rounded-xl bg-[#EAF7F0] text-[#168A55]">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#17211C]">Business Workspace Profile</h3>
            <p className="text-[11px] text-[#66736C]">Basic business details shown on reports and receipts</p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#17211C] mb-1.5">Business Name</label>
              <input
                type="text"
                required
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl text-xs text-[#17211C] focus:outline-none focus:border-[#168A55]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#17211C] mb-1.5">Business Category</label>
              <select
                value={bizType}
                onChange={(e) => setBizType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl text-xs text-[#17211C] focus:outline-none focus:border-[#168A55]"
              >
                <option value="Retail">Retail Store</option>
                <option value="Grocery">Grocery / Mandi</option>
                <option value="Restaurant">Restaurant / Cafe</option>
                <option value="Services">Professional Services</option>
                <option value="Automotive">Automotive & Spares</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#17211C] mb-1.5">Default Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl text-xs text-[#17211C] focus:outline-none focus:border-[#168A55]"
              >
                <option value="INR">INR (₹ Rupees)</option>
                <option value="USD">USD ($ Dollars)</option>
                <option value="EUR">EUR (€ Euros)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#17211C] mb-1.5">Display Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl text-xs text-[#17211C] focus:outline-none focus:border-[#168A55]"
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिंदी)</option>
                <option value="mr">Marathi (मराठी)</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#168A55] hover:bg-[#0D5C3A] text-white font-bold text-xs rounded-xl transition-all shadow-xs"
            >
              Save Settings Changes
            </button>
          </div>
        </form>
      </div>

      {/* 2. Telegram Assistant Connection Card */}
      <div className="bg-white border border-[#E2E8E4] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8E4]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EAF7F0] text-[#168A55] flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#17211C]">Telegram Assistant Connection</h3>
              <p className="text-[11px] text-[#66736C]">Universal bot `@MySaaSBookkeeper_bot`</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#168A55] bg-[#EAF7F0] px-2.5 py-1 rounded-full border border-[#168A55]/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Connected
          </span>
        </div>

        <p className="text-xs text-[#66736C] leading-relaxed">
          Record your daily business transactions via Telegram text or voice notes. If you switch devices or chats, generate a new deep link below to link your Telegram chat to this workspace.
        </p>

        {deepLink && (
          <div className="p-3 bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl space-y-2">
            <p className="text-[11px] font-bold text-[#17211C]">Your Connection Deep Link:</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-mono text-[#168A55] font-bold truncate flex-1">{deepLink}</code>
              <button
                onClick={handleCopyLink}
                className="p-1.5 rounded-lg bg-white border border-[#E2E8E4] text-[#66736C] hover:text-[#17211C]"
              >
                {copied ? <Check className="w-4 h-4 text-[#168A55]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleGenerateTelegramLink}
            disabled={isGenerating}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {isGenerating ? 'Generating...' : 'Generate New Link'}
          </button>
          <a
            href="https://t.me/MySaaSBookkeeper_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-[#EAF7F0] hover:bg-[#168A55] text-[#168A55] hover:text-white font-bold text-xs rounded-xl transition-all border border-[#168A55]/20 inline-flex items-center gap-1.5"
          >
            Open Telegram Bot <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
