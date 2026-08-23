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
    let localTxs: Transaction[] = [];

    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        localTxs = JSON.parse(cached);
        setTransactions(localTxs);
      } catch (e) {}
    }

    try {
      const res = await fetch(`/api/transactions/list?businessId=${currentBusiness.id}`);
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

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item || !formData.amount) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/transactions/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: currentBusiness?.id || 'biz_tenant_bhavik',
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
        const cacheKey = `autoledger_txs_${currentBusiness?.id || 'biz_tenant_bhavik'}`;
        const updatedList = [newTx, ...transactions];
        setTransactions(updatedList);
        localStorage.setItem(cacheKey, JSON.stringify(updatedList));

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
      }
    } catch (err) {
      console.error('Error adding transaction manually:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Logic
  const filteredTransactions = transactions.filter((tx) => {
    const matchesType = selectedType === 'all' || tx.transaction_type === selectedType;
    const matchesCategory =
      selectedCategory === 'all' || tx.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      tx.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.description && tx.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesType && matchesCategory && matchesSearch;
  });

  const categories = Array.from(new Set(transactions.map((t) => t.category)));

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Transaction History</h2>
          <p className="text-slate-400 text-xs mt-1">
            Isolated financial ledger for <span className="text-emerald-400 font-medium">{currentBusiness?.business_name}</span>
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20"
        >
          <PlusCircle className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items or categories..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Types</option>
            <option value="sale">Sales</option>
            <option value="expense">Expenses</option>
            <option value="purchase">Purchases</option>
            <option value="receivable">Receivables</option>
            <option value="payable">Payables</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden backdrop-blur-md">
        {loading && transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading transactions...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-16 text-center">
            <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">No transactions match your search</p>
            <p className="text-slate-500 text-xs mt-1">Try resetting filters or adding a new transaction.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Item</th>
                  <th className="py-3.5 px-4">Qty</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Party</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                      {tx.transaction_date}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                          tx.transaction_type === 'sale'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-semibold text-white">{tx.item}</td>
                    <td className="py-4 px-4 font-mono text-xs text-slate-400">{tx.quantity || 1}</td>
                    <td className="py-4 px-4 text-xs text-slate-300">{tx.category}</td>
                    <td className="py-4 px-4 text-xs text-slate-400">
                      {tx.customer_name || tx.supplier_name || '-'}
                    </td>
                    <td
                      className={`py-4 px-4 text-right font-bold font-mono whitespace-nowrap ${
                        tx.transaction_type === 'sale' ? 'text-emerald-400' : 'text-white'
                      }`}
                    >
                      ₹{Number(tx.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-emerald-500/10 text-emerald-400">
                        {tx.payment_status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
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

      {/* Add Transaction Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white">Add Manual Transaction</h3>
              <p className="text-xs text-slate-400 mt-0.5">Record a transaction directly into your business ledger</p>
            </div>

            <form onSubmit={handleManualAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Type</label>
                  <select
                    value={formData.transaction_type}
                    onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="sale">Sale</option>
                    <option value="expense">Expense</option>
                    <option value="purchase">Purchase</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={formData.item}
                  onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                  placeholder="e.g. Aloo Bhajiya"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Food"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-lg text-sm hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg text-sm transition-colors"
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
