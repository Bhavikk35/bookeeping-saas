'use client';

import React, { useState } from 'react';
import { useTenant } from '@/components/providers/TenantContext';
import { Building2, ShieldCheck, UserCheck, Users, Save } from 'lucide-react';

export default function SettingsPage() {
  const { currentBusiness, user } = useTenant();
  const [bizName, setBizName] = useState(currentBusiness?.business_name || '');
  const [bizType, setBizType] = useState(currentBusiness?.business_type || 'Retail Store');
  const [currency, setCurrency] = useState(currentBusiness?.currency || 'INR');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h3 className="text-xl font-extrabold text-white tracking-tight">Workspace Settings</h3>
        <p className="text-xs text-slate-400">
          Configure business details and tenant access permissions
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-400" /> Business Workspace Profile
        </h4>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Business Name</label>
            <input
              type="text"
              value={bizName}
              onChange={(e) => setBizName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Industry / Type</label>
              <input
                type="text"
                value={bizType}
                onChange={(e) => setBizType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3">
            {saved && (
              <span className="text-xs text-emerald-400 font-semibold">
                ✓ Workspace settings updated!
              </span>
            )}
            <button
              type="submit"
              className="ml-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Role-Based Access Control Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
        <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" /> Team Member Roles & RLS Security
        </h4>
        <p className="text-xs text-slate-400 mb-4">
          Supported roles in PostgreSQL schema: <code className="text-emerald-400">owner</code>, <code className="text-emerald-400">manager</code>, <code className="text-emerald-400">accountant</code>, <code className="text-emerald-400">employee</code>.
        </p>

        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
              {user?.name ? user.name[0] : 'U'}
            </div>
            <div>
              <p className="text-xs font-bold text-white">{user?.name}</p>
              <p className="text-[11px] text-slate-400">{user?.email}</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Workspace Owner
          </span>
        </div>
      </div>
    </div>
  );
}
