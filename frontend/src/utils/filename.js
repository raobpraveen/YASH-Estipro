/**
 * Filename helpers for YASH EstiPro exports.
 * Ensures downloaded files carry Project #, Customer, Description consistently.
 */

// Strip characters that are unsafe in filenames on Windows/macOS/Linux and collapse whitespace.
export const sanitizeForFilename = (input, maxLength = 40) => {
  return String(input || "")
    .replace(/[\\/:*?"<>|\r\n\t]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .substring(0, maxLength);
};

/**
 * Build a standardised export filename:
 *   {projectNumber}_{Customer_Name}_{Description}_v{version}_{suffix}.{ext}
 * Any empty piece is skipped so no dangling separators appear.
 */
export const buildExportFilename = ({
  projectNumber,
  projectName,
  customerName,
  description,
  version,
  suffix = "Estimate",
  ext = "xlsx",
}) => {
  const base = [
    projectNumber || projectName || "Project",
    sanitizeForFilename(customerName, 30),
    sanitizeForFilename(description, 40),
  ].filter(Boolean).join("_");
  const versionPart = version ? `_v${version}` : "";
  const suffixPart = suffix ? `_${suffix}` : "";
  return `${base}${versionPart}${suffixPart}.${ext}`;
};
