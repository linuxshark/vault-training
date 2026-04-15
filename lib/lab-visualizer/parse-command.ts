import type { NodeRef } from "./types";
import { FALLBACK_AFFECTS, RULES } from "./rules";

export function parseCommand(command: string): NodeRef[] {
  const trimmed = command.trim();
  if (!trimmed) return FALLBACK_AFFECTS;
  for (const rule of RULES) {
    const m = trimmed.match(rule.match);
    if (m) return rule.affects(m);
  }
  return FALLBACK_AFFECTS;
}
