export async function loadManifest(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`manifest load failed: HTTP ${r.status}`);
  return await r.json(); // { baseUrl, files: [] }
}

/**
 * 既存互換: 全件を逐次fetch（遅いがシンプル）
 */
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

/**
 * A案: 段階的（progressive）ロード
 * - UIを先に出し、JSONはバックグラウンドでバッチ取得
 * - onBatch([...]) が呼ばれるたびに、呼び出し側で state.cards に追加して再描画する想定
 *
 * opts:
 *   - concurrency: 同時fetch数（推奨 4〜8）
 *   - batchSize: 1回に結果を返す件数（推奨 10〜30）
 */
export async function loadCardsProgressive(manifest, onBatch, opts = {}) {
  const baseUrl = manifest.baseUrl;
  const files = manifest.files || [];

  const concurrency = Math.max(1, opts.concurrency ?? 6);
  const batchSize = Math.max(1, opts.batchSize ?? 20);

  let i = 0;

  async function fetchOne(file) {
    const url = baseUrl + file;
    const data = await safeFetchJson(url);
    return { file, url, data };
  }

  while (i < files.length) {
    const slice = files.slice(i, i + batchSize);
    i += batchSize;

    const out = [];
    let p = 0;

    const workers = Array.from({ length: Math.min(concurrency, slice.length) }, async () => {
      while (p < slice.length) {
        const file = slice[p++];
        out.push(await fetchOne(file));
      }
    });

    await Promise.all(workers);

    // 呼び出し側へ返す（このタイミングで画面更新すると体感が上がる）
    try {
      onBatch(out);
    } catch (e) {
      console.error("onBatch error:", e);
    }

    // ブラウザに描画の時間を渡す（長いタスクを避ける）
    await new Promise(r => setTimeout(r, 0));
  }
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
