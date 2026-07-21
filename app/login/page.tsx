"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handleGoogleLogin() {
    setErrorMsg(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "ログインに失敗しました");
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setMagicLinkSent(true);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "送信に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "70vh", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ maxWidth: 380, width: "100%", textAlign: "center" }}>
        <div className="logo" style={{ margin: "0 auto 16px" }}>
          KS
        </div>
        <h1 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>STORKS Performance Hub</h1>
        <p className="note" style={{ marginBottom: 24 }}>
          チームアカウントでログインしてください
        </p>

        <button className="submit" type="button" onClick={handleGoogleLogin} disabled={loading}>
          {loading ? "処理中..." : "Googleでログイン"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span className="note" style={{ margin: 0 }}>
            または
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        {magicLinkSent ? (
          <p className="note" style={{ color: "var(--green)" }}>
            ✅ {email} にログイン用のリンクを送信しました。メールを確認してください。
          </p>
        ) : (
          <form onSubmit={handleMagicLink} style={{ textAlign: "left" }}>
            <label>メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <button className="submit" type="submit" disabled={loading} style={{ marginTop: 12 }}>
              {loading ? "送信中..." : "メールでログイン(パスワード不要)"}
            </button>
          </form>
        )}

        {errorMsg && (
          <p className="note" style={{ color: "var(--red)", marginTop: 12 }}>
            ⚠️ {errorMsg}
          </p>
        )}
        <p className="note" style={{ marginTop: 20 }}>
          未登録のアカウントはログインできません。心当たりがない場合は管理者に連絡してください。
        </p>
      </div>
    </div>
  );
}
