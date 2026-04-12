import { ExternalLink } from "lucide-react";

export function LabLauncher({ url }: { url?: string }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg transition-all duration-micro hover:brightness-95"
    >
      <ExternalLink className="size-3.5" /> Abrir codespace
    </a>
  );
}
