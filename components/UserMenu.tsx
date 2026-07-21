import LogoutButton from "./LogoutButton";

const ROLE_LABEL: Record<string, string> = {
  admin: "S&Cコーチ",
  medical: "トレーナー",
  nutrition: "栄養士",
  coach: "ヘッドコーチ",
  player: "選手",
};

export default function UserMenu({ email, role }: { email: string; role: string | null }) {
  return (
    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{role ? ROLE_LABEL[role] ?? role : "未登録"}</div>
        <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{email}</div>
      </div>
      <LogoutButton />
    </div>
  );
}
