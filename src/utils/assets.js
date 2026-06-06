import { sanitizeUrl } from "./contentSecurity.js";

function baseUrl() {
  return import.meta.env?.BASE_URL ?? "/";
}

export function assetUrl(value, { kind = "link", fallback = "" } = {}) {
  const safeValue = sanitizeUrl(value, kind, fallback);
  if (!safeValue || typeof safeValue !== "string") return safeValue;
  if (!safeValue.startsWith("/")) return safeValue;

  return `${baseUrl()}${safeValue.replace(/^\/+/, "")}`;
}

export function safeHref(value, fallback = "#") {
  return assetUrl(value, { kind: "link", fallback });
}

export function safeImageSrc(value, fallback = "") {
  return assetUrl(value, { kind: "image", fallback });
}

export function safeResumeHref(value, fallback = "#") {
  return assetUrl(value, { kind: "resume", fallback });
}

export function mailtoHref(email) {
  const value = typeof email === "string" ? email.trim().replace(/\s/g, "") : "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? `mailto:${value}` : "#";
}

export function telHref(phone) {
  const value = typeof phone === "string" ? phone.replace(/[^\d+]/g, "") : "";
  return value ? `tel:${value}` : "#";
}
