"use client";
import { useEffect, useState, useCallback } from "react";
import { useAutosave } from "@/lib/hooks/use-autosave";

export function NoteEditor({ taskId }: { taskId: string }) {
  const [body, setBody] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancel = false;
    fetch(`/api/notes/${encodeURIComponent(taskId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancel) return;
        setBody(j.body ?? "");
        setLoaded(true);
      });
    return () => { cancel = true; };
  }, [taskId]);

  const save = useCallback(async (v: string) => {
    if (!loaded) return;
    await fetch(`/api/notes/${encodeURIComponent(taskId)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: v }),
    });
  }, [taskId, loaded]);

  const { saving, savedAt } = useAutosave(body, save);

  return (
    <div>
      <textarea
        id="note-editor"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Escribe tus apuntes en Markdown…"
        rows={6}
        className="w-full rounded-md border border-border-subtle bg-bg p-2 font-mono text-xs text-text placeholder:text-text-dim focus:border-accent/50 focus:outline-none"
      />
      <div className="mt-1 h-4 text-[10px] text-text-dim">
        {saving ? "Guardando…" : savedAt ? `Guardado ${savedAt.toLocaleTimeString()}` : ""}
      </div>
    </div>
  );
}
