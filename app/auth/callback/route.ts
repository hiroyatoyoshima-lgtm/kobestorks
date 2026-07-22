import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google OAuth・メールリンク(マジックリンク)共通のリダイレクト先。認可コードをセッションに交換してトップへ戻す。
// マジックリンクはPKCE検証用のcookieがリクエスト元ブラウザに保存されるため、
// リンクを別のブラウザ・別端末で開くと交換に失敗する(その場合は理由付きで/loginへ戻す)。
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=callback_failed`);
    }
  } else {
    return NextResponse.redirect(`${origin}/login?error=callback_failed`);
  }

  return NextResponse.redirect(`${origin}/`);
}
