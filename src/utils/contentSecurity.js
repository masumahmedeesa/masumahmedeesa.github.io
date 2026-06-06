export const MAX_IMAGE_UPLOAD_BYTES = 3 * 1024 * 1024;
export const MAX_RESUME_UPLOAD_BYTES = 8 * 1024 * 1024;

export const SAFE_RESUME_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const SAFE_RESUME_EXTENSIONS = [".pdf", ".doc", ".docx"];
export const SAFE_IMAGE_MIME_PATTERN = /^image\/(png|jpe?g|gif|webp)$/i;
export const SAFE_IMAGE_DATA_PATTERN = /^data:image\/(png|jpe?g|gif|webp);base64,/i;
export const SAFE_RESUME_DATA_PATTERN =
  /^data:(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document);base64,/i;

const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const SAFE_MEDIA_PROTOCOLS = new Set(["http:", "https:"]);

function trimmed(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function isSafeRelativeUrl(value) {
  const url = trimmed(value);
  if (!url) return true;
  if (url.startsWith("//")) return false;
  if (url.startsWith("#")) return true;
  return url.startsWith("/") || url.startsWith("./") || url.startsWith("../");
}

export function isSafeUrl(value, kind = "link") {
  const url = trimmed(value);
  if (!url) return true;
  if (isSafeRelativeUrl(url)) return true;

  if (kind === "image" && SAFE_IMAGE_DATA_PATTERN.test(url)) return true;
  if (kind === "resume" && SAFE_RESUME_DATA_PATTERN.test(url)) return true;

  try {
    const parsed = new URL(url);
    if (kind === "link") return SAFE_LINK_PROTOCOLS.has(parsed.protocol);
    return SAFE_MEDIA_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export function sanitizeUrl(value, kind = "link", fallback = "") {
  if (value == null || value === "") return "";
  const url = trimmed(value);
  return isSafeUrl(url, kind) ? url : fallback;
}

export function validateUrl(value, kind = "link") {
  const url = trimmed(value);
  if (!url || isSafeUrl(url, kind)) return { valid: true, value: url, message: "" };

  const readableKind = kind === "image" ? "image" : kind === "resume" ? "resume" : "link";
  return {
    valid: false,
    value: url,
    message: `Unsafe ${readableKind} URL blocked. Use https/http, a repo-relative path, or an approved draft upload.`,
  };
}

export function validateUploadFile(file, kind = "image") {
  if (!file) return { valid: false, message: "No file selected." };

  const name = String(file.name ?? "").toLowerCase();
  const type = String(file.type ?? "").toLowerCase();
  const size = Number(file.size ?? 0);

  if (kind === "image") {
    if (!SAFE_IMAGE_MIME_PATTERN.test(type)) {
      return { valid: false, message: "Please upload a PNG, JPG, GIF, or WebP image." };
    }

    if (size > MAX_IMAGE_UPLOAD_BYTES) {
      return { valid: false, message: "Image upload is too large. Keep draft images under 3 MB." };
    }

    return { valid: true, message: "" };
  }

  const hasSafeExtension = SAFE_RESUME_EXTENSIONS.some((extension) => name.endsWith(extension));
  const hasSafeMime = SAFE_RESUME_MIME_TYPES.has(type);

  if (!hasSafeMime && !hasSafeExtension) {
    return { valid: false, message: "Please upload a PDF, DOC, or DOCX resume." };
  }

  if (size > MAX_RESUME_UPLOAD_BYTES) {
    return { valid: false, message: "Resume upload is too large. Keep draft resumes under 8 MB." };
  }

  return { valid: true, message: "" };
}

export function hasDataUrls(value) {
  if (typeof value === "string") return /^data:/i.test(value);
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasDataUrls(item));
  return Object.values(value).some((item) => hasDataUrls(item));
}
