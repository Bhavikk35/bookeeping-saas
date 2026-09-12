'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function IntegrationsRedirectPage() {
  useEffect(() => {
    redirect('/dashboard/reports');
  }, []);

  return (
    <div className="p-8 text-center text-xs text-[#66736C]">
      Redirecting to Data & Reports...
    </div>
  );
}
