/**
 * Shared utility for cleaning file paths for display across the app.
 * Strips uploads/projectId prefixes and absolute path segments.
 *
 * @param {string} filePath - Raw file path (can be absolute or relative)
 * @param {object} options - Optional settings
 * @param {number} options.maxLength - Max length before truncation (0 = no truncation)
 * @returns {string} Clean path for display (e.g. "src/index.js")
 */
export function cleanFilePathForDisplay(filePath, options = {}) {
  if (!filePath || typeof filePath !== "string") return "Unknown";

  const normalizedPath = filePath.replace(/\\/g, "/").trim();

  // Remove absolute path prefix (e.g. /Users/.../server/uploads/projectId/)
  const absoluteUploadsPattern = /^.*?\/uploads\/[^/]+\//;
  // Also handle relative uploads/projectId/ prefix
  const relativeUploadsPattern = /^uploads\/[^/]+\//;

  let cleanPath = normalizedPath
    .replace(absoluteUploadsPattern, "")
    .replace(relativeUploadsPattern, "");

  if (cleanPath.startsWith("/")) cleanPath = cleanPath.substring(1);
  if (!cleanPath) return normalizedPath;

  const { maxLength = 0 } = options;
  if (maxLength > 0 && cleanPath.length > maxLength) {
    const parts = cleanPath.split("/");
    if (parts.length > 2) {
      const start = parts[0];
      const end = parts[parts.length - 1];
      return `${start}/.../${end}`;
    }
    return "..." + cleanPath.slice(-(maxLength - 3));
  }

  return cleanPath;
}
