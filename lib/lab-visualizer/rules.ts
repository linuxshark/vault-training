import type { LabRule, NodeRef } from "./types";

export const FALLBACK_AFFECTS: NodeRef[] = ["server"];

export const RULES: LabRule[] = [
  { match: /^vault status\b/, affects: () => ["server"] },
  { match: /^vault login\b/, affects: () => ["client", "server", "token"] },
  { match: /^vault operator init\b/, affects: () => ["server"] },
  { match: /^vault operator unseal\b/, affects: () => ["server"] },
  { match: /^vault operator seal\b/, affects: () => ["server"] },
  { match: /^vault auth list\b/, affects: () => ["server"] },
  {
    match: /^vault auth enable (\S+)/,
    affects: (m) => ["server", `auth:${m[1]}` as NodeRef],
  },
  {
    match: /^vault auth disable (\S+)/,
    affects: (m) => ["server", `auth:${m[1]}` as NodeRef],
  },
  { match: /^vault secrets list\b/, affects: () => ["server"] },
  {
    match: /^vault secrets enable (\S+)/,
    affects: (m) => ["server", `engine:${m[1]}` as NodeRef],
  },
  {
    match: /^vault secrets disable (\S+)/,
    affects: (m) => ["server", `engine:${m[1]}` as NodeRef],
  },
  { match: /^vault kv\b/, affects: () => ["client", "server", "engine:kv"] },
  { match: /^vault policy\b/, affects: () => ["server", "policy"] },
  { match: /^vault token create\b/, affects: () => ["server", "token"] },
  { match: /^vault token lookup\b/, affects: () => ["server", "token"] },
  { match: /^vault token capabilities\b/, affects: () => ["server", "token", "policy"] },
  {
    match: /^vault (?:read|write|list|delete)\s+(transit|pki|database|ssh|totp)\b/,
    affects: (m) => ["client", "server", `engine:${m[1]}` as NodeRef],
  },
  { match: /^vault (?:read|write|list|delete)\b/, affects: () => ["client", "server"] },
];
