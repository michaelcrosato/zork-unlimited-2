import { describe, it, expect } from "vitest";
import { formatValidationReport, ValidationReport } from "../src/validate/report.js";

describe("formatValidationReport", () => {
  it("formats a successful report with zero errors", () => {
    const report: ValidationReport = {
      pack_id: "test-pack",
      ok: true,
      findings: [],
    };
    const output = formatValidationReport(report);
    expect(output).toContain("SUCCESS");
    expect(output).toContain("test-pack");
    expect(output).toContain("0 errors");
  });

  it("formats a successful report with warnings", () => {
    const report: ValidationReport = {
      pack_id: "test-pack",
      ok: true,
      findings: [
        { severity: "warning", code: "W001", message: "Unused scene", where: ["scene_3"] },
      ],
    };
    const output = formatValidationReport(report);
    expect(output).toContain("SUCCESS");
    expect(output).toContain("1 warnings");
    expect(output).toContain("W001");
    expect(output).toContain("Unused scene");
    expect(output).toContain("scene_3");
  });

  it("formats a failed report with errors and warnings", () => {
    const report: ValidationReport = {
      pack_id: "broken-pack",
      ok: false,
      findings: [
        { severity: "error", code: "E001", message: "Missing start scene", where: ["meta"] },
        { severity: "error", code: "E002", message: "Dangling exit", where: ["scene_1", "scene_2"] },
        { severity: "warning", code: "W001", message: "Unused scene", where: ["scene_4"] },
        { severity: "info", code: "I001", message: "Pack has 5 scenes", where: [] },
      ],
    };
    const output = formatValidationReport(report);
    expect(output).toContain("FAILED");
    expect(output).toContain("broken-pack");
    expect(output).toContain("2 errors");
    expect(output).toContain("1 warnings");
    expect(output).toContain("1 info");
    expect(output).toContain("E001");
    expect(output).toContain("E002");
    expect(output).toContain("Dangling exit");
    expect(output).toContain("scene_1, scene_2");
  });

  it("includes info section when present in successful report", () => {
    const report: ValidationReport = {
      pack_id: "info-pack",
      ok: true,
      findings: [
        { severity: "info", code: "I001", message: "All scenes reachable", where: ["graph"] },
      ],
    };
    const output = formatValidationReport(report);
    expect(output).toContain("INFO");
    expect(output).toContain("I001");
  });
});
