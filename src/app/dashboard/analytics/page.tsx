'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '@/components/providers/TenantContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, PieChart as PieIcon, Award, AlertCircle } from 'lucide-react';

export default function AnalyticsPage() {
  const { currentBusiness } = useTenant();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBusiness?.id) return;
    setLoading(true);
    fetch(`/api/transactions/list?businessId=${currentBusiness.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setMetrics(data.metrics);
      })
      .finally(() => setLoading(false));
  }, [currentBusiness?.id]);

  const symbol = currentBusiness?.currency === 'INR' ? '₹' : '$';

  // Sample comparison bar data
  const trendData = [
    { name: 'Total Sales', amount: metrics?.totalSales || 0, fill: '#10b981' },
    { name: 'Total Expenses', amount: metrics?.totalExpenses || 0, fill: '#f43f5e' },
    { name: 'Net Cash Flow', amount: Math.max(0, metrics?.netCashFlow || 0), fill: '#6366f1' },
  ];

  const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-extrabold text-white tracking-tight">Financial Analytics & Insights</h3>
        <p className="text-xs text-slate-400">
          Visual breakdowns for {currentBusiness?.business_name}
        </p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sales vs Expenses Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Sales vs Expenses Comparison</h4>
              <p className="text-xs text-slate-400">Overall cash in vs cash out</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">Loading chart...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(value: any) => [`${symbol}${value}`, 'Amount']}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <PieIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Expense Category Breakdown</h4>
              <p className="text-xs text-slate-400">Distribution of operational spending</p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {loading || !metrics?.categoryBreakdown || metrics.categoryBreakdown.length === 0 ? (
              <div className="text-xs text-slate-500">No expense categories recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.categoryBreakdown}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry: any) => `${entry.category || entry.name} (${((entry.percent || 0) * 100).toFixed(0)}%)`}
                  >
                    {metrics.categoryBreakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(value: any) => [`${symbol}${value}`, 'Spent']}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Top Selling Items & Gross Margin Note */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top Selling Items Card */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Top-Selling Items</h4>
              <p className="text-xs text-slate-400">Ranked by revenue contribution</p>
            </div>
          </div>

          {!metrics?.topSellingItems || metrics.topSellingItems.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No item sales recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {metrics.topSellingItems.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white">{item.item}</p>
                      <p className="text-[11px] text-slate-400">{item.quantity} units sold</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-400">
                    {symbol}{item.revenue}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gross Margin Explanation Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">Gross Profit Accounting</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed space-y-2">
              <span>
                <b>Calculation Rule:</b> Revenue (e.g. ₹50) is recorded immediately upon sale. Gross profit requires exact Cost of Goods Sold (COGS).
              </span>
            </p>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-1.5 mt-4">
              <p className="font-semibold text-emerald-400">Example:</p>
              <p className="text-slate-300">• Selling price = ₹50</p>
              <p className="text-slate-300">• Estimated cost = ₹18</p>
              <p className="font-bold text-white border-t border-slate-800 pt-1">
                Gross Profit = ₹32 (64% Margin)
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic mt-4">
            * Metric shows "COGS required" when unit cost data is unconfigured.
          </p>
        </div>
      </div>
    </div>
  );
}
