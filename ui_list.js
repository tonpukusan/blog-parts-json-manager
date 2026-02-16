import { buildEmbedTag } from "./template.js";
import { copyText } from "./clipboard.js";

/** HTMLエスケープ */
function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[m]));
}
function escAttr(s){ return esc(s).replace(/`/g,"&#96;"); }

/** タイトルの最初の空白まで（メーカー/ブランドっぽい先頭語） */
function brandKeyFromTitle(title){
  const t = String(title ?? "").trim();
  if (!t) return "(none)";
  return t.split(/\s+/)[0];
}

/** 各カードにブランドキーを付与し、ブランド一覧をstateにキャッシュ */
function ensureBrandCache(state){
  if (state._brandCacheReady) return;

  (state.cards || []).forEach(c => {
    if (!c) return;
    c.brandKey = brandKeyFromTitle(c.data?.title);
  });

  const keys = Array.from(new Set((state.cards || []).map(c => c.brandKey || "(none)")));
  // 日本語でもそこそこ自然に並ぶように
  keys.sort((a,b) => String(a).localeCompare(String(b), "ja"));
  state.brandKeys = keys;
  if (typeof state.brandSelected !== "string") state.brandSelected = ""; // "" = 全部
  state._brandCacheReady = true;
}

function line(label, value, copyAct, file){
  const v = value ?? "";
  return `
    <div style="display:flex; gap:8px; align-items:flex-start; margin-top:4px;">
      <div style="width:48px; color:#666; font-size:11px; line-height:1.3;">${esc(label)}</div>
      <div style="flex:1; font-size:11px; color:#333; word-break:break-all; line-height:1.3;">
        <span title="${escAttr(v)}">${esc(v)}</span>
      </div>
      <button data-act="${copyAct}" data-file="${escAttr(file)}"
              style="padding:3px 8px; font-size:11px;">Copy</button>
    </div>
  `;
}

export function renderList(root, state) {
  ensureBrandCache(state);

  const q = state.q || "";

  root.innerHTML = `
    <div style="display:flex; gap:12px; align-items:center; margin-bottom:12px;">
      <select id="brand" style="padding:8px; max-width:220px;">
        <option value="">（ブランド：すべて）</option>
        ${(state.brandKeys || []).map(k =>
          `<option value="${escAttr(k)}" ${state.brandSelected===k ? "selected" : ""}>${esc(k)}</option>`
        ).join("")}
      </select>

      <input id="q"
             placeholder="検索（title / desc / URL / ファイル名）"
             value="${escAttr(q)}"
             style="flex:1; padding:8px;">

      <a href="#/new">新規</a>
    </div>

    <div style="color:#666; font-size:12px; margin-bottom:10px;" id="count"></div>
    <div id="list"></div>
  `;

  // 変更イベント：ブランドはchange、検索はデバウンス
  const brandEl = root.querySelector("#brand");
  const qEl = root.querySelector("#q");

  brandEl.addEventListener("change", (e) => {
    state.brandSelected = e.target.value;
    applyFilterAndRender(root, state);
  });

  let tmr = null;
  qEl.addEventListener("input", (e) => {
    state.q = e.target.value;
    if (tmr) clearTimeout(tmr);
    tmr = setTimeout(() => applyFilterAndRender(root, state), 180);
  });

  // 初回描画
  applyFilterAndRender(root, state);
}

function applyFilterAndRender(root, state){
  const q = (state.q || "").toLowerCase();
  const brand = state.brandSelected || "";

  const cards = state.cards || [];
  const filtered = cards.filter(x => {
    if (!x) return false;
    if (brand && (x.brandKey || "(none)") !== brand) return false;
    if (!q) return true;

    const t =
      (x.data?.title || "") + " " +
      (x.file || "") + " " +
      (x.data?.desc || "") + " " +
      (x.data?.aUrl || "") + " " +
      (x.data?.yUrl || "") + " " +
      (x.data?.rUrl || "");

    return t.toLowerCase().includes(q);
  });

  const countEl = root.querySelector("#count");
  countEl.textContent = `件数：${filtered.length} / ${cards.length}`;

  const listEl = root.querySelector("#list");
  listEl.innerHTML = filtered.map(x => cardHtml(x)).join("");

  // ボタン配線
  listEl.querySelectorAll("[data-act]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const act = btn.dataset.act;
      const file = btn.dataset.file;

      const item = cards.find(c => c && c.file === file);
      if (!item) return;

      // 画面遷移
      if (act === "edit") {
        location.hash = `#/edit?file=${encodeURIComponent(file)}`;
        return;
      }

      let text = "";
      if (act === "copy-embed") text = buildEmbedTag(state.manifest.baseUrl, file);
      if (act === "copy-aurl")  text = item.data?.aUrl || "";
      if (act === "copy-yurl")  text = item.data?.yUrl || "";
      if (act === "copy-rurl")  text = item.data?.rUrl || "";
      if (act === "copy-desc")  text = item.data?.desc || "";

      const ok = await copyText(text);
      const old = btn.textContent;
      btn.textContent = ok ? "OK" : "NG";
      setTimeout(() => (btn.textContent = old), 700);
    });
  });
}

function cardHtml(x) {
  const title = x.data?.title || "(タイトル未設定)";
  const img = x.data?.imgUrl || "";
  const err = x.data?._error
    ? `<div style="color:#b00020;font-size:11px; margin-top:6px;">取得失敗: ${esc(x.data._error)}</div>`
    : "";

  // 画像URLが変な文字を含んでも壊れにくいよう img タグに寄せる
  return `
    <div style="padding:10px; border:1px solid #eee; border-radius:8px; margin-bottom:10px;">
      <div style="display:flex; gap:12px; align-items:center;">
        <div style="width:56px;height:56px;border-radius:6px;overflow:hidden;background:#f5f5f5;flex:0 0 auto;">
          <img src="${escAttr(img)}" alt="" width="56" height="56"
               style="width:56px;height:56px;object-fit:cover;display:block;">
        </div>

        <div style="flex:1;">
          <div style="font-weight:600;">${esc(title)}</div>
          <div style="font-size:11px;color:#666;">${esc(x.file)}</div>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
          <button data-act="copy-embed" data-file="${escAttr(x.file)}">埋め込みタグ</button>
          <button data-act="edit" data-file="${escAttr(x.file)}">編集</button>
        </div>
      </div>

      <div style="margin-top:8px;">
        ${line("aUrl", x.data?.aUrl, "copy-aurl", x.file)}
        ${line("yUrl", x.data?.yUrl, "copy-yurl", x.file)}
        ${line("rUrl", x.data?.rUrl, "copy-rurl", x.file)}
        ${line("desc", x.data?.desc, "copy-desc", x.file)}
        ${err}
      </div>
    </div>
  `;
}
