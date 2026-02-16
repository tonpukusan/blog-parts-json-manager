export function normalizeAmazonUrl(url) {
  if (!url) return url;

  try {
    const u = new URL(url);

    // Only touch Amazon domains
    if (!u.hostname.includes("amazon.")) return url;

    // Shorten only if ASIN exists in dp/ or gp/product/
    const m =
      u.pathname.match(/\/dp\/([A-Z0-9]{10})/i) ||
      u.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/i);

    if (m) {
      const asin = m[1].toUpperCase();
      return `${u.protocol}//${u.hostname}/dp/${asin}/`;
    }

    // Search URLs like /s?k=... must be preserved
    return url;
  } catch {
    return url;
  }
}

export function normalizeUrlLite(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    // Remove common UTM parameters only (avoid breaking search urls)
    ["utm_source","utm_medium","utm_campaign","utm_term","utm_content"].forEach(k => u.searchParams.delete(k));
    return u.toString();
  } catch {
    return url;
  }
}
