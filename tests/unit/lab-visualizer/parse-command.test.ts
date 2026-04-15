import { describe, it, expect } from "vitest";
import { parseCommand } from "@/lib/lab-visualizer/parse-command";

describe("parseCommand", () => {
  it("vault status → [server]", () => {
    expect(parseCommand("vault status")).toEqual(["server"]);
  });

  it("vault login root → [client, server, token]", () => {
    expect(parseCommand("vault login root")).toEqual(["client", "server", "token"]);
  });

  it("vault operator init → [server]", () => {
    expect(parseCommand("vault operator init")).toEqual(["server"]);
  });

  it("vault operator unseal → [server]", () => {
    expect(parseCommand("vault operator unseal abc123")).toEqual(["server"]);
  });

  it("vault operator seal → [server]", () => {
    expect(parseCommand("vault operator seal")).toEqual(["server"]);
  });

  it("vault auth list → [server]", () => {
    expect(parseCommand("vault auth list")).toEqual(["server"]);
  });

  it("vault auth list -detailed → [server]", () => {
    expect(parseCommand("vault auth list -detailed")).toEqual(["server"]);
  });

  it("vault auth enable userpass → [server, auth:userpass]", () => {
    expect(parseCommand("vault auth enable userpass")).toEqual(["server", "auth:userpass"]);
  });

  it("vault auth enable approle → [server, auth:approle]", () => {
    expect(parseCommand("vault auth enable approle")).toEqual(["server", "auth:approle"]);
  });

  it("vault auth disable userpass → [server, auth:userpass]", () => {
    expect(parseCommand("vault auth disable userpass")).toEqual(["server", "auth:userpass"]);
  });

  it("vault secrets list → [server]", () => {
    expect(parseCommand("vault secrets list")).toEqual(["server"]);
  });

  it("vault secrets enable kv-v2 → [server, engine:kv-v2]", () => {
    expect(parseCommand("vault secrets enable kv-v2")).toEqual(["server", "engine:kv-v2"]);
  });

  it("vault secrets enable -path=secret kv-v2 → contains server", () => {
    const result = parseCommand("vault secrets enable -path=secret kv-v2");
    expect(result).toContain("server");
  });

  it("vault kv put secret/foo bar=baz → [client, server, engine:kv]", () => {
    expect(parseCommand("vault kv put secret/foo bar=baz")).toEqual([
      "client",
      "server",
      "engine:kv",
    ]);
  });

  it("vault kv get secret/foo → [client, server, engine:kv]", () => {
    expect(parseCommand("vault kv get secret/foo")).toEqual(["client", "server", "engine:kv"]);
  });

  it("vault kv list secret/ → [client, server, engine:kv]", () => {
    expect(parseCommand("vault kv list secret/")).toEqual(["client", "server", "engine:kv"]);
  });

  it("vault kv delete secret/foo → [client, server, engine:kv]", () => {
    expect(parseCommand("vault kv delete secret/foo")).toEqual(["client", "server", "engine:kv"]);
  });

  it("vault policy write admin admin.hcl → [server, policy]", () => {
    expect(parseCommand("vault policy write admin admin.hcl")).toEqual(["server", "policy"]);
  });

  it("vault policy list → [server, policy]", () => {
    expect(parseCommand("vault policy list")).toEqual(["server", "policy"]);
  });

  it("vault token create → [server, token]", () => {
    expect(parseCommand("vault token create")).toEqual(["server", "token"]);
  });

  it("vault token create -ttl=1h → [server, token]", () => {
    expect(parseCommand("vault token create -ttl=1h")).toEqual(["server", "token"]);
  });

  it("vault token lookup → [server, token]", () => {
    expect(parseCommand("vault token lookup")).toEqual(["server", "token"]);
  });

  it("vault token capabilities secret/foo → [server, token, policy]", () => {
    expect(parseCommand("vault token capabilities secret/foo")).toEqual([
      "server",
      "token",
      "policy",
    ]);
  });

  it("vault write transit/keys/my-key → [client, server, engine:transit]", () => {
    expect(parseCommand("vault write transit/keys/my-key")).toEqual([
      "client",
      "server",
      "engine:transit",
    ]);
  });

  it("vault write pki/root/generate/internal → [client, server, engine:pki]", () => {
    expect(parseCommand("vault write pki/root/generate/internal")).toEqual([
      "client",
      "server",
      "engine:pki",
    ]);
  });

  it("vault read database/creds/my-role → [client, server, engine:database]", () => {
    expect(parseCommand("vault read database/creds/my-role")).toEqual([
      "client",
      "server",
      "engine:database",
    ]);
  });

  it("vault read sys/mounts (no engine in path) → [client, server]", () => {
    expect(parseCommand("vault read sys/mounts")).toEqual(["client", "server"]);
  });

  it("fallback for unknown command → [server]", () => {
    expect(parseCommand("vault plugin reload -plugin=foo")).toEqual(["server"]);
  });

  it("empty string → [server] (fallback)", () => {
    expect(parseCommand("")).toEqual(["server"]);
  });

  it("comment-only line → [server] (fallback)", () => {
    expect(parseCommand("# this is a comment")).toEqual(["server"]);
  });

  it("non-vault command → [server] (fallback)", () => {
    expect(parseCommand("export VAULT_ADDR=http://127.0.0.1:8200")).toEqual(["server"]);
  });

  it("leading whitespace is trimmed", () => {
    expect(parseCommand("   vault status")).toEqual(["server"]);
  });
});
