export function normalizeAmazonUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!u.hostname.includes("amazon.")) return url;

    const m = u.pathname.match(/\/dp\/([A-Z0-9]{10})/i) || u.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    if (m) {
      const asin = m[1].toUpperCase();
      return `${u.protocol}//${u.hostname}/dp/${asin}/`;
    }
    return `${u.protocol}//${u.hostname}${u.pathname}`;
  } catch {
    return url;
  }
}

export function normalizeUrlLite(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    ["ref","utm_source","utm_medium","utm_campaign","utm_term","utm_content"].forEach(k => u.searchParams.delete(k));
    return u.toString();
  } catch {
    return url;
  }
}
