export function VaultOutput({ children }: { children: React.ReactNode }) {
  return (
    <pre className="my-3 overflow-x-auto rounded-md border border-border-subtle bg-[#010409] px-4 py-3 font-mono text-xs text-text-muted">
      {children}
    </pre>
  );
}
