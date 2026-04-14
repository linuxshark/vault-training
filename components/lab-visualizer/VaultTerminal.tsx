"use client";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export function VaultTerminal({
  commands,
  output,
  charMs = 25,
}: {
  commands: string[];
  output?: string | null;
  charMs?: number;
}) {
  const reduced = useReducedMotion();
  const joined = commands.join("\n");
  const [typed, setTyped] = useState(reduced ? joined : "");

  useEffect(() => {
    if (reduced) {
      setTyped(joined);
      return;
    }
    setTyped("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(joined.slice(0, i));
      if (i >= joined.length) clearInterval(id);
    }, charMs);
    return () => clearInterval(id);
  }, [joined, charMs, reduced]);

  const lines = typed.split("\n");

  return (
    <div
      className="h-[360px] overflow-auto rounded-lg border border-border-subtle bg-[#010409] p-4 font-mono text-[13px] leading-6 text-text"
      aria-live="polite"
      aria-atomic="false"
    >
      {lines.map((line, i) => (
        <div key={i} className="flex">
          <span className="mr-2 select-none text-text-muted">$</span>
          <span className="whitespace-pre">{line}</span>
          {i === lines.length - 1 && typed.length < joined.length && (
            <span className="ml-0.5 inline-block w-2 animate-pulse bg-text" aria-hidden>
              &nbsp;
            </span>
          )}
        </div>
      ))}
      {output && (
        <pre className="mt-3 whitespace-pre-wrap text-text-muted">{output}</pre>
      )}
    </div>
  );
}
