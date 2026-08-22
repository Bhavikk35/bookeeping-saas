'use client';

import React from 'react';
import { TenantProvider } from '@/components/providers/TenantContext';
import { AppLayout } from '@/components/layout/AppLayout';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      <AppLayout>{children}</AppLayout>
    </TenantProvider>
  );
}
