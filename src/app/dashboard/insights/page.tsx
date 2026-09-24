'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/components/providers/TenantContext';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

type ProfitPeriod = 'today' | 'week' | 'month' | 'all';

interface ProductProfitRow {
  item: string;
  revenue: number;
  totalCost: number;
  profit: number;
  marginPct: number | null;
  unitsSold: number;
  hasCostData: boolean;
}

interface ProfitReport {
  period: ProfitPeriod;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  overallMarginPct: number | null;
  hasCostData: boolean;
  topByProfit: ProductProfitRow[];
  bottomByMargin: ProductProfitRow[];
  allProducts: ProductProfitRow[];
}

const PERIOD_LABELS: Record<ProfitPeriod, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  all: 'All Time',
};

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function MarginBadge({ pct, hasCostData }: { pct: number | null; hasCostData: boolean }) {
  if (!hasCostData) {
    return (
      <span className="text-xs text-gray-400 italic">cost data unavailable</span>
    );
  }
  const color =
    pct === null ? 'text-gray-400' : pct >= 20 ? 'text-green-600' : pct >= 0 ? 'text-yellow-600' : 'text-red-600';
  return <span className={`font-semibold ${color}`}>{pct !== null ? `${pct}%` : '—'}</span>;
}

export default function InsightsPage() {
  const { currentBusiness } = useTenant();
  const [period, setPeriod] = useState<ProfitPeriod>('month');
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentBusiness?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/profit?business_id=${currentBusiness.id}&period=${period}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setReport(json.report);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, period]);

  useEffect(() => {
    load();
  }, [load]);

  const cur = '₹';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-indigo-600" />
            Profit Margin Insights
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            See which products are actually making you money
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Period Filter */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(PERIOD_LABELS) as ProfitPeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              period === p
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && !report && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          Loading profit data…
        </div>
      )}

      {report && (
        <>
          {/* No cost data banner */}
          {!report.hasCostData && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">Cost data unavailable</p>
                <p className="text-sm text-amber-700 mt-1">
                  To see profit margins, first load stock with a purchase cost in the{' '}
                  <a href="/dashboard/inventory" className="underline">Inventory</a> tab. When you record a
                  sale after loading stock, the cost will be snapshotted automatically.
                </p>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Revenue"
              value={fmt(report.totalRevenue)}
              icon={<DollarSign className="w-5 h-5 text-blue-500" />}
              bg="bg-blue-50"
            />
            <KpiCard
              label="Total Cost"
              value={report.hasCostData ? fmt(report.totalCost) : '—'}
              icon={<TrendingDown className="w-5 h-5 text-red-500" />}
              bg="bg-red-50"
              sub={!report.hasCostData ? 'cost data unavailable' : undefined}
            />
            <KpiCard
              label="Gross Profit"
              value={report.hasCostData ? fmt(report.totalProfit) : '—'}
              icon={<TrendingUp className="w-5 h-5 text-green-500" />}
              bg="bg-green-50"
              sub={!report.hasCostData ? 'cost data unavailable' : undefined}
              highlight={report.hasCostData && report.totalProfit > 0}
            />
            <KpiCard
              label="Overall Margin"
              value={
                report.overallMarginPct !== null
                  ? `${report.overallMarginPct}%`
                  : '—'
              }
              icon={<BarChart2 className="w-5 h-5 text-indigo-500" />}
              bg="bg-indigo-50"
              sub={report.overallMarginPct === null ? 'cost data unavailable' : undefined}
              highlight={report.overallMarginPct !== null && report.overallMarginPct > 0}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 by Profit */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Top 5 Products by Profit
              </h2>
              {report.topByProfit.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No sales in this period</p>
              ) : (
                <div className="space-y-3">
                  {report.topByProfit.map((row, i) => (
                    <ProductRow key={row.item} rank={i + 1} row={row} />
                  ))}
                </div>
              )}
            </div>

            {/* Bottom 5 by Margin */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                Bottom 5 Products by Margin %
              </h2>
              {report.bottomByMargin.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  {report.hasCostData
                    ? 'No products with margin data'
                    : 'Load stock with cost to see margins'}
                </p>
              ) : (
                <div className="space-y-3">
                  {report.bottomByMargin.map((row, i) => (
                    <ProductRow key={row.item} rank={i + 1} row={row} showRed />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Full Table */}
          {report.allProducts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">All Products — {PERIOD_LABELS[period]}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">Product</th>
                      <th className="px-4 py-3 text-right">Units Sold</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-right">Cost</th>
                      <th className="px-4 py-3 text-right">Profit</th>
                      <th className="px-4 py-3 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.allProducts
                      .sort((a, b) => b.revenue - a.revenue)
                      .map((row) => (
                        <tr key={row.item} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{row.item}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{row.unitsSold}</td>
                          <td className="px-4 py-3 text-right text-gray-900">{fmt(row.revenue)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {row.hasCostData ? fmt(row.totalCost) : <span className="text-gray-300 italic text-xs">unavailable</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.hasCostData ? (
                              <span className={row.profit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                {fmt(row.profit)}
                              </span>
                            ) : (
                              <span className="text-gray-300 italic text-xs">unavailable</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <MarginBadge pct={row.marginPct} hasCostData={row.hasCostData} />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  bg,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  bg: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-gray-200 shadow-sm p-4 ${highlight ? 'ring-2 ring-green-300' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-2 rounded-lg ${bg}`}>{icon}</div>
        <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 italic mt-1">{sub}</div>}
    </div>
  );
}

function ProductRow({
  rank,
  row,
  showRed,
}: {
  rank: number;
  row: ProductProfitRow;
  showRed?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-gray-400 text-xs w-4 shrink-0">{rank}.</span>
        <span className="font-medium text-gray-800 truncate">{row.item}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0 text-sm">
        {row.hasCostData ? (
          <>
            <span className={showRed ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
              {fmt(row.profit)}
            </span>
            <MarginBadge pct={row.marginPct} hasCostData={row.hasCostData} />
          </>
        ) : (
          <span className="text-xs text-gray-400 italic">cost data unavailable</span>
        )}
      </div>
    </div>
  );
}
