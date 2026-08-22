'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '@/components/providers/TenantContext';
import {
  Send,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  Globe,
} from 'lucide-react';

export default function IntegrationsPage() {
  const { currentBusiness } = useTenant();
  const [telegramStatus, setTelegramStatus] = useState<any>(null);
  const [googleStatus, setGoogleStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Deep Link Generator State
  const [deepLink, setDeepLink] = useState('');
  const [token, setToken] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Webhook Registration State
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [webhookMsg, setWebhookMsg] = useState<string | null>(null);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);

  const fetchIntegrations = async () => {
    if (!currentBusiness?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/list?businessId=${currentBusiness.id}`);
      const data = await res.json();
      if (data.success) {
        const isBizA = currentBusiness.id.includes('aaaa1111');
        setTelegramStatus({
          connected: isBizA || !!token,
          username: 'MySaaSBookkeeper_bot',
          chatId: isBizA ? '900001' : 'Active Chat',
        });
        setGoogleStatus({
          connected: isBizA,
          spreadsheetId: isBizA ? '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' : null,
          spreadsheetUrl: isBizA
            ? 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'
            : null,
        });
      }
    } catch (err) {
      console.error('Failed to load integration status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, [currentBusiness?.id]);

  const handleGenerateLink = async () => {
    if (!currentBusiness?.id) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/telegram/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: currentBusiness.id }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        setDeepLink(data.deepLink);
      }
    } catch (err) {
      alert('Failed to generate Telegram deep link.');
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

  const handleConnectGoogle = async () => {
    if (!currentBusiness?.id) return;
    // Check if live Google Client ID exists
    const resAuth = await fetch(`/api/google/auth-url?businessId=${currentBusiness.id}`);
    const authData = await resAuth.json();

    if (authData.url && !authData.url.includes('demo')) {
      window.location.href = authData.url;
    } else {
      // Demo / offline connection fallback
      await fetch(`/api/google/callback?state=${currentBusiness.id}&code=demo_code`);
      fetchIntegrations();
    }
  };

  const handleRegisterWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrlInput) return;
    setIsSettingWebhook(true);
    setWebhookMsg(null);

    try {
      const targetUrl = webhookUrlInput.endsWith('/api/telegram/webhook')
        ? webhookUrlInput
        : `${webhookUrlInput.replace(/\/$/, '')}/api/telegram/webhook`;

      const res = await fetch('/api/telegram/set-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: targetUrl }),
      });

      const data = await res.json();
      if (data.success) {
        setWebhookMsg(`✓ Telegram Webhook registered to: ${targetUrl}`);
      } else {
        setWebhookMsg(`⚠️ Webhook error: ${data.error || 'Failed to set webhook'}`);
      }
    } catch (err: any) {
      setWebhookMsg(`⚠️ Error: ${err.message}`);
    } fontally: {
      setIsSettingWebhook(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h3 className="text-xl font-extrabold text-white tracking-tight">Integrations & Connections</h3>
        <p className="text-xs text-slate-400">
          Manage Telegram bot deep-links, Google Sheets sync, and public webhooks for {currentBusiness?.business_name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. UNIVERSAL TELEGRAM BOT CARD */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Universal Telegram Bot</h4>
                  <p className="text-xs text-slate-400">@MySaaSBookkeeper_bot</p>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  telegramStatus?.connected
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {telegramStatus?.connected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {telegramStatus?.connected ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              One shared bot serves all SaaS customers. Click below to generate a cryptographically random, 15-minute single-use deep link.
            </p>

            {deepLink && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 mb-4">
                <p className="text-[11px] font-semibold text-slate-400">Your Deep Link:</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xs font-mono text-sky-400 truncate flex-1">{deepLink}</code>
                  <button
                    onClick={handleCopyLink}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={handleGenerateLink}
              disabled={isGenerating}
              className="w-full sm:w-auto bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {isGenerating ? 'Generating Link...' : 'Generate New Connection Link'}
            </button>

            {deepLink && (
              <a
                href={deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                Open Telegram <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* 2. GOOGLE SHEETS CARD */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Google Sheets Sync</h4>
                  <p className="text-xs text-slate-400">Personal Account OAuth</p>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  googleStatus?.connected
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {googleStatus?.connected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {googleStatus?.connected ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Connect your Google Account to automatically append new transactions as structured rows in your business ledger.
            </p>

            {googleStatus?.spreadsheetUrl && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-1 mb-4">
                <p className="text-[11px] font-semibold text-slate-400">Active Spreadsheet:</p>
                <a
                  href={googleStatus.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1 truncate"
                >
                  Open Business Sheet <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={handleConnectGoogle}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {googleStatus?.connected ? 'Reconnect Google Account' : 'Connect Google Sheets'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. LIVE TELEGRAM WEBHOOK REGISTRATION TOOL */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
        <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <Globe className="w-4 h-4 text-sky-400" /> Telegram Webhook Registration
        </h4>
        <p className="text-xs text-slate-400 mb-4">
          Register your live production domain or ngrok URL with Telegram's Webhook API so incoming Telegram messages reach your application endpoint <code className="text-sky-400">/api/telegram/webhook</code>.
        </p>

        <form onSubmit={handleRegisterWebhook} className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="url"
            required
            value={webhookUrlInput}
            onChange={(e) => setWebhookUrlInput(e.target.value)}
            placeholder="https://your-domain.vercel.app or https://xxxx.ngrok-free.app"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-full"
          />
          <button
            type="submit"
            disabled={isSettingWebhook}
            className="w-full sm:w-auto bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-sky-500/20 disabled:opacity-50 shrink-0"
          >
            {isSettingWebhook ? 'Registering...' : 'Register Webhook'}
          </button>
        </form>

        {webhookMsg && (
          <p className="text-xs font-mono text-emerald-400 mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
            {webhookMsg}
          </p>
        )}
      </div>
    </div>
  );
}
