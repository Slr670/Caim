/**
 * Standard HTTP Cache-Control headers to completely eliminate edge, CDN, and browser caching
 * for dynamic API routes deployed on Vercel or running locally.
 */
export const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
  "Pragma": "no-cache",
  "Expires": "0",
  "Surrogate-Control": "no-store",
  "X-Accel-Buffering": "no",
} as const
