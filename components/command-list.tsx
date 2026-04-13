import { CopyCmd } from "./mdx/copy-cmd";

export function CommandList({ commands }: { commands: string[] }) {
  if (commands.length === 0) return null;
  return (
    <div className="space-y-1">
      {commands.map((c, i) => (
        <CopyCmd key={`${i}-${c}`} cmd={c} />
      ))}
    </div>
  );
}
