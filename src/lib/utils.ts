/**
 * Extract the product code from a value that might be:
 * - A full URL: "https://qr-shipment-app.vercel.app/product/2AQ0173"
 * - A relative path: "/product/2AQ0173"
 * - A raw product code: "2AQ0173"
 *
 * Always returns just the product code.
 */
export function extractProductCode(value: string): string {
  const trimmed = decodeURIComponent(value).trim();

  // Check if it's a full URL
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/product\/(.+)/);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  } catch {
    // Not a valid URL — continue to next check
  }

  // Check if it's a relative path containing /product/
  const relMatch = trimmed.match(/\/product\/(.+)/);
  if (relMatch?.[1]) {
    return decodeURIComponent(relMatch[1]);
  }

  return trimmed;
}

/** The production base URL for QR codes */
export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://blackstone-order-scm.vercel.app');
