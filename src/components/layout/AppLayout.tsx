'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTenant } from '../providers/TenantContext';
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  FileSpreadsheet,
  Settings,
  PlusCircle,
  Building2,
  Send,
  User,
  ChevronDown,
  Menu,
  X,
  LogOut,
  LogIn,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, businesses, currentBusiness, setCurrentBusiness, logout } = useTenant();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Khata', href: '/dashboard/khata', icon: BookOpen },
    { name: 'Insights', href: '/dashboard/insights', icon: TrendingUp },
    { name: 'Data & Reports', href: '/dashboard/reports', icon: FileSpreadsheet },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const isTelegramConnected = true; // Connected state representation

  return (
    <div className="min-h-screen bg-[#F7F9F8] text-[#17211C] font-sans flex flex-col md:flex-row antialiased">
      {/* Mobile Sticky Header Bar */}
      <div className="md:hidden bg-white border-b border-[#E2E8E4] px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#168A55] flex items-center justify-center text-white font-bold shadow-xs">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-base text-[#17211C] tracking-tight leading-none">Khata</h1>
            <span className="text-[10px] text-[#168A55] font-semibold">Small Business SaaS</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#168A55] bg-[#EAF7F0] px-2 py-1 rounded-full border border-[#168A55]/20">
            <CheckCircle2 className="w-3 h-3" /> Telegram Connected
          </span>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#66736C] hover:text-[#17211C] hover:bg-[#F7F9F8]"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Desktop Sidebar (Left Navigation) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-[#E2E8E4] flex-col justify-between shrink-0 min-h-screen">
        <div>
          {/* Logo Banner */}
          <div className="p-5 border-b border-[#E2E8E4] flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#168A55] flex items-center justify-center text-white font-bold shadow-sm">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-lg text-[#17211C] tracking-tight leading-none">Khata</h1>
                <span className="text-xs text-[#168A55] font-semibold">Bookkeeping for Business</span>
              </div>
            </Link>
          </div>

          {/* Business Workspace Switcher */}
          <div className="p-4 border-b border-[#E2E8E4] bg-[#F7F9F8]/60">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#66736C] block mb-1.5">
              Active Workspace
            </label>
            <div className="relative">
              <button
                onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
                className="w-full bg-white border border-[#E2E8E4] rounded-xl p-2.5 flex items-center justify-between hover:border-[#168A55]/40 transition-all text-left shadow-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#EAF7F0] border border-[#168A55]/20 text-[#168A55] flex items-center justify-center shrink-0 font-bold text-xs">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#17211C] truncate">
                      {currentBusiness?.business_name || 'My Business'}
                    </p>
                    <p className="text-[10px] text-[#66736C] truncate">
                      {currentBusiness?.business_type || 'Retail'} • ₹ INR
                    </p>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#66736C] shrink-0 ml-1" />
              </button>

              {tenantDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-[#E2E8E4] rounded-xl shadow-xl p-2 z-50 space-y-1">
                  <p className="text-[10px] font-bold uppercase text-[#66736C] px-2 py-1">Switch Business</p>
                  {businesses.map((biz) => (
                    <button
                      key={biz.id}
                      onClick={() => {
                        setCurrentBusiness(biz);
                        setTenantDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between ${
                        currentBusiness?.id === biz.id
                          ? 'bg-[#EAF7F0] text-[#168A55] font-bold'
                          : 'text-[#17211C] hover:bg-[#F7F9F8]'
                      }`}
                    >
                      <span className="truncate">{biz.business_name}</span>
                      {currentBusiness?.id === biz.id && (
                        <span className="w-2 h-2 rounded-full bg-[#168A55] shrink-0" />
                      )}
                    </button>
                  ))}
                  <div className="border-t border-[#E2E8E4] pt-1 mt-1">
                    <Link
                      href="/onboarding"
                      onClick={() => setTenantDropdownOpen(false)}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold text-[#168A55] hover:bg-[#EAF7F0] transition-colors flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      + Add New Business
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#EAF7F0] text-[#168A55] border border-[#168A55]/20 shadow-xs'
                      : 'text-[#66736C] hover:text-[#17211C] hover:bg-[#F7F9F8]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#168A55]' : 'text-[#66736C]'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Account Footer & Logout */}
        <div className="p-4 border-t border-[#E2E8E4] bg-[#F7F9F8]/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-[#168A55] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {user?.name ? user.name[0].toUpperCase() : 'B'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-[#17211C] truncate">{user?.name || 'Business Owner'}</p>
                <p className="text-[10px] text-[#66736C] truncate">{user?.email || 'owner@khata.in'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-[#66736C] hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto bg-[#F7F9F8] min-h-screen flex flex-col justify-between pb-16 md:pb-0">
        {/* Desktop Sticky Header Bar */}
        <header className="hidden md:flex sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E2E8E4] px-8 py-4 items-center justify-between shadow-xs">
          <div>
            <h2 className="text-lg font-extrabold text-[#17211C] tracking-tight">
              {currentBusiness?.business_name || 'Khata Business Workspace'}
            </h2>
            <p className="text-xs text-[#66736C] flex items-center gap-2 mt-0.5 font-medium">
              <span>{currentBusiness?.business_type || 'General Business'}</span>
              <span>•</span>
              <span>₹ INR Currency</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#168A55] bg-[#EAF7F0] px-2 py-0.5 rounded-full border border-[#168A55]/20">
                <CheckCircle2 className="w-3 h-3" /> Isolated Ledger
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Telegram Bot Connection Pill */}
            <div className="flex items-center gap-2 bg-[#EAF7F0] border border-[#168A55]/20 rounded-xl px-3 py-1.5 text-xs font-bold text-[#168A55]">
              <Send className="w-3.5 h-3.5" />
              <span>✓ Telegram Bot Connected</span>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-2 bg-white border border-[#E2E8E4] rounded-xl px-3.5 py-1.5 text-xs font-semibold text-[#17211C] shadow-xs">
              <User className="w-3.5 h-3.5 text-[#168A55]" />
              <span>{user?.email || 'bhavik@khata.in'}</span>
            </div>
          </div>
        </header>

        {/* Mobile Flyout Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end">
            <div className="bg-white rounded-t-3xl p-6 space-y-4 shadow-2xl border-t border-[#E2E8E4]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8E4]">
                <div>
                  <h3 className="font-extrabold text-base text-[#17211C]">{currentBusiness?.business_name}</h3>
                  <p className="text-xs text-[#66736C]">{user?.email}</p>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-[#66736C]">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-[#EAF7F0] text-[#168A55]'
                          : 'text-[#17211C] hover:bg-[#F7F9F8]'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-[#168A55]" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>

              <button
                onClick={logout}
                className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl text-sm flex items-center justify-center gap-2 mt-2"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Page Content Container */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1">{children}</div>

        {/* Mobile Fixed Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E2E8E4] px-2 py-1.5 flex items-center justify-around shadow-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-bold transition-all ${
                  isActive ? 'text-[#168A55]' : 'text-[#66736C] hover:text-[#17211C]'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-[#168A55]' : 'text-[#66736C]'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
