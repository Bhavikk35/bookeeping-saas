'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function AnalyticsRedirectPage() {
  useEffect(() => {
    redirect('/dashboard/insights');
  }, []);

  return (
    <div className="p-8 text-center text-xs text-[#66736C]">
      Redirecting to Business Insights...
    </div>
  );
}
