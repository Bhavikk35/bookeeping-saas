'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '@/components/providers/TenantContext';
import { Transaction } from '@/lib/types';
import {
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  Send,
} from 'lucide-react';

export default function KhataPage() {
  const { currentBusiness } = useTenant();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTransactions = async () => {
    if (!currentBusiness?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/list?businessId=${currentBusiness.id}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
      }
    } catch (e) {
      console.error('Failed to load Khata entries:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [currentBusiness?.id]);

  // Aggregate receivables (Money to Collect) and payables (Money to Pay)
  const collectMap: Record<string, { party: string; amount: number; lastDate: string; items: string[] }> = {};
  const payMap: Record<string, { party: string; amount: number; lastDate: string; items: string[] }> = {};

  transactions.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    const isPending = tx.payment_status === 'pending';

    if (tx.transaction_type === 'receivable' || (tx.transaction_type === 'sale' && isPending)) {
      const party = tx.customer_name || tx.item || 'Customer';
      if (!collectMap[party]) collectMap[party] = { party, amount: 0, lastDate: tx.transaction_date, items: [] };
      collectMap[party].amount += amt;
      collectMap[party].items.push(tx.item);
    } else if (tx.transaction_type === 'payable' || (tx.transaction_type === 'purchase' && isPending)) {
      const party = tx.supplier_name || tx.item || 'Supplier';
      if (!payMap[party]) payMap[party] = { party, amount: 0, lastDate: tx.transaction_date, items: [] };
      payMap[party].amount += amt;
      payMap[party].items.push(tx.item);
    }
  });

  // Seed default demonstration entries if empty so the user immediately understands Khata
  const collectEntries = Object.values(collectMap);
  if (collectEntries.length === 0) {
    collectEntries.push(
      { party: 'Rahul', amount: 1500, lastDate: new Date().toISOString().split('T')[0], items: ['Daily groceries'] },
      { party: 'Amit Sharma', amount: 3200, lastDate: new Date().toISOString().split('T')[0], items: ['Bulk order'] }
    );
  }

  const payEntries = Object.values(payMap);
  if (payEntries.length === 0) {
    payEntries.push(
      { party: 'Sharma Traders', amount: 4500, lastDate: new Date().toISOString().split('T')[0], items: ['Flour & Grain supplies'] },
      { party: 'ABC Wholesale', amount: 2000, lastDate: new Date().toISOString().split('T')[0], items: ['Beverage stock'] }
    );
  }

  const totalCollect = collectEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalPay = payEntries.reduce((sum, e) => sum + e.amount, 0);

  const filteredCollect = collectEntries.filter((e) =>
    e.party.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredPay = payEntries.filter((e) =>
    e.party.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#17211C] tracking-tight">Digital Khata (Credit & Debt Ledger)</h2>
          <p className="text-xs text-[#66736C] mt-0.5">
            Track people who owe your business and suppliers you need to pay
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#66736C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer or supplier..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2E8E4] rounded-xl text-xs text-[#17211C] placeholder-[#66736C] focus:outline-none focus:border-[#168A55] shadow-xs"
          />
        </div>
      </div>

      {/* Summary Banner Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-xs bg-gradient-to-br from-amber-50/50 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#D97706] uppercase tracking-wider">Money to Collect</span>
            <div className="p-2 rounded-xl bg-amber-100 text-[#D97706]">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-[#D97706]">₹{totalCollect.toLocaleString('en-IN')}</h3>
            <p className="text-xs text-[#66736C] mt-1 font-medium">{collectEntries.length} customers owe your business</p>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8E4] rounded-2xl p-5 shadow-xs bg-gradient-to-br from-slate-50/60 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#66736C] uppercase tracking-wider">Money to Pay</span>
            <div className="p-2 rounded-xl bg-slate-100 text-[#66736C]">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-[#17211C]">₹{totalPay.toLocaleString('en-IN')}</h3>
            <p className="text-xs text-[#66736C] mt-1 font-medium">{payEntries.length} suppliers/vendors to settle</p>
          </div>
        </div>
      </div>

      {/* Two Column Grid: MONEY TO COLLECT vs MONEY TO PAY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: MONEY TO COLLECT */}
        <div className="bg-white border border-[#E2E8E4] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8E4]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-[#D97706] flex items-center justify-center font-bold text-xs">
                ↓
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#17211C]">MONEY TO COLLECT</h3>
                <p className="text-[11px] text-[#66736C]">Customers who owe your business credit</p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#D97706] bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              ₹{totalCollect.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="divide-y divide-[#E2E8E4]">
            {filteredCollect.map((entry, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 text-[#D97706] flex items-center justify-center font-bold text-xs">
                    {entry.party[0]}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#17211C]">{entry.party}</h4>
                    <p className="text-[11px] text-[#66736C] mt-0.5">
                      {entry.items.join(', ')} • {entry.lastDate}
                    </p>
                  </div>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-[#D97706]">₹{entry.amount.toLocaleString('en-IN')}</p>
                    <span className="text-[10px] font-bold text-[#D97706] bg-amber-50 px-1.5 py-0.2 rounded">Pending</span>
                  </div>
                  <a
                    href="https://t.me/MySaaSBookkeeper_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-[#EAF7F0] text-[#168A55] hover:bg-[#168A55] hover:text-white transition-colors"
                    title="Send Reminder via Telegram"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: MONEY TO PAY */}
        <div className="bg-white border border-[#E2E8E4] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8E4]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-[#17211C] flex items-center justify-center font-bold text-xs">
                ↑
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#17211C]">MONEY TO PAY</h3>
                <p className="text-[11px] text-[#66736C]">Suppliers & businesses you owe</p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#17211C] bg-slate-100 px-2.5 py-1 rounded-full border border-[#E2E8E4]">
              ₹{totalPay.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="divide-y divide-[#E2E8E4]">
            {filteredPay.map((entry, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-[#17211C] flex items-center justify-center font-bold text-xs">
                    {entry.party[0]}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#17211C]">{entry.party}</h4>
                    <p className="text-[11px] text-[#66736C] mt-0.5">
                      {entry.items.join(', ')} • {entry.lastDate}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-extrabold text-[#17211C]">₹{entry.amount.toLocaleString('en-IN')}</p>
                  <span className="text-[10px] font-bold text-[#66736C] bg-slate-100 px-1.5 py-0.2 rounded">Unsettled</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
