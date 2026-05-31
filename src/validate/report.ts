export type ValidationFinding = {
  severity: "error" | "warning";
  code: string;
  message: string;
  where: string[];
};

export type ValidationReport = {
  pack_id: string;
  ok: boolean;
  findings: ValidationFinding[];
};

/**
 * Helper to compile and print a clean validation report.
 */
export function formatValidationReport(report: ValidationReport): string {
  const errors = report.findings.filter((f) => f.severity === "error");
  const warnings = report.findings.filter((f) => f.severity === "warning");

  if (report.ok) {
    let out = `Validation SUCCESS for pack '${report.pack_id}': 0 errors, ${warnings.length} warnings.`;
    if (warnings.length > 0) {
      out += `\n\n--- WARNINGS ---\n`;
      for (const wrn of warnings) {
        out += `[${wrn.code}] ${wrn.message} (at: ${wrn.where.join(", ")})\n`;
      }
    }
    return out;
  }

  let out = `Validation FAILED for pack '${report.pack_id}':\n`;
  out += `Total findings: ${errors.length} errors, ${warnings.length} warnings\n\n`;

  if (errors.length > 0) {
    out += `--- ERRORS ---\n`;
    for (const err of errors) {
      out += `[${err.code}] ${err.message} (at: ${err.where.join(", ")})\n`;
    }
  }

  if (warnings.length > 0) {
    out += `\n--- WARNINGS ---\n`;
    for (const wrn of warnings) {
      out += `[${wrn.code}] ${wrn.message} (at: ${wrn.where.join(", ")})\n`;
    }
  }

  return out;
}
