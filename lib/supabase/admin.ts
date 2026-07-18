import { createClient } from "@supabase/supabase-js";

// service_role キーを使うサーバー専用の管理者クライアント。RLSを無視して全データにアクセスできる。
// Google認証(§3)を実装しユーザーのロールをRLSで判定できるようになるまでの暫定運用。
// ブラウザ向けコード("use client")から絶対にimportしないこと(SUPABASE_SERVICE_ROLE_KEYはNEXT_PUBLIC_ではないため
// クライアントバンドルには含まれないが、誤ってAPI応答などに値を漏らさないよう注意する)。
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
