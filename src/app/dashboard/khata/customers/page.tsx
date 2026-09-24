'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/components/providers/TenantContext';
import {
  Users,
  AlertCircle,
  RefreshCw,
  Plus,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  balance_due: number;
  total_udhaar_given: number;
  total_paid_back: number;
  oldest_unpaid_since: string | null;
}

interface LedgerEntry {
  id: string;
  type: 'udhaar' | 'payment';
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
}

function fmt(n: number) {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function daysSince(dateStr: string | null) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

export default function CustomersPage() {
  const { currentBusiness } = useTenant();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<Record<string, LedgerEntry[]>>({});
  const [ledgerLoading, setLedgerLoading] = useState<string | null>(null);

  // Udhaar modal state
  const [showUdhaarModal, setShowUdhaarModal] = useState(false);
  const [udhaarName, setUdhaarName] = useState('');
  const [udhaarAmount, setUdhaarAmount] = useState('');
  const [udhaarDesc, setUdhaarDesc] = useState('');
  const [udhaarWarning, setUdhaarWarning] = useState<string | null>(null);
  const [udhaarSaving, setUdhaarSaving] = useState(false);

  // Payment modal state
  const [payCustomer, setPayCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDesc, setPayDesc] = useState('');
  const [paySaving, setPaySaving] = useState(false);
  const [payMsg, setPayMsg] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    if (!currentBusiness?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/list?business_id=${currentBusiness.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setCustomers(json.customers);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const loadLedger = async (customerId: string) => {
    if (ledger[customerId]) return;
    setLedgerLoading(customerId);
    try {
      const res = await fetch(
        `/api/customers/ledger?customer_id=${customerId}&business_id=${currentBusiness?.id}`
      );
      const json = await res.json();
      if (res.ok) setLedger((prev) => ({ ...prev, [customerId]: json.ledger }));
    } finally {
      setLedgerLoading(null);
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadLedger(id);
    }
  };

  const handleAddUdhaar = async () => {
    if (!udhaarName || !udhaarAmount || !currentBusiness?.id) return;
    setUdhaarSaving(true);
    setUdhaarWarning(null);
    try {
      const res = await fetch('/api/customers/udhaar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: currentBusiness.id,
          customer_name: udhaarName,
          amount: Number(udhaarAmount),
          description: udhaarDesc || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      if (json.warning) setUdhaarWarning(json.warning);
      // Reset ledger cache for this customer
      setLedger((prev) => {
        const next = { ...prev };
        delete next[json.customer.id];
        return next;
      });
      await loadCustomers();
      if (!json.warning) {
        setShowUdhaarModal(false);
        setUdhaarName('');
        setUdhaarAmount('');
        setUdhaarDesc('');
      }
    } catch (e: any) {
      setUdhaarWarning(e.message);
    } finally {
      setUdhaarSaving(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!payCustomer || !payAmount || !currentBusiness?.id) return;
    setPaySaving(true);
    setPayMsg(null);
    try {
      const res = await fetch('/api/customers/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: currentBusiness.id,
          customer_id: payCustomer.id,
          amount: Number(payAmount),
          description: payDesc || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setPayMsg(json.message);
      setLedger((prev) => {
        const next = { ...prev };
        delete next[payCustomer.id];
        return next;
      });
      await loadCustomers();
      setTimeout(() => {
        setPayCustomer(null);
        setPayAmount('');
        setPayDesc('');
        setPayMsg(null);
      }, 2000);
    } catch (e: any) {
      setPayMsg('Error: ' + e.message);
    } finally {
      setPaySaving(false);
    }
  };

  const totalOutstanding = customers.reduce((s, c) => s + c.balance_due, 0);
  const overdueCount = customers.filter(
    (c) => c.balance_due > 0 && (daysSince(c.oldest_unpaid_since) ?? 0) >= 30
  ).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-600" />
            Udhaar (Credit) Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track who owes you money and record payments</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadCustomers}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setShowUdhaarModal(true); setUdhaarWarning(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700"
          >
            <Plus className="w-4 h-4" />
            Add Udhaar
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="text-xs text-gray-500 uppercase mb-1">Total Outstanding</div>
          <div className="text-2xl font-bold text-orange-600">{fmt(totalOutstanding)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="text-xs text-gray-500 uppercase mb-1">Customers</div>
          <div className="text-2xl font-bold text-gray-900">{customers.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 col-span-2 sm:col-span-1">
          <div className="text-xs text-gray-500 uppercase mb-1">Overdue (30+ days)</div>
          <div className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {overdueCount}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Customer List */}
      {customers.length === 0 && !loading ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No customers yet</p>
          <p className="text-sm mt-1">Click &quot;Add Udhaar&quot; to record your first credit sale.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((c) => {
            const days = daysSince(c.oldest_unpaid_since);
            const overdue = c.balance_due > 0 && (days ?? 0) >= 30;
            const isExpanded = expandedId === c.id;

            return (
              <div
                key={c.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                  overdue ? 'border-red-300' : 'border-gray-200'
                }`}
              >
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(c.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{c.name}</div>
                      <div className="text-xs text-gray-500">
                        {c.balance_due > 0
                          ? `Since ${c.oldest_unpaid_since || '—'} ${overdue ? '🚨 Overdue' : ''}`
                          : '✅ Fully cleared'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className={`font-bold text-lg ${c.balance_due > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {c.balance_due > 0 ? fmt(c.balance_due) : '₹0'}
                      </div>
                      <div className="text-xs text-gray-400">outstanding</div>
                    </div>
                    {c.balance_due > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPayCustomer(c);
                          setPayAmount('');
                          setPayDesc('');
                          setPayMsg(null);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <CreditCard className="w-3 h-3" />
                        Pay
                      </button>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Ledger */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                    <div className="flex gap-6 text-xs text-gray-500 mb-3">
                      <span>Total given: <b className="text-gray-700">{fmt(c.total_udhaar_given)}</b></span>
                      <span>Total paid: <b className="text-green-700">{fmt(c.total_paid_back)}</b></span>
                    </div>
                    {ledgerLoading === c.id ? (
                      <div className="text-sm text-gray-400 py-2">Loading history…</div>
                    ) : ledger[c.id]?.length ? (
                      <div className="space-y-2">
                        {ledger[c.id].map((e) => (
                          <div key={e.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {e.type === 'udhaar' ? (
                                <Clock className="w-3.5 h-3.5 text-orange-400" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                              )}
                              <span className="text-gray-600">
                                {e.type === 'udhaar' ? 'Credit given' : 'Payment received'}
                                {e.description ? ` — ${e.description}` : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={e.type === 'udhaar' ? 'text-orange-600 font-medium' : 'text-green-600 font-medium'}>
                                {e.type === 'udhaar' ? '+' : '-'}{fmt(e.amount)}
                              </span>
                              <span className="text-gray-400 text-xs">{e.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No ledger entries yet.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Udhaar Modal */}
      {showUdhaarModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Add Udhaar (Credit)</h2>
            {udhaarWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                {udhaarWarning}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name *</label>
                <input
                  value={udhaarName}
                  onChange={(e) => setUdhaarName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  value={udhaarAmount}
                  onChange={(e) => setUdhaarAmount(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
                <input
                  value={udhaarDesc}
                  onChange={(e) => setUdhaarDesc(e.target.value)}
                  placeholder="e.g. Groceries on credit"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowUdhaarModal(false); setUdhaarWarning(null); }}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUdhaar}
                disabled={udhaarSaving || !udhaarName || !udhaarAmount}
                className="flex-1 bg-orange-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
              >
                {udhaarSaving ? 'Saving…' : udhaarWarning ? 'Confirm & Add Anyway' : 'Add Udhaar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {payCustomer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
            <div className="bg-orange-50 rounded-lg p-3 text-sm">
              <span className="font-medium">{payCustomer.name}</span> owes{' '}
              <span className="font-bold text-orange-600">{fmt(payCustomer.balance_due)}</span>
            </div>
            {payMsg && (
              <div className={`rounded-lg p-3 text-sm ${payMsg.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {payMsg}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount Received (₹) *</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0"
                  max={payCustomer.balance_due}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
                <input
                  value={payDesc}
                  onChange={(e) => setPayDesc(e.target.value)}
                  placeholder="e.g. Cash payment"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setPayCustomer(null)}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={paySaving || !payAmount}
                className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {paySaving ? 'Saving…' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
