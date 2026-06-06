export function isCmsEnabled(env = import.meta.env) {
  return Boolean(env?.DEV || env?.VITE_ENABLE_PUBLIC_CMS === "true");
}
