import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** 환경변수가 없으면 화면에 설정 안내를 띄운다 (빌드는 통과) */
export const supabaseConfigured = Boolean(url && key);

export const supabase = createClient(url || "http://localhost:54321", key || "missing-key", {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const PHOTO_BUCKET = "deal-photos";
