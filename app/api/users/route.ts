import { createUser, removeUser, updateUserRole } from "@/lib/data/users-repo";
import { getCurrentUser } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/session";

// ユーザー管理ができるのは「プラットフォーム管理者」または「そのチームのチーム管理者フラグを持つ人」。
// role(職能)とは独立した権限。
async function requireUserManager() {
  const user = await getCurrentUser();
  if (!user || (!user.isSuperAdmin && !user.isTeamManager)) {
    throw new Error("この操作にはチーム管理者権限が必要です。");
  }
}

export async function POST(request: Request) {
  try {
    await requireUserManager();
    const body = (await request.json()) as {
      email: string;
      role: Role;
      playerId: string | null;
      isTeamManager: boolean;
    };
    await createUser(body.email, body.role, body.playerId || null, body.isTeamManager);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "登録に失敗しました" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireUserManager();
    const body = (await request.json()) as {
      userId: string;
      role: Role;
      playerId: string | null;
      isTeamManager: boolean;
    };
    await updateUserRole(body.userId, body.role, body.playerId || null, body.isTeamManager);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "更新に失敗しました" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireUserManager();
    const { userId } = (await request.json()) as { userId: string };
    await removeUser(userId);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "削除に失敗しました" }, { status: 400 });
  }
}
