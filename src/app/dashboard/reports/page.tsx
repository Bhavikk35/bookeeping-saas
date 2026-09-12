'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '@/components/providers/TenantContext';
import { Transaction } from '@/lib/types';
import { exportToExcel, exportToPDF } from '@/lib/export/report-exporter';
import {
  FileSpreadsheet,
  FileText,
  Download,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Receipt,
  Calendar,
} from 'lucide-react';

export default function ReportsPage() {
  const { currentBusiness } = useTenant();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReportsData = async () => {
    if (!currentBusiness?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/list?businessId=${currentBusiness.id}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
        setMetrics(data.metrics);
      }
    } catch (e) {
      console.error('Failed to load reports data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [currentBusiness?.id]);

  const handleDownloadExcel = () => {
    const bizName = currentBusiness?.business_name || 'My Business Workspace';
    exportToExcel(transactions, bizName);
  };

  const handleDownloadPDF = () => {
    const bizName = currentBusiness?.business_name || 'My Business Workspace';
    exportToPDF(transactions, metrics || {}, bizName, currentBusiness?.currency || 'INR');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-[#17211C] tracking-tight">Data & Reports</h2>
        <p className="text-xs text-[#66736C] mt-0.5">
          Export and download isolated financial records for {currentBusiness?.business_name || 'your business'}
        </p>
      </div>

      {/* Security Statement Banner */}
      <div className="bg-[#EAF7F0] border border-[#168A55]/20 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#168A55] text-white flex items-center justify-center shrink-0 shadow-xs">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-[#17211C]">Secure Business Ledger Maintenance</h3>
          <p className="text-xs text-[#66736C] mt-0.5 leading-relaxed">
            Your business records are maintained securely by Khata on our isolated database infrastructure. Your financial data strictly belongs to your business workspace and can be downloaded anytime in Excel or PDF formats.
          </p>
        </div>
      </div>

      {/* 1-Click Export Downloads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Excel Export Card */}
        <div className="bg-white border border-[#E2E8E4] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF7F0] text-[#168A55] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#17211C]">Excel Ledger Sheet (.xlsx)</h3>
              <p className="text-xs text-[#66736C] mt-1 leading-relaxed">
                Download a complete spreadsheet of all transaction entries including Date, Type, Item, Quantity, Amount, Party, Category, and Payment Status.
              </p>
            </div>
            <div className="p-3 bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl text-xs space-y-1">
              <p className="font-bold text-[#17211C]">Export Summary:</p>
              <p className="text-[#66736C]">• Total Records: {transactions.length} transactions</p>
              <p className="text-[#66736C]">• Format: Microsoft Excel (.xlsx)</p>
            </div>
          </div>

          <button
            onClick={handleDownloadExcel}
            disabled={transactions.length === 0}
            className="w-full py-3 bg-[#168A55] hover:bg-[#0D5C3A] text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Download Excel Ledger (.xlsx)
          </button>
        </div>

        {/* PDF Report Card */}
        <div className="bg-white border border-[#E2E8E4] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#17211C]">PDF Business Report (.pdf)</h3>
              <p className="text-xs text-[#66736C] mt-1 leading-relaxed">
                Generate a formatted business report featuring executive summary KPI cards (Revenue, Expenses, Net Cash Flow) and transaction detail table.
              </p>
            </div>
            <div className="p-3 bg-[#F7F9F8] border border-[#E2E8E4] rounded-xl text-xs space-y-1">
              <p className="font-bold text-[#17211C]">Report Summary:</p>
              <p className="text-[#66736C]">• Executive Financial KPI Summary included</p>
              <p className="text-[#66736C]">• Format: Printable PDF (.pdf)</p>
            </div>
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={transactions.length === 0}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Download PDF Report (.pdf)
          </button>
        </div>
      </div>
    </div>
  );
}
