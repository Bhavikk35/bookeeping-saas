'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-400 p-8 text-center flex items-center justify-center text-xs font-semibold">
      Redirecting to Business Dashboard...
    </div>
  );
}
