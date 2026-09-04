import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en frontend/.env"
  );
}

/** Solo se usa para login y para renovar el token; los datos vienen de nuestra API. */
export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});
