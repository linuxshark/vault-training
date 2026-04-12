"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyCmd({ cmd, lang = "bash" }: { cmd: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="my-3 flex items-center gap-2 rounded-md border border-border-subtle bg-bg px-3 py-2 font-mono text-sm">
      <span className="text-accent">{lang === "bash" ? "$" : ">"}</span>
      <code className="flex-1 truncate text-text">{cmd}</code>
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? "Copiado" : "Copiar comando"}
        className={cn(
          "rounded p-1 text-text-muted transition-colors duration-micro hover:text-text focus-visible:text-text",
          copied && "text-green",
        )}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}
