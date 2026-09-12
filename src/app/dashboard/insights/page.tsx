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
  LineChart,
  Line,
} from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieIcon, Award, Sparkles, ChevronRight, AlertCircle } from 'lucide-react';

export default function InsightsPage() {
  const { currentBusiness } = useTenant();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const symbol = '₹';

  const trendData = [
    { name: 'Revenue', amount: metrics?.totalSales || 18450, fill: '#168A55' },
    { name: 'Expenses', amount: metrics?.totalExpenses || 7200, fill: '#475569' },
    { name: 'Net Flow', amount: Math.max(0, metrics?.netCashFlow || 11250), fill: '#0D5C3A' },
  ];

  const COLORS = ['#168A55', '#0D5C3A', '#D97706', '#0284C7', '#7C3AED'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-[#17211C] tracking-tight">Business Insights</h2>
        <p className="text-xs text-[#66736C] mt-0.5">
          Simple financial trends & analytics for {currentBusiness?.business_name || "Bhavik's Workspace"}
        </p>
      </div>

      {/* Basic Insights Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses Comparison */}
        <div className="bg-white border border-[#E2E8E4] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8E4]">
            <div className="p-2 rounded-xl bg-[#EAF7F0] text-[#168A55]">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#17211C]">Revenue vs Expenses</h3>
              <p className="text-[11px] text-[#66736C]">Total money collected vs total expenses</p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-[#66736C]">Loading insights...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <XAxis dataKey="name" stroke="#66736C" fontSize={11} />
                  <YAxis stroke="#66736C" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8E4', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    formatter={(value: any) => [`${symbol}${value.toLocaleString('en-IN')}`, 'Amount']}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white border border-[#E2E8E4] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8E4]">
            <div className="p-2 rounded-xl bg-slate-100 text-[#17211C]">
              <PieIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#17211C]">Expense Categories</h3>
              <p className="text-[11px] text-[#66736C]">Spending distribution</p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {loading || !metrics?.categoryBreakdown || metrics.categoryBreakdown.length === 0 ? (
              <div className="text-xs text-[#66736C]">No category expenses recorded yet.</div>
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
                    label={(entry: any) => `${entry.category || entry.name}`}
                  >
                    {metrics.categoryBreakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8E4', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(value: any) => [`${symbol}${value.toLocaleString('en-IN')}`, 'Spent']}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Optional Advanced Insights CTA Section */}
      <div className="bg-white border border-[#E2E8E4] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF7F0] border border-[#168A55]/20 text-[#168A55] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#17211C]">ADVANCED INSIGHTS</h3>
              <p className="text-xs text-[#66736C]">Deep product margins, top customers, and growth projections</p>
            </div>
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-4 py-2.5 bg-[#EAF7F0] hover:bg-[#168A55] text-[#168A55] hover:text-white font-bold text-xs rounded-xl transition-all border border-[#168A55]/20 inline-flex items-center gap-1.5 shrink-0"
          >
            {showAdvanced ? 'Hide Advanced Insights' : 'Explore Advanced Insights →'}
          </button>
        </div>

        {showAdvanced && (
          <div className="pt-4 border-t border-[#E2E8E4] grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-[#17211C]">Gross Margin & COGS</h4>
              <p className="text-xs text-[#66736C]">
                Configure product purchase cost to automatically calculate gross profit percentage across sales.
              </p>
            </div>
            <div className="p-4 bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-[#17211C]">Customer Retention</h4>
              <p className="text-xs text-[#66736C]">
                Track repeat customers and highest revenue contributors over monthly cycles.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
