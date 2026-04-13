export function Analogy({ children }: { children: React.ReactNode }) {
  return (
    <aside className="my-4 rounded-r-md border-l-[3px] border-accent bg-accent/5 px-4 py-3 text-sm text-text">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-accent">
        Analogía
      </div>
      {children}
    </aside>
  );
}
