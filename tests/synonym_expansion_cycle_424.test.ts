import { describe, it, expect } from "vitest";
import { validateParserPack } from "../src/validate/parser_validator.js";
import fs from "fs";
import YAML from "yaml";
import path from "path";

describe("validateParserPack options (Cycle #424)", () => {
  const yamlContent = fs.readFileSync(path.resolve(process.cwd(), "content/parser/pack/unlimited_forest.yaml"), "utf8");
  const rawPack = YAML.parse(yamlContent);

  it("should run full validation including soft-lock detection by default", () => {
    const report = validateParserPack(rawPack);
    expect(report.ok).toBe(true);
    const softlocks = report.findings.filter((f) => f.code === "SOFTLOCK_DETECTED");
    expect(softlocks.length).toBeGreaterThan(0);
  }, 15000);

  it("should bypass soft-lock detection when skipSoftlocks is true", () => {
    const report = validateParserPack(rawPack, { skipSoftlocks: true });
    expect(report.ok).toBe(true);
    const softlocks = report.findings.filter((f) => f.code === "SOFTLOCK_DETECTED");
    expect(softlocks.length).toBe(0);
  });
});
