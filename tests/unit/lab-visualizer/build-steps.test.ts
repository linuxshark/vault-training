import { describe, it, expect } from "vitest";
import { buildLabSteps } from "@/lib/lab-visualizer/build-steps";

describe("buildLabSteps", () => {
  it("extracts bash blocks into LabStep[]", () => {
    const body = `
Intro paragraph.

\`\`\`bash
vault status
\`\`\`

\`\`\`bash
vault login root
\`\`\`
`;
    const steps = buildLabSteps(body);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toMatchObject({
      index: 0,
      commands: ["vault status"],
      affects: ["server"],
    });
    expect(steps[1]).toMatchObject({
      index: 1,
      commands: ["vault login root"],
      affects: ["client", "server", "token"],
    });
  });

  it("ignores non-bash code fences", () => {
    const body = `
\`\`\`yaml
foo: bar
\`\`\`

\`\`\`bash
vault status
\`\`\`

\`\`\`json
{"x": 1}
\`\`\`
`;
    const steps = buildLabSteps(body);
    expect(steps).toHaveLength(1);
    expect(steps[0]?.commands).toEqual(["vault status"]);
  });

  it("handles multi-line bash blocks", () => {
    const body = `
\`\`\`bash
vault kv put secret/a x=1
vault kv put secret/b y=2
\`\`\`
`;
    const steps = buildLabSteps(body);
    expect(steps).toHaveLength(1);
    expect(steps[0]?.commands).toEqual([
      "vault kv put secret/a x=1",
      "vault kv put secret/b y=2",
    ]);
  });

  it("unions affects from all lines in a block", () => {
    const body = `
\`\`\`bash
vault auth enable userpass
vault kv put secret/foo bar=baz
\`\`\`
`;
    const steps = buildLabSteps(body);
    expect(steps).toHaveLength(1);
    expect(new Set(steps[0]?.affects)).toEqual(
      new Set(["server", "auth:userpass", "client", "engine:kv"]),
    );
  });

  it("ignores HEREDOC content, keeps the leading command", () => {
    const body = `
\`\`\`bash
vault kv put secret/user - <<EOF
{
  "username": "admin"
}
EOF
\`\`\`
`;
    const steps = buildLabSteps(body);
    expect(steps).toHaveLength(1);
    expect(steps[0]?.commands[0]).toMatch(/^vault kv put secret\/user/);
    expect(steps[0]?.affects).toEqual(["client", "server", "engine:kv"]);
  });

  it("returns empty array when no bash blocks", () => {
    const body = `Just prose, no code.`;
    expect(buildLabSteps(body)).toEqual([]);
  });

  it("skips empty lines inside a block", () => {
    const body = `
\`\`\`bash
vault status

vault login root
\`\`\`
`;
    const steps = buildLabSteps(body);
    expect(steps[0]?.commands).toEqual(["vault status", "vault login root"]);
  });
});
