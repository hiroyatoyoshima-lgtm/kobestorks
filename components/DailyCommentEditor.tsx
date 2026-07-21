"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DailyCommentEditor({
  date,
  initialComment,
  editable,
}: {
  date: string;
  initialComment: string;
  editable: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialComment);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!editable) {
    return <p style={{ fontSize: 13.5, lineHeight: 1.8, color: "var(--text)" }}>{initialComment}</p>;
  }

  if (!editing) {
    return (
      <div>
        {initialComment ? (
          <p style={{ fontSize: 13.5, lineHeight: 1.8, color: "var(--text)", whiteSpace: "pre-wrap" }}>
            {initialComment}
          </p>
        ) : (
          <p className="note" style={{ marginTop: 0 }}>
            まだこの日のコメントはありません。
          </p>
        )}
        <button
          type="button"
          className="back"
          style={{ marginTop: 10, marginBottom: 0 }}
          onClick={() => {
            setValue(initialComment);
            setEditing(true);
          }}
        >
          {initialComment ? "編集" : "コメントを書く"}
        </button>
      </div>
    );
  }

  async function save() {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/daily-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, comment: value }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "保存に失敗しました");
      setEditing(false);
      router.refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="例:設定しているACWRにBIGのメンバーはヒットしていて…"
      />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="submit" style={{ marginTop: 0 }} disabled={loading} onClick={save}>
          {loading ? "保存中..." : "保存する"}
        </button>
        <button className="back" style={{ marginBottom: 0 }} onClick={() => setEditing(false)}>
          キャンセル
        </button>
      </div>
      {errorMsg && (
        <p className="note" style={{ color: "var(--red)" }}>
          ⚠️ {errorMsg}
        </p>
      )}
    </div>
  );
}
