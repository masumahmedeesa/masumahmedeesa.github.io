export function assetUrl(value) {
  if (!value || typeof value !== "string") return value;
  if (/^(https?:|mailto:|tel:|data:|blob:|#)/i.test(value)) return value;
  if (!value.startsWith("/")) return value;

  return `${import.meta.env.BASE_URL}${value.replace(/^\/+/, "")}`;
}
