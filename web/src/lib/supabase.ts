import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.')
}

// One shared client. It sends the anon key as the `apikey` header, and once someone signs in
// it automatically sends their JWT as `Authorization: Bearer ...`, stores the session, and
// refreshes the access token before it expires.
export const supabase = createClient(url, anonKey)
