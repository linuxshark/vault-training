import type { LabStep, NodeRef } from "./types";
import { parseCommand } from "./parse-command";

const BASH_FENCE = /```bash\n([\s\S]*?)```/g;

/** Extract trailing " # comment" from a command line. */
function splitComment(line: string): { cmd: string; comment: string | null } {
  const match = line.match(/^(.*?)\s+#\s+(.+)$/);
  if (!match || !match[1] || !match[2]) return { cmd: line, comment: null };
  return { cmd: match[1].trim(), comment: match[2].trim() };
}

function processBlock(block: string): { commands: string[]; caption: string | null } {
  const commands: string[] = [];
  let caption: string | null = null;
  const raw = block.split("\n");
  let i = 0;
  while (i < raw.length) {
    const currentLine = raw[i];
    if (!currentLine) { i++; continue; }
    const line = currentLine.trim();
    if (!line || line.startsWith("#")) { i++; continue; }
    const heredoc = line.match(/<<\s*['"]?(\w+)['"]?\s*$/);
    if (heredoc) {
      commands.push(line);
      const marker = heredoc[1];
      if (!marker) { i++; continue; }
      i++;
      while (i < raw.length && raw[i]?.trim() !== marker) i++;
      i++;
    } else {
      const { cmd, comment } = splitComment(line);
      commands.push(cmd);
      if (comment && caption === null) caption = comment;
      i++;
    }
  }
  return { commands, caption };
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
    if (!raw) continue;
    const { commands, caption } = processBlock(raw);
    if (commands.length === 0) continue;
    const affects: NodeRef[] = unique(commands.flatMap((c) => parseCommand(c)));
    steps.push({ index, commands, output: null, affects, caption });
    index++;
  }
  return steps;
}
