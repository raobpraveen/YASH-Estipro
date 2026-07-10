/**
 * Filename helpers for YASH EstiPro exports.
 * Every download follows: {PRJ}_{Customer}_{ProjectName}_v{N}_{Suffix}.{ext}
 */

// Strip characters that are unsafe in filenames on Windows/macOS/Linux and collapse whitespace.
export const sanitizeForFilename = (input, maxLength = 50) => {
  return String(input || "")
    .replace(/[\\/:*?"<>|\r\n\t]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .substring(0, maxLength);
};

/**
 * Build a standardised export filename:
 *   {projectNumber}_{Customer_Name}_{Project_Name}_v{version}_{suffix}.{ext}
 * - projectNumber: e.g. "PRJ-0035" (falls back to "Project" if missing)
 * - customerName:  e.g. "Abraj Energy" (capped at 30 chars)
 * - projectName:   e.g. "SAP S4 Transformation" (capped at 50 chars)
 * - version:       numeric — becomes "_v{N}"
 * - suffix:        "Estimate" | "Cashflow" | "Milestones" | "Gantt" | ...
 * - ext:           "xlsx" | "png" | "pdf"
 * Any empty piece is skipped so no dangling separators appear.
 */
export const buildExportFilename = ({
  projectNumber,
  customerName,
  projectName,
  version,
  suffix = "Estimate",
  ext = "xlsx",
}) => {
  const base = [
    projectNumber || "Project",
    sanitizeForFilename(customerName, 30),
    sanitizeForFilename(projectName, 50),
  ].filter(Boolean).join("_");
  const versionPart = version ? `_v${version}` : "";
  const suffixPart = suffix ? `_${suffix}` : "";
  return `${base}${versionPart}${suffixPart}.${ext}`;
};
