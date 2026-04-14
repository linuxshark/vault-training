import type { NodeRef } from "./types";

export const BASE_POSITIONS: Record<string, { x: number; y: number }> = {
  client: { x: 40, y: 140 },
  server: { x: 360, y: 140 },
  token: { x: 40, y: 20 },
  policy: { x: 40, y: 260 },
  "engine:kv": { x: 680, y: 50 },
  "engine:pki": { x: 680, y: 120 },
  "engine:transit": { x: 680, y: 190 },
  "engine:database": { x: 680, y: 260 },
  "engine:ssh": { x: 680, y: 330 },
  "engine:totp": { x: 680, y: 400 },
  "auth:userpass": { x: 250, y: 320 },
  "auth:approle": { x: 360, y: 320 },
  "auth:ldap": { x: 470, y: 320 },
  "auth:aws": { x: 580, y: 320 },
  "auth:kubernetes": { x: 250, y: 400 },
  "auth:jwt": { x: 360, y: 400 },
};

export function positionFor(ref: NodeRef): { x: number; y: number } {
  return BASE_POSITIONS[ref] ?? { x: 0, y: 0 };
}
