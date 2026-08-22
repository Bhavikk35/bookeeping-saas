'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTenant } from '../providers/TenantContext';
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  Link2,
  Settings,
  PlusCircle,
  Building2,
  Send,
  FileSpreadsheet,
  User,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
  LogOut,
} from 'lucide-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, businesses, currentBusiness, setCurrentBusiness, switchUserRole } = useTenant();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Transactions', href: '/dashboard/transactions', icon: Receipt },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Integrations', href: '/dashboard/integrations', icon: Link2 },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo & App Title */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
                <Send className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <h1 className="font-extrabold text-lg text-white tracking-tight leading-none">AutoLedger</h1>
                <span className="text-xs text-emerald-400 font-medium">Telegram SaaS</span>
              </div>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Active Tenant Workspace Switcher */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-900/50">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Active Business Workspace
            </label>
            <div className="relative">
              <button
                onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
                className="w-full bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between text-left transition-all shadow-sm"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400 font-semibold">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-semibold text-white truncate">
                      {currentBusiness ? currentBusiness.business_name : 'Select Business'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {currentBusiness ? `${currentBusiness.business_type} • ${currentBusiness.currency}` : 'Multi-Tenant'}
                    </p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* Dropdown Options */}
              {tenantDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Workspace
                  </p>
                  {businesses.map((biz) => (
                    <button
                      key={biz.id}
                      onClick={() => {
                        setCurrentBusiness(biz);
                        setTenantDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                        currentBusiness?.id === biz.id
                          ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{biz.business_name}</span>
                      {currentBusiness?.id === biz.id && (
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  ))}
                  <div className="pt-2 border-t border-slate-800">
                    <Link
                      href="/onboarding"
                      onClick={() => setTenantDropdownOpen(false)}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Create New Workspace
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Account Section */}
        <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-900/80">

          {/* User Profile Footer & Sign Out */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'Account Owner'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email || 'Active Workspace'}</p>
              </div>
            </div>
            <Link
              href="/login"
              onClick={() => {
                sessionStorage.clear();
              }}
              title="Sign Out / Switch Account"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto bg-slate-950 min-h-screen">
        {/* Header Bar */}
        <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {currentBusiness?.business_name || 'Dashboard'}
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{currentBusiness?.business_type}</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">{currentBusiness?.currency} Currency</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" /> Tenant Isolated
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/onboarding"
              className="hidden sm:flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md shadow-emerald-500/10"
            >
              <PlusCircle className="w-4 h-4" />
              New Workspace
            </Link>
          </div>
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
