import { describe, it, expect } from "vitest";
import { buildLabSteps } from "@/lib/lab-visualizer/build-steps";

describe("loader integration (unit via buildLabSteps)", () => {
  it("pilot lab MDX produces 12 steps", () => {
    const pilot = `
\`\`\`bash
vault status
\`\`\`
\`\`\`bash
vault login root
\`\`\`
\`\`\`bash
vault secrets list
\`\`\`
\`\`\`bash
vault secrets list -detailed
\`\`\`
\`\`\`bash
vault auth list
\`\`\`
\`\`\`bash
vault auth list -detailed
\`\`\`
\`\`\`bash
vault kv put secret/first hello=world
vault kv put secret/my-secret username=admin password=secret123
\`\`\`
\`\`\`bash
vault kv get secret/first
vault kv get -field=hello secret/first
\`\`\`
\`\`\`bash
vault kv list secret/
\`\`\`
\`\`\`bash
vault kv delete secret/first
\`\`\`
\`\`\`bash
vault token lookup
\`\`\`
\`\`\`bash
vault token capabilities secret/first
\`\`\`
`;
    const steps = buildLabSteps(pilot);
    expect(steps).toHaveLength(12);
    expect(steps[0]?.affects).toEqual(["server"]);
    expect(steps[11]?.affects).toEqual(["server", "token", "policy"]);
  });
});
