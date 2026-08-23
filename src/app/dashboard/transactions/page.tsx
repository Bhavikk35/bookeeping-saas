'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '@/components/providers/TenantContext';
import { Transaction, TransactionType } from '@/lib/types';
import {
  Receipt,
  Filter,
  PlusCircle,
  Send,
  FileSpreadsheet,
  X,
  Search,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

export default function TransactionsPage() {
  const { currentBusiness } = useTenant();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Transaction Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    transaction_type: 'sale' as TransactionType,
    item: '',
    amount: '',
    quantity: '1',
    category: 'Sales',
    customer_name: '',
    supplier_name: '',
    payment_status: 'paid',
    description: '',
  });

  const loadTransactions = async () => {
    if (!currentBusiness?.id) return;
    setLoading(true);

    const cacheKey = `autoledger_txs_${currentBusiness.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setTransactions(JSON.parse(cached));
      } catch (e) {}
    }

    try {
      const res = await fetch(`/api/transactions/list?businessId=${currentBusiness.id}`);
      const data = await res.json();
      if (data.success && data.transactions) {
        setTransactions(data.transactions);
        localStorage.setItem(cacheKey, JSON.stringify(data.transactions));
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [currentBusiness?.id]);

  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness?.id || !formData.item || !formData.amount) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/transactions/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          ...formData,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        setFormData({
          transaction_type: 'sale',
          item: '',
          amount: '',
          quantity: '1',
          category: 'Sales',
          customer_name: '',
          supplier_name: '',
          payment_status: 'paid',
          description: '',
        });
        loadTransactions();
      } else {
        alert(data.error || 'Failed to record transaction.');
      }
    } catch (err: any) {
      alert(err.message || 'Error recording transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Transactions
  const filtered = transactions.filter((tx) => {
    if (selectedType !== 'all' && tx.transaction_type !== selectedType) return false;
    if (selectedCategory !== 'all' && tx.category.toLowerCase() !== selectedCategory.toLowerCase()) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchItem = tx.item.toLowerCase().includes(q);
      const matchCat = tx.category.toLowerCase().includes(q);
      const matchDesc = tx.description?.toLowerCase().includes(q);
      if (!matchItem && !matchCat && !matchDesc) return false;
    }
    return true;
  });

  const symbol = currentBusiness?.currency === 'INR' ? '₹' : '$';

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-white tracking-tight">Transaction History</h3>
          <p className="text-xs text-slate-400">
            Isolated financial ledger for {currentBusiness?.business_name}
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <PlusCircle className="w-4 h-4" /> Add Transaction
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items or categories..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Types</option>
            <option value="sale">Sale</option>
            <option value="expense">Expense</option>
            <option value="purchase">Purchase</option>
            <option value="money_received">Money Received</option>
            <option value="money_paid">Money Paid</option>
            <option value="receivable">Receivable</option>
            <option value="payable">Payable</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Categories</option>
            <option value="Food">Food & Beverage</option>
            <option value="Supplies">Supplies & Inventory</option>
            <option value="Utilities">Utilities</option>
            <option value="General">General</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading ledger data...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            No transactions match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Item</th>
                  <th className="py-3 px-3">Qty</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Party</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-3 text-slate-300 whitespace-nowrap">{tx.transaction_date}</td>
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
                    <td className="py-3.5 px-3 text-slate-400">{tx.quantity}</td>
                    <td className="py-3.5 px-3 text-slate-400">{tx.category}</td>
                    <td className="py-3.5 px-3 text-slate-300">
                      {tx.customer_name || tx.supplier_name || '-'}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-white whitespace-nowrap">
                      {symbol}{tx.amount}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          tx.payment_status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {tx.payment_status}
                      </span>
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

      {/* Add Manual Transaction Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Record Manual Transaction</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Type</label>
                  <select
                    value={formData.transaction_type}
                    onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value as TransactionType })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="sale">Sale</option>
                    <option value="expense">Expense</option>
                    <option value="purchase">Purchase</option>
                    <option value="money_received">Money Received</option>
                    <option value="money_paid">Money Paid</option>
                    <option value="receivable">Receivable</option>
                    <option value="payable">Payable</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Amount ({symbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Item Name / Description</label>
                <input
                  type="text"
                  required
                  value={formData.item}
                  onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                  placeholder="e.g. Aloo Bhajiya"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Quantity</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Food, Supplies"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/20"
                >
                  {isSubmitting ? 'Saving...' : 'Save & Sync Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
