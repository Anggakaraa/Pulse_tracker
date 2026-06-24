import { createBrowserClient } from "@supabase/ssr";

// Browser-side client — reads session from browser storage.
// Use in client components that write to Supabase.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
