'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '@/components/providers/TenantContext';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Zap,
  Mic,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Info,
  Check,
} from 'lucide-react';

export default function TelegramConnectPage() {
  const { currentBusiness } = useTenant();
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<any>(null);
  const [botUsername, setBotUsername] = useState('MySaaSBookkeeper_bot');
  
  // Link generation state
  const [generatedLink, setGeneratedLink] = useState('');
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchStatus = async () => {
    const bizId = currentBusiness?.id || 'biz_tenant_active';
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/telegram/status?businessId=${bizId}`);
      const data = await res.json();
      if (data.success) {
        setConnected(data.connected);
        setConnectionDetails(data.connection);
        if (data.botUsername) setBotUsername(data.botUsername);
      }
    } catch (e) {
      console.error('Failed to fetch Telegram status:', e);
      setConnected(false);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [currentBusiness?.id]);

  const handleGenerateLink = async () => {
    const bizId = currentBusiness?.id || 'biz_tenant_active';
    const bizName = currentBusiness?.business_name || 'My Business Workspace';
    setLoading(true);
    try {
      const res = await fetch('/api/telegram/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: bizId, businessName: bizName }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        setGeneratedLink(data.deepLink);
      }
    } catch (e) {
      console.error('Failed to generate Telegram connection link:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const defaultBotUrl = `https://t.me/${botUsername}`;
  const activeLink = generatedLink || defaultBotUrl;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white border border-[#E2E8E4] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EAF7F0] border border-[#168A55]/20 text-[#168A55] flex items-center justify-center shrink-0 shadow-xs">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-[#17211C] tracking-tight">Telegram Assistant Connection</h2>
                {statusLoading ? (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full animate-pulse">
                    Checking...
                  </span>
                ) : connected ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#168A55] bg-[#EAF7F0] px-2.5 py-0.5 rounded-full border border-[#168A55]/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5" /> Reconnect Required
                  </span>
                )}
              </div>
              <p className="text-xs text-[#66736C] mt-1">
                Record daily transactions naturally via Telegram text or voice notes. Linked to{' '}
                <strong className="text-[#17211C] font-semibold">{currentBusiness?.business_name || 'My Business'}</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={fetchStatus}
            disabled={statusLoading}
            className="self-start md:self-center px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-[#E2E8E4] rounded-xl text-xs font-bold text-[#17211C] flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#66736C] ${statusLoading ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>
      </div>

      {/* Main Action Card: Generate Connection Link */}
      <div className="bg-white border border-[#E2E8E4] rounded-2xl p-6 shadow-xs space-y-6">
        <div className="border-b border-[#E2E8E4] pb-4">
          <h3 className="text-base font-extrabold text-[#17211C] flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#168A55]" />
            Generate Telegram Reconnect Link
          </h3>
          <p className="text-xs text-[#66736C] mt-1">
            If your bot connection dropped or you switched Telegram accounts, click below to generate a new 1-click connection link.
          </p>
        </div>

        {/* Generate Button Area */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={handleGenerateLink}
            disabled={loading}
            className="px-5 py-3 bg-[#168A55] hover:bg-[#0D5C3A] text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Generating Link...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" /> ⚡ Generate Connection Link
              </>
            )}
          </button>

          <a
            href={activeLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 bg-[#EAF7F0] hover:bg-[#168A55] hover:text-white border border-[#168A55]/30 text-[#168A55] font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" /> Open Telegram Bot <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Generated Link Display Box */}
        {generatedLink && (
          <div className="p-4 bg-[#F7F9F8] border border-[#168A55]/30 rounded-xl space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase text-[#168A55] tracking-wider">
                Your Unique Connection Link
              </span>
              {token && (
                <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#E2E8E4] text-[#66736C]">
                  Pairing Token: {token}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="flex-1 bg-white border border-[#E2E8E4] rounded-lg px-3 py-2 text-xs font-mono text-[#17211C] select-all focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-[#E2E8E4] rounded-lg text-xs font-bold text-[#17211C] flex items-center gap-1.5 shrink-0 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#168A55]" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#66736C]" /> Copy
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-[#66736C] flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-[#168A55] shrink-0" />
              Tap <strong>Open Telegram Bot</strong> above or copy this link into Telegram and press <strong>START</strong>.
            </p>
          </div>
        )}
      </div>

      {/* How to Record Transactions Section */}
      <div className="bg-white border border-[#E2E8E4] rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-[#17211C] uppercase tracking-wider text-[#66736C]">
          How to Record Transactions in Telegram
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#F7F9F8] rounded-xl border border-[#E2E8E4] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-[#EAF7F0] text-[#168A55] flex items-center justify-center font-bold text-xs">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-extrabold text-[#17211C]">1. Text Message</h4>
            <p className="text-[11px] text-[#66736C]">
              Send simple text in English, Hindi, or Hinglish:
            </p>
            <p className="text-[11px] font-mono text-[#168A55] font-semibold bg-white p-2 rounded border border-[#E2E8E4]">
              "Vadapav 50 rs la vikla"
            </p>
          </div>

          <div className="p-4 bg-[#F7F9F8] rounded-xl border border-[#E2E8E4] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
              <Mic className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-extrabold text-[#17211C]">2. Voice Note 🎙️</h4>
            <p className="text-[11px] text-[#66736C]">
              Hold the microphone icon in Telegram and speak naturally:
            </p>
            <p className="text-[11px] font-mono text-amber-800 font-semibold bg-white p-2 rounded border border-[#E2E8E4]">
              "Batate 400 rs la ghetle"
            </p>
          </div>

          <div className="p-4 bg-[#F7F9F8] rounded-xl border border-[#E2E8E4] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
              <Smartphone className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-extrabold text-[#17211C]">3. Bot Commands</h4>
            <p className="text-[11px] text-[#66736C]">
              Type commands in chat anytime for instant reports:
            </p>
            <p className="text-[11px] font-mono text-blue-800 font-semibold bg-white p-2 rounded border border-[#E2E8E4]">
              /summary • /history • /today
            </p>
          </div>
        </div>
      </div>

      {/* Security & Reliability Banner */}
      <div className="p-4 bg-[#EAF7F0] border border-[#168A55]/20 rounded-2xl flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-[#168A55] shrink-0" />
        <p className="text-xs text-[#17211C] font-medium leading-relaxed">
          <strong className="font-extrabold text-[#168A55]">Always Connected Guarantee:</strong> Every transaction recorded in Telegram is instantly saved to your isolated business ledger and synced to your web dashboard in real time.
        </p>
      </div>
    </div>
  );
}
