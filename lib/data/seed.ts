import type { Player } from "../types";

export const STATUS_LABEL: Record<Player["status"], string> = {
  ok: "通常参加",
  warn: "要観察",
  part: "部分参加",
  out: "離脱中",
};
