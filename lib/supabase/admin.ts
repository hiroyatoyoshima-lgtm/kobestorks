import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// service_role キーを使うサーバー専用の管理者クライアント。RLSを無視して全データにアクセスできる。
// Google認証(§3)を実装しユーザーのロールをRLSで判定できるようになるまでの暫定運用。
// ブラウザ向けコード("use client")から絶対にimportしないこと(SUPABASE_SERVICE_ROLE_KEYはNEXT_PUBLIC_ではないため
// クライアントバンドルには含まれないが、誤ってAPI応答などに値を漏らさないよう注意する)。
//
// プロセス内で使い回す(1リクエストの中で何度も呼んでも、クライアント生成・コネクション確立が
// 毎回発生しないようにする。サーバーレス環境での余計なレイテンシを避けるため)。
let cached: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  return cached;
}

// Supabase側が落ちている/DNSが引けない等で応答が無い場合、Supabase-jsに`global.fetch`の
// AbortSignalを渡しても効かないことを確認済みのため、呼び出し側で強制的に諦める。
// 例: const { data, error } = await withTimeout(supabase.from("teams").select());
export function withTimeout<T>(promise: PromiseLike<T>, ms = 2500): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Supabase request timed out after ${ms}ms`)), ms);
    Promise.resolve(promise).then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}
