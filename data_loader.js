export async function loadManifest(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`manifest load failed: HTTP ${r.status}`);
  return await r.json(); // { baseUrl, files: [] }
}

export async function loadAllCards(manifest) {
  const baseUrl = manifest.baseUrl;
  const files = manifest.files || [];
  const results = [];

  for (const file of files) {
    const url = baseUrl + file;
    const data = await safeFetchJson(url);
    results.push({ file, url, data });
  }
  return results;
}

async function safeFetchJson(url) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return { _error: `HTTP ${r.status}` };
    return await r.json();
  } catch (e) {
    return { _error: String(e) };
  }
}
