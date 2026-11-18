import { createClient, SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://pxeerwxhudgegodrarqr.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_16OqMAVlP9hBAB6Cfb5mrA_wURp9iM-";

export function getSupabaseConfig(): { url: string; anonKey: string; source: "env" | "project" | "none" } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

  if (
    envUrl &&
    envKey &&
    !envUrl.includes("your-project-id") &&
    !envKey.includes("your-supabase-anon-key")
  ) {
    return { url: envUrl, anonKey: envKey, source: "env" };
  }

  if (DEFAULT_SUPABASE_URL && DEFAULT_SUPABASE_PUBLISHABLE_KEY) {
    return {
      url: DEFAULT_SUPABASE_URL,
      anonKey: DEFAULT_SUPABASE_PUBLISHABLE_KEY,
      source: "project",
    };
  }

  return { url: "", anonKey: "", source: "none" };
}

let cachedClient: SupabaseClient | null = null;
let cachedKeySignature = "";

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    return null;
  }

  const signature = `${url}|${anonKey}`;
  if (!cachedClient || cachedKeySignature !== signature) {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    cachedKeySignature = signature;
  }

  return cachedClient;
}
