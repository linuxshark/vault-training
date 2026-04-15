export type NodeKind = "server" | "client" | "auth" | "engine" | "policy" | "token";

export type NodeRef =
  | "server"
  | "client"
  | "token"
  | "policy"
  | `auth:${string}`
  | `engine:${string}`;

export interface LabStep {
  index: number;
  commands: string[];
  output: string | null;
  affects: NodeRef[];
  caption: string | null;
}

export interface LabRule {
  match: RegExp;
  affects: (m: RegExpMatchArray) => NodeRef[];
}

export type NodeState = "idle" | "active" | "disabled";
