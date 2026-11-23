import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { required } from '../env';
import type { AppDatabase } from '@bugsnap/shared';
export async function sessionClient() {
  const jar = await cookies();
  return createServerClient<AppDatabase>(
    required('NEXT_PUBLIC_SUPABASE_URL'),
    required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) => jar.set(name, value, options));
          } catch {
            /* Server component; proxy refreshes cookies. */
          }
        },
      },
    },
  );
}
export function adminClient() {
  return createClient<AppDatabase>(
    required('NEXT_PUBLIC_SUPABASE_URL'),
    required('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
