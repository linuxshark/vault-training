import type { LabStep, NodeRef } from "./types";
import { parseCommand } from "./parse-command";

const BASH_FENCE = /```bash\n([\s\S]*?)```/g;

function stripHeredoc(block: string): string[] {
  const lines: string[] = [];
  const raw = block.split("\n");
  let i = 0;
  while (i < raw.length) {
    const line = raw[i].trim();
    if (!line) {
      i++;
      continue;
    }
    const heredoc = line.match(/<<\s*['"]?(\w+)['"]?\s*$/);
    if (heredoc) {
      lines.push(line);
      const marker = heredoc[1];
      i++;
      while (i < raw.length && raw[i].trim() !== marker) i++;
      i++;
    } else {
      lines.push(line);
      i++;
    }
  }
  return lines;
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function buildLabSteps(body: string): LabStep[] {
  const steps: LabStep[] = [];
  let match: RegExpExecArray | null;
  let index = 0;
  BASH_FENCE.lastIndex = 0;
  while ((match = BASH_FENCE.exec(body)) !== null) {
    const raw = match[1];
    const commands = stripHeredoc(raw);
    if (commands.length === 0) continue;
    const affects: NodeRef[] = unique(commands.flatMap((c) => parseCommand(c)));
    steps.push({
      index,
      commands,
      output: null,
      affects,
      caption: null,
    });
    index++;
  }
  return steps;
}
