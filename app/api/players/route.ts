import { createPlayer, updatePlayer, type PlayerInput } from "@/lib/data/players-repo";
import { ADMIN_ONLY, requireRole } from "@/lib/auth/permissions";

export async function POST(request: Request) {
  try {
    await requireRole(ADMIN_ONLY);
    const body = (await request.json()) as PlayerInput;
    await createPlayer(body);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "登録に失敗しました" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole(ADMIN_ONLY);
    const body = (await request.json()) as { playerId: string } & Partial<PlayerInput> & { active?: boolean };
    const { playerId, ...patch } = body;
    await updatePlayer(playerId, patch);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "更新に失敗しました" }, { status: 400 });
  }
}
