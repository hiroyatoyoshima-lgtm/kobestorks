// Vercel(Node.jsランタイム)からの外部fetch(Supabase等)が数秒単位で遅くなる既知の問題への対処。
// Node.jsのDNS解決がIPv6を先に試して失敗/タイムアウトしてからIPv4にフォールバックすることがあるため、
// サーバー起動時にIPv4を優先させる。
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const dns = await import("node:dns");
    dns.setDefaultResultOrder("ipv4first");
  }
}
