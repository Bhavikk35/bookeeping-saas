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
    try {
      const res = await fetch(`/api/transactions/list?businessId=${bizId}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
        setMetrics(data.metrics);
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
      const targetBizId = currentBusiness?.id || 'biz_aaaa1111-1111-1111-1111-111111111111';
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
        setSimResponse(data.responseMessage);
        setSimText('');
        if (currentBusiness?.id) fetchDashboardData(currentBusiness.id);
      } else {
        setSimResponse(`⚠️ ${data.responseMessage || 'Processing failed.'}`);
      }
    } catch (err: any) {
      setSimResponse(`⚠️ Error: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const symbol = currentBusiness?.currency === 'INR' ? '₹' : '$';

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Telegram Simulator */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Live Telegram Conversational Bookkeeping
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">
              Record transactions via Telegram
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Send messages like <code className="text-emerald-400">"Aloo bhajiya sold for ₹50"</code> or <code className="text-emerald-400">"Bought 10 kg potatoes for ₹400"</code> to update your ledger in real-time.
            </p>
          </div>

          {/* Quick Telegram Message Simulator Form */}
          <form
            onSubmit={handleSimulateTelegramMessage}
            className="w-full lg:w-auto flex-1 max-w-md bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2 shadow-inner"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={simText}
                onChange={(e) => setSimText(e.target.value)}
                placeholder="Test: 'Aloo bhajiya sold for ₹50'..."
                className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSimulating}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {isSimulating ? 'Sending...' : 'Simulate Telegram'}
              </button>
            </div>
            {simResponse && (
              <p className="text-[11px] font-mono text-emerald-400 px-3 py-1 bg-slate-900/90 rounded border border-slate-800/80 truncate">
                {simResponse}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Today's Sales */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Today's Sales</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white">
            {symbol}{metrics ? metrics.todaySales.toLocaleString() : '0'}
          </p>
          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3" /> Live Daily Revenue
          </span>
        </div>

        {/* Today's Expenses */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Today's Expenses</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white">
            {symbol}{metrics ? metrics.todayExpenses.toLocaleString() : '0'}
          </p>
          <span className="text-[11px] text-rose-400 font-medium flex items-center gap-1 mt-1">
            <ArrowDownRight className="w-3 h-3" /> Live Daily Outflow
          </span>
        </div>

        {/* Net Cash Flow */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Net Cash Flow</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-black ${(metrics?.netCashFlow || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {symbol}{metrics ? metrics.netCashFlow.toLocaleString() : '0'}
          </p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            Total Sales - Expenses
          </span>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Receivables</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400">
            {symbol}{metrics ? metrics.totalReceivables.toLocaleString() : '0'}
          </p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            Customers owe you
          </span>
        </div>

        {/* Outstanding Payables */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Payables</span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-sky-400">
            {symbol}{metrics ? metrics.totalPayables.toLocaleString() : '0'}
          </p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            You owe suppliers
          </span>
        </div>
      </div>

      {/* Financial Transparency Note (Gross Profit / Cost Warning) */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400">
          <span className="font-semibold text-slate-200 block mb-0.5">Financial Transparency Notice</span>
          Gross profit and gross margin calculation requires item-level Cost of Goods Sold (COGS). If unit cost data has not been configured in Settings, profit metrics are marked as estimated or uncalculated to maintain accurate financial accounting.
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Recent Transactions</h3>
            <p className="text-xs text-slate-400">Live ledger recorded for {currentBusiness?.business_name}</p>
          </div>
          <Link
            href="/dashboard/transactions"
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            View All Transactions →
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading ledger data...</div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No transactions recorded yet. Send your first Telegram message above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Item</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {transactions.slice(0, 5).map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-3 text-slate-300">{tx.transaction_date}</td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          tx.transaction_type === 'sale'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : tx.transaction_type === 'expense' || tx.transaction_type === 'purchase'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {tx.transaction_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-white font-semibold">{tx.item}</td>
                    <td className="py-3.5 px-3 text-slate-400">{tx.category}</td>
                    <td className="py-3.5 px-3 text-right font-bold text-white">
                      {symbol}{tx.amount}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
                          tx.source === 'telegram'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {tx.source === 'telegram' ? <Send className="w-3 h-3" /> : <Receipt className="w-3 h-3" />}
                        {tx.source}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
