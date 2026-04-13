import { Toc } from "./toc";
import { LabLauncher } from "./lab-launcher";
import { CommandList } from "./command-list";
import { NoteEditor } from "./note-editor";

export function RightPanel({
  externalLinks,
  labCommands,
  taskId,
}: {
  externalLinks: { label: string; url: string }[];
  labCommands: string[];
  taskId: string;
}) {
  const labLink = externalLinks.find((l) => l.label.toLowerCase().includes("lab"));
  return (
    <div className="h-full space-y-6 overflow-y-auto border-l border-border-subtle bg-surface px-4 py-5 text-sm">
      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
          En esta página
        </h4>
        <Toc />
      </section>
      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
          Laboratorio
        </h4>
        <LabLauncher url={labLink?.url} />
        <div className="mt-3">
          <CommandList commands={labCommands} />
        </div>
      </section>
      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
          Enlaces externos
        </h4>
        <ul className="space-y-1 text-xs">
          {externalLinks.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noreferrer noopener" className="text-blue hover:underline">
                {l.label} ↗
              </a>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
          Mis notas
        </h4>
        <NoteEditor taskId={taskId} />
      </section>
    </div>
  );
}
