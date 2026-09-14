import { Capacitor } from "@capacitor/core";

/**
 * API Base URL Configuration:
 * - Inside Capacitor Android APK: Points to the live cloud backend (https://cardioguard-ai-olive.vercel.app)
 * - Inside Web Browser: Uses relative paths ("") so it works seamlessly on localhost and on the web.
 */
export const API_BASE_URL = Capacitor.isNativePlatform()
  ? (import.meta.env.VITE_API_URL || "https://cardioguard-ai-olive.vercel.app")
  : "";

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
