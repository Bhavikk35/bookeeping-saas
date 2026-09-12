'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function TransactionsRedirectPage() {
  useEffect(() => {
    redirect('/dashboard');
  }, []);

  return (
    <div className="p-8 text-center text-xs text-[#66736C]">
      Redirecting to Dashboard Overview...
    </div>
  );
}
