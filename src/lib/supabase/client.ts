import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error(
      '[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing at build time. ' +
      'Falling back to a fake demo project — sign in/sign up will not work. ' +
      'Set these in Netlify env vars and redeploy with cache cleared.'
    );
  } else {
    console.log('[supabase] configured with URL:', url);
  }

  return createBrowserClient(
    url || 'https://demo-project.supabase.co',
    anonKey || 'demo-anon-key'
  );
}
