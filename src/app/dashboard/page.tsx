'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTenant } from '@/components/providers/TenantContext';
import { Transaction, TransactionType } from '@/lib/types';
import { exportToExcel, exportToPDF } from '@/lib/export/report-exporter';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Send,
  FileSpreadsheet,
  FileText,
  Receipt,
  PlusCircle,
  Search,
  CheckCircle2,
  Calendar,
  X,
  UserCheck,
  AlertCircle,
  Filter,
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const { currentBusiness } = useTenant();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Time Period Filter State: Today | This Week | This Month | Custom
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Add Transaction Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    transaction_type: 'sale' as TransactionType,
    item: '',
    amount: '',
    quantity: '1',
    category: 'General',
    customer_name: '',
    supplier_name: '',
    payment_status: 'paid',
    description: '',
  });

  const fetchDashboardData = async (bizId: string) => {
    setLoading(true);
    const targetId = bizId || 'biz_tenant_demo';
    const cacheKey = `autoledger_txs_${targetId}`;
    let localTxs: Transaction[] = [];

    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        localTxs = JSON.parse(cached);
        setTransactions(localTxs);
      } catch (e) {}
    }

    try {
      const res = await fetch(`/api/transactions/list?businessId=${targetId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.transactions)) {
        const map = new Map<string, Transaction>();
        localTxs.forEach((t) => map.set(t.id, t));
        data.transactions.forEach((t: Transaction) => map.set(t.id, t));
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setTransactions(merged);
        localStorage.setItem(cacheKey, JSON.stringify(merged));
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bizId = currentBusiness?.id || 'biz_tenant_demo';
    fetchDashboardData(bizId);
  }, [currentBusiness?.id]);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item || !formData.amount) return;
    setIsSubmitting(true);

    try {
      const bizId = currentBusiness?.id || 'biz_tenant_demo';
      const res = await fetch('/api/transactions/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: bizId,
          transaction_type: formData.transaction_type,
          amount: parseFloat(formData.amount),
          currency: currentBusiness?.currency || 'INR',
          item: formData.item,
          quantity: parseInt(formData.quantity) || 1,
          category: formData.category,
          customer_name: formData.customer_name || undefined,
          supplier_name: formData.supplier_name || undefined,
          payment_status: formData.payment_status,
          description: formData.description,
          transaction_date: new Date().toISOString().split('T')[0],
          source: 'web_manual',
        }),
      });

      const data = await res.json();
      if (data.success && data.transaction) {
        const newTx = data.transaction;
        const cacheKey = `autoledger_txs_${bizId}`;
        const updatedList = [newTx, ...transactions];
        setTransactions(updatedList);
        localStorage.setItem(cacheKey, JSON.stringify(updatedList));

        setModalOpen(false);
        setFormData({
          transaction_type: 'sale',
          item: '',
          amount: '',
          quantity: '1',
          category: 'General',
          customer_name: '',
          supplier_name: '',
          payment_status: 'paid',
          description: '',
        });
      }
    } catch (err) {
      console.error('Error adding transaction manually:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered transactions calculation
  const filteredTransactions = transactions.filter((tx) => {
    const matchesType = selectedType === 'all' || tx.transaction_type === selectedType;
    const matchesCategory =
      selectedCategory === 'all' || tx.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      tx.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.description && tx.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.customer_name && tx.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.supplier_name && tx.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesType && matchesCategory && matchesSearch;
  });

  // Calculate totals based on selected period
  const todayStr = new Date().toISOString().split('T')[0];
  let periodSales = 0;
  let periodExpenses = 0;
  let moneyToCollect = 0;
  let moneyToPay = 0;

  transactions.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    const isToday = tx.transaction_date === todayStr;

    if (period === 'today') {
      if (isToday) {
        if (tx.transaction_type === 'sale') periodSales += amt;
        if (tx.transaction_type === 'expense' || tx.transaction_type === 'purchase') periodExpenses += amt;
      }
    } else {
      if (tx.transaction_type === 'sale') periodSales += amt;
      if (tx.transaction_type === 'expense' || tx.transaction_type === 'purchase') periodExpenses += amt;
    }

    if (tx.transaction_type === 'receivable' || (tx.transaction_type === 'sale' && tx.payment_status === 'pending')) {
      moneyToCollect += amt;
    } else if (tx.transaction_type === 'payable' || (tx.transaction_type === 'purchase' && tx.payment_status === 'pending')) {
      moneyToPay += amt;
    }
  });

  const netCashFlow = periodSales - periodExpenses;
  const categories = Array.from(new Set(transactions.map((t) => t.category)));

  return (
    <div className="space-y-6">
      {/* Top Controls Header: Time Period Control & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#17211C] tracking-tight">Business Overview</h2>
          <p className="text-xs text-[#66736C] mt-0.5">
            Real-time financial position for{' '}
            <span className="font-bold text-[#168A55]">{currentBusiness?.business_name || 'My Business Workspace'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Period Filter Pills */}
          <div className="bg-white border border-[#E2E8E4] p-1 rounded-xl flex items-center shadow-xs">
            {(['today', 'week', 'month', 'all'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                  period === p
                    ? 'bg-[#168A55] text-white shadow-xs'
                    : 'text-[#66736C] hover:text-[#17211C]'
                }`}
              >
                {p === 'today' ? "Today" : p === 'week' ? "This Week" : p === 'month' ? "This Month" : "All Time"}
              </button>
            ))}
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#168A55] hover:bg-[#0D5C3A] text-white font-bold text-xs rounded-xl transition-all shadow-sm shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            + Add Transaction
          </button>
        </div>
      </div>

      {/* Primary KPI Overview Cards (Green, Amber, Red Visual System) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Today's / Period Revenue */}
        <div className="bg-white border border-[#E2E8E4] rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[#66736C] text-[11px] font-bold uppercase tracking-wider">
              {period === 'today' ? "Today's Revenue" : "Total Revenue"}
            </span>
            <div className="p-2 rounded-xl bg-[#EAF7F0] text-[#168A55] border border-[#168A55]/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-[#168A55] tracking-tight">
              {loading ? '...' : `₹${periodSales.toLocaleString('en-IN')}`}
            </h3>
            <p className="text-[11px] text-[#168A55] font-semibold mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Money Coming In
            </p>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white border border-[#E2E8E4] rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[#66736C] text-[11px] font-bold uppercase tracking-wider">
              {period === 'today' ? "Today's Expenses" : "Total Expenses"}
            </span>
            <div className="p-2 rounded-xl bg-slate-100 text-[#66736C]">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-[#17211C] tracking-tight">
              {loading ? '...' : `₹${periodExpenses.toLocaleString('en-IN')}`}
            </h3>
            <p className="text-[11px] text-[#66736C] font-semibold mt-1 flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" /> Outflow & Expenses
            </p>
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="bg-white border border-[#E2E8E4] rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[#66736C] text-[11px] font-bold uppercase tracking-wider">Net Cash Flow</span>
            <div className="p-2 rounded-xl bg-[#EAF7F0] text-[#168A55]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className={`text-2xl font-black tracking-tight ${netCashFlow >= 0 ? 'text-[#168A55]' : 'text-red-600'}`}>
              {loading ? '...' : `₹${netCashFlow.toLocaleString('en-IN')}`}
            </h3>
            <p className="text-[11px] text-[#66736C] font-semibold mt-1">Revenue minus Expenses</p>
          </div>
        </div>

        {/* Money to Collect (Amber Attention State) */}
        <div className="bg-white border border-[#E2E8E4] rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[#66736C] text-[11px] font-bold uppercase tracking-wider">Money to Collect</span>
            <div className="p-2 rounded-xl bg-amber-50 text-[#D97706] border border-amber-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-[#D97706] tracking-tight">
              {loading ? '...' : `₹${moneyToCollect.toLocaleString('en-IN')}`}
            </h3>
            <p className="text-[11px] text-[#D97706] font-semibold mt-1">Customers owe you</p>
          </div>
        </div>

        {/* Money to Pay */}
        <div className="bg-white border border-[#E2E8E4] rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[#66736C] text-[11px] font-bold uppercase tracking-wider">Money to Pay</span>
            <div className="p-2 rounded-xl bg-slate-100 text-[#66736C]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-[#17211C] tracking-tight">
              {loading ? '...' : `₹${moneyToPay.toLocaleString('en-IN')}`}
            </h3>
            <p className="text-[11px] text-[#66736C] font-semibold mt-1">You owe suppliers</p>
          </div>
        </div>
      </div>

      {/* Telegram Assistant Quick Callout Box */}
      <div className="bg-white border border-[#E2E8E4] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#EAF7F0] border border-[#168A55]/20 text-[#168A55] flex items-center justify-center shrink-0">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#17211C]">Telegram Voice & Text Assistant Active</h4>
            <p className="text-xs text-[#66736C] mt-0.5">
              Send messages like <span className="font-mono text-[#168A55] font-bold">"Vadapav 50 rs la vikla"</span> or{' '}
              <span className="font-mono text-[#168A55] font-bold">"Batate 400 rs la ghetle"</span> to record transactions automatically.
            </p>
          </div>
        </div>

        <a
          href="https://t.me/MySaaSBookkeeper_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-[#EAF7F0] hover:bg-[#168A55] text-[#168A55] hover:text-white font-bold text-xs rounded-xl transition-all border border-[#168A55]/20 shrink-0 inline-flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" /> Open Telegram Bot
        </a>
      </div>

      {/* Recent Transactions List with Search & Filters */}
      <div className="bg-white border border-[#E2E8E4] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8E4]">
          <div>
            <h3 className="text-base font-extrabold text-[#17211C]">Recent Transactions</h3>
            <p className="text-xs text-[#66736C]">All transactions recorded via Telegram, Voice Notes, or Web</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#66736C]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#F7F9F8] border border-[#E2E8E4] rounded-lg text-xs text-[#17211C] placeholder-[#66736C] focus:outline-none focus:border-[#168A55]"
              />
            </div>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1.5 bg-[#F7F9F8] border border-[#E2E8E4] rounded-lg text-xs font-semibold text-[#17211C] focus:outline-none focus:border-[#168A55]"
            >
              <option value="all">All Types</option>
              <option value="sale">Sales</option>
              <option value="expense">Expenses</option>
              <option value="purchase">Purchases</option>
              <option value="money_received">Money Received</option>
              <option value="money_paid">Money Paid</option>
              <option value="receivable">Receivables</option>
              <option value="payable">Payables</option>
            </select>
          </div>
        </div>

        {/* Transactions Table / List */}
        {loading && transactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#66736C]">Loading transactions...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Receipt className="w-10 h-10 text-[#66736C] mx-auto opacity-50" />
            <p className="text-sm font-bold text-[#17211C]">No transactions found</p>
            <p className="text-xs text-[#66736C]">Start recording transactions via Telegram or click + Add Transaction above.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8E4]">
            {filteredTransactions.slice(0, 10).map((tx) => {
              const isSale = tx.transaction_type === 'sale' || tx.transaction_type === 'money_received';
              const isExpense = tx.transaction_type === 'expense' || tx.transaction_type === 'purchase' || tx.transaction_type === 'money_paid';

              return (
                <div
                  key={tx.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F9F8]/60 transition-colors px-2 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[11px] shrink-0 ${
                        isSale
                          ? 'bg-[#EAF7F0] text-[#168A55] border border-[#168A55]/20'
                          : isExpense
                          ? 'bg-slate-100 text-[#17211C] border border-[#E2E8E4]'
                          : 'bg-amber-50 text-[#D97706] border border-amber-200'
                      }`}
                    >
                      {tx.transaction_type === 'sale'
                        ? 'SALE'
                        : tx.transaction_type === 'expense'
                        ? 'EXP'
                        : tx.transaction_type === 'purchase'
                        ? 'PURCH'
                        : tx.transaction_type === 'money_received'
                        ? 'RECV'
                        : 'PAID'}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#17211C] truncate">{tx.item}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-[#66736C]">
                        <span>{tx.category || 'General'}</span>
                        {tx.customer_name && <span>• Customer: {tx.customer_name}</span>}
                        {tx.supplier_name && <span>• Supplier: {tx.supplier_name}</span>}
                        <span>• {tx.transaction_date}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 text-[#66736C]">
                          {tx.source || 'telegram'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <div
                        className={`text-sm font-extrabold font-mono ${
                          isSale ? 'text-[#168A55]' : 'text-[#17211C]'
                        }`}
                      >
                        {isSale ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          tx.payment_status === 'paid'
                            ? 'bg-[#EAF7F0] text-[#168A55]'
                            : 'bg-amber-50 text-[#D97706]'
                        }`}
                      >
                        {tx.payment_status || 'paid'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Transaction Entry Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8E4] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-[#66736C] hover:text-[#17211C] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-extrabold text-[#17211C]">Add Transaction</h3>
              <p className="text-xs text-[#66736C]">Record a business transaction directly into your Khata ledger</p>
            </div>

            <form onSubmit={handleManualAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17211C] mb-1">Type</label>
                  <select
                    value={formData.transaction_type}
                    onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl text-xs font-semibold text-[#17211C] focus:outline-none focus:border-[#168A55]"
                  >
                    <option value="sale">Sale (Money In)</option>
                    <option value="expense">Expense (Money Out)</option>
                    <option value="purchase">Purchase</option>
                    <option value="money_received">Money Received</option>
                    <option value="money_paid">Money Paid</option>
                    <option value="receivable">Receivable (Collect)</option>
                    <option value="payable">Payable (Pay)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#17211C] mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl text-xs font-mono font-bold text-[#17211C] focus:outline-none focus:border-[#168A55]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211C] mb-1">Item / Description</label>
                <input
                  type="text"
                  required
                  value={formData.item}
                  onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                  placeholder="e.g. Vadapav, Potatoes, Electricity Bill"
                  className="w-full px-3 py-2 bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl text-xs text-[#17211C] focus:outline-none focus:border-[#168A55]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17211C] mb-1">Party (Customer / Supplier)</label>
                  <input
                    type="text"
                    value={formData.customer_name || formData.supplier_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value, supplier_name: e.target.value })}
                    placeholder="e.g. Rahul, Sharma Traders"
                    className="w-full px-3 py-2 bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl text-xs text-[#17211C] focus:outline-none focus:border-[#168A55]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#17211C] mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Food, Supplies"
                    className="w-full px-3 py-2 bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl text-xs text-[#17211C] focus:outline-none focus:border-[#168A55]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-[#66736C] font-semibold rounded-xl text-xs hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-[#168A55] hover:bg-[#0D5C3A] text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                >
                  {isSubmitting ? 'Saving...' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
