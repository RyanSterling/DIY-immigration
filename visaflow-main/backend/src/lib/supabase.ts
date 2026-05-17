import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;
const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;

// Admin client with service role key - use for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Anonymous client - use for auth operations with user tokens
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
