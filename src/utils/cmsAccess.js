export function isCmsEnabled(env = import.meta.env) {
  return env?.VITE_ENABLE_PUBLIC_CMS !== "false";
}
