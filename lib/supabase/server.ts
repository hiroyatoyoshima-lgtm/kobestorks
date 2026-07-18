import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Component / Route Handler から使う Supabase クライアント。
// Google OAuth 導入後、ここで取得したセッションを RLS のロール判定に使う(§3, §8)。
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component から呼ばれた場合は無視してよい(middleware でセッション更新する前提)
          }
        },
      },
    }
  );
}
