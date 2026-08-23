'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTenant } from '@/components/providers/TenantContext';
import { Transaction } from '@/lib/types';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Send,
  FileSpreadsheet,
  Receipt,
  AlertCircle,
  PlusCircle,
  Sparkles,
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const { currentBusiness } = useTenant();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Quick Telegram Simulator state
  const [simText, setSimText] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResponse, setSimResponse] = useState<string | null>(null);

  const fetchDashboardData = async (bizId: string) => {
    setLoading(true);

    const cacheKey = `autoledger_txs_${bizId}`;
    let localTxs: Transaction[] = [];

    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        localTxs = JSON.parse(cached);
        setTransactions(localTxs);

        // Pre-calculate metrics from local cache for instant UI response
        const todayStr = new Date().toISOString().split('T')[0];
        let todaySales = 0;
        let todayExpenses = 0;
        localTxs.forEach((tx) => {
          const amt = Number(tx.amount) || 0;
          if (tx.transaction_date === todayStr) {
            if (tx.transaction_type === 'sale') todaySales += amt;
            if (tx.transaction_type === 'expense' || tx.transaction_type === 'purchase') todayExpenses += amt;
          }
        });
        setMetrics({
          todaySales,
          todayExpenses,
          netCashFlow: todaySales - todayExpenses,
          transactionCount: localTxs.length,
        });
      } catch (e) {}
    }

    try {
      const res = await fetch(`/api/transactions/list?businessId=${bizId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.transactions)) {
        // Merge server transactions with local transactions so cold starts NEVER wipe data
        const map = new Map<string, Transaction>();
        localTxs.forEach((t) => map.set(t.id, t));
        data.transactions.forEach((t: Transaction) => map.set(t.id, t));
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setTransactions(merged);
        localStorage.setItem(cacheKey, JSON.stringify(merged));

        const todayStr = new Date().toISOString().split('T')[0];
        let todaySales = 0;
        let todayExpenses = 0;
        merged.forEach((tx) => {
          const amt = Number(tx.amount) || 0;
          if (tx.transaction_date === todayStr) {
            if (tx.transaction_type === 'sale') todaySales += amt;
            if (tx.transaction_type === 'expense' || tx.transaction_type === 'purchase') todayExpenses += amt;
          }
        });

        setMetrics({
          todaySales: data.metrics?.todaySales || todaySales,
          todayExpenses: data.metrics?.todayExpenses || todayExpenses,
          netCashFlow: (data.metrics?.todaySales || todaySales) - (data.metrics?.todayExpenses || todayExpenses),
          transactionCount: merged.length,
        });
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentBusiness?.id) {
      fetchDashboardData(currentBusiness.id);
    }
  }, [currentBusiness?.id]);

  const handleSimulateTelegramMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simText.trim()) return;
    setIsSimulating(true);
    setSimResponse(null);

    try {
      const targetBizId = currentBusiness?.id || 'biz_tenant_bhavik';
      const chatId = `chat_${targetBizId}`;
      const res = await fetch('/api/telegram/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          update_id: Date.now(),
          business_id: targetBizId,
          message: {
            message_id: Date.now(),
            business_id: targetBizId,
            from: { id: 100001, first_name: 'Owner', username: 'owner_user' },
            chat: { id: chatId, first_name: 'Owner Chat', type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: simText,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSimResponse(data.responseMessage || 'Transaction recorded via Telegram!');
        setSimText('');
        if (currentBusiness?.id) {
          fetchDashboardData(currentBusiness.id);
        }
      } else {
        setSimResponse(`Error: ${data.error || data.responseMessage || 'Simulation failed'}`);
      }
    } catch (err: any) {
      setSimResponse(`Error: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Business Workspace Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ⚡ Live Telegram Conversational Bookkeeping
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Record transactions via Telegram</h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Send messages like <span className="text-emerald-300 font-mono">"Aloo bhajiya sold for ₹50"</span> or{' '}
              <span className="text-emerald-300 font-mono">"Bought 10 kg potatoes for ₹400"</span> to update your ledger in real-time.
            </p>
          </div>

          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
            <Link
              href="/dashboard/integrations"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 text-sm"
            >
              <Send className="w-4 h-4" />
              Connect Telegram Bot
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Today's Sales */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Today's Sales</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-white">
              {loading && !metrics ? '...' : `₹${metrics?.todaySales?.toLocaleString('en-IN') || 0}`}
            </h3>
            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <ArrowUpRight className="w-3 h-3" /> Live Daily Revenue
            </p>
          </div>
        </div>

        {/* Today's Expenses */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Today's Expenses</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-white">
              {loading && !metrics ? '...' : `₹${metrics?.todayExpenses?.toLocaleString('en-IN') || 0}`}
            </h3>
            <p className="text-xs text-rose-400 mt-1 flex items-center gap-1 font-medium">
              <ArrowDownRight className="w-3 h-3" /> Live Daily Outflow
            </p>
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Net Cash Flow</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className={`text-2xl font-bold ${(metrics?.netCashFlow || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {loading && !metrics ? '...' : `₹${metrics?.netCashFlow?.toLocaleString('en-IN') || 0}`}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">Total Sales - Expenses</p>
          </div>
        </div>

        {/* Receivables */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Receivables</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-amber-400">
              {loading && !metrics ? '...' : `₹${metrics?.totalReceivables?.toLocaleString('en-IN') || 0}`}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">Customers owe you</p>
          </div>
        </div>

        {/* Payables */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Payables</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-indigo-400">
              {loading && !metrics ? '...' : `₹${metrics?.totalPayables?.toLocaleString('en-IN') || 0}`}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">You owe suppliers</p>
          </div>
        </div>
      </div>

      {/* Quick Telegram Test Box & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
              <p className="text-xs text-slate-400">Live ledger entries from Telegram & Web</p>
            </div>
            <Link
              href="/dashboard/transactions"
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              View All Transactions →
            </Link>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden backdrop-blur-md">
            {loading && transactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading ledger data...</div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center">
                <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-300 font-medium text-sm">No transactions recorded yet</p>
                <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                  Send a message to your Telegram bot or use the simulator on the right to add your first transaction.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {transactions.slice(0, 8).map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                          tx.transaction_type === 'sale'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {tx.transaction_type === 'sale' ? 'SALE' : 'EXP'}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{tx.item}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-400">{tx.category}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs text-slate-500">{tx.transaction_date}</span>
                          <span className="text-slate-600">•</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                            {tx.source}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-sm font-bold font-mono ${
                          tx.transaction_type === 'sale' ? 'text-emerald-400' : 'text-white'
                        }`}
                      >
                        {tx.transaction_type === 'sale' ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] font-medium uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        {tx.payment_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Interactive Telegram Test Simulator */}
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Live AI Simulator</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Test how natural language messages are parsed into structured ledger entries.
            </p>

            <form onSubmit={handleSimulateTelegramMessage} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Telegram Message</label>
                <input
                  type="text"
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  placeholder='e.g. "Meduvada sold for 40rs"'
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={isSimulating || !simText.trim()}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                {isSimulating ? 'Extracting AI Data...' : 'Simulate Telegram Message'}
              </button>
            </form>

            {simResponse && (
              <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 break-words">
                {simResponse}
              </div>
            )}
          </div>

          <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-5">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Quick Test Phrases</h4>
            <ul className="text-xs text-slate-400 space-y-1.5 font-mono">
              <li
                onClick={() => setSimText('Meduvada sold for 40rs')}
                className="cursor-pointer hover:text-emerald-300 transition-colors"
              >
                • "Meduvada sold for 40rs"
              </li>
              <li
                onClick={() => setSimText('Apple sold for 100rs')}
                className="cursor-pointer hover:text-emerald-300 transition-colors"
              >
                • "Apple sold for 100rs"
              </li>
              <li
                onClick={() => setSimText('Daily total counter sale 4500 rupees')}
                className="cursor-pointer hover:text-emerald-300 transition-colors"
              >
                • "Daily total counter sale 4500 rupees"
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
