export function createCorsAllowlist(configuredOrigins: string | undefined, isProduction: boolean): Set<string> {
  const fallback = isProduction ? 'https://boya.bcshopir.ir' : 'http://localhost:3000,http://localhost:5173';
  return new Set((configuredOrigins || fallback).split(',').map((origin) => origin.trim()).filter(Boolean));
}

export function isCorsOriginAllowed(origin: string | undefined, allowlist: Set<string>): boolean {
  // Requests from non-browser clients have no Origin and are not CORS-readable browser requests.
  return !origin || allowlist.has(origin);
}
