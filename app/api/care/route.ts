import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { careId, done } = (await request.json()) as { careId: string; done: boolean };
  const supabase = createAdminClient();
  const { error } = await supabase.from("care_log").update({ done }).eq("care_id", careId);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
