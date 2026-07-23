import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient, withTimeout } from "@/lib/supabase/admin";
import { TEAM_OVERRIDE_COOKIE } from "@/lib/supabase/team";

// プラットフォーム管理者(isSuperAdmin)だけが使えるチーム切り替え(§8将来対応)。
// teamIdがnull/空ならCookieを削除し、自分の所属チームの表示に戻す。
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.isSuperAdmin) {
      throw new Error("この操作を行う権限がありません。");
    }

    const { teamId } = (await request.json()) as { teamId: string | null };
    const cookieStore = await cookies();

    if (!teamId) {
      cookieStore.delete(TEAM_OVERRIDE_COOKIE);
      return Response.json({ ok: true });
    }

    const supabase = createAdminClient();
    const { data, error } = await withTimeout(
      supabase.from("teams").select("team_id").eq("team_id", teamId).maybeSingle()
    );
    if (error || !data) throw new Error("指定されたチームが見つかりません。");

    cookieStore.set(TEAM_OVERRIDE_COOKIE, teamId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "切り替えに失敗しました" }, { status: 400 });
  }
}
