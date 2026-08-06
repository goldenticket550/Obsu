import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { requestResponseText } from "./mobile-dashboard-model";

describe("request response alert", () => {
  it("stays hidden at zero and uses correct grammar", () => {
    expect(requestResponseText(0)).toBeNull();
    expect(requestResponseText(1)).toBe("1 request needs a response");
    expect(requestResponseText(2)).toBe("2 requests need a response");
  });

  it("targets the existing action-required queue", () => {
    const source = readFileSync(join(process.cwd(), "src/components/command/request-response-alert.tsx"), "utf8");
    expect(source).toContain('href="#action-required"');
    expect(source).toContain("if (!text) return null");
  });
});
