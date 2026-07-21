import { getCurrentUser, type CurrentUser, type Role } from "./session";

// §3 ユーザーと権限 の一覧表をそのままコードにしたもの。
// admin: 全画面閲覧・全データ入力・設定変更
// medical: 全画面閲覧・怪我/ケア入力
// nutrition: 栄養画面の閲覧・入力、ダッシュボード閲覧
// coach: ダッシュボード・選手・怪我人画面の閲覧のみ(入力不可)
// player: 自分のアンケート入力・自分の個人ページのみ閲覧

export const VIEW_DASHBOARD: Role[] = ["admin", "medical", "nutrition", "coach"];
export const VIEW_PLAYERS: Role[] = ["admin", "medical", "coach"];
export const VIEW_INJURIES: Role[] = ["admin", "medical", "coach"];
export const EDIT_INJURIES: Role[] = ["admin", "medical"];
export const VIEW_NUTRITION: Role[] = ["admin", "medical", "nutrition"];
export const EDIT_NUTRITION: Role[] = ["admin", "nutrition"];
export const EDIT_DAILY_COMMENT: Role[] = ["admin"];
export const ADMIN_ONLY: Role[] = ["admin"];

// isSuperAdmin(プラットフォーム管理者)は常に全権限を持つ。
export function hasRole(user: CurrentUser | null, allowed: Role[]): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return !!user.role && allowed.includes(user.role);
}

export function isPlayerRole(user: CurrentUser | null): boolean {
  return !!user && !user.isSuperAdmin && user.role === "player";
}

// APIルート用。権限が無ければ例外を投げる(呼び出し側でcatchしてエラーレスポンスにする)。
// UIの出し分けだけでなくAPI層でも遮断する(§3)。
export async function requireRole(allowed: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!hasRole(user, allowed)) {
    throw new Error("この操作を行う権限がありません。");
  }
  return user!;
}
