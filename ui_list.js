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

/** stateにブランドキャッシュを作る */
function ensureBrandCache(state){
  if (state._brandCacheReady) return;

  (state.cards || []).forEach(c => {
    if (!c) return;
    c.brandKey = brandKeyFromTitle(c.data?.title);
  });

  const keys = Array.from(new Set((state.cards || []).map(c => c.brandKey || "(none)")));
  keys.sort((a,b) => String(a).localeCompare(String(b), "ja"));
  state.brandKeys = keys;

  // 実行条件（ボタン押下で反映するので、draftとappliedを分ける）
  if (typeof state.brandDraft !== "string") state.brandDraft = "";
  if (typeof state.qDraft !== "string") state.qDraft = "";
  if (typeof state.brandApplied !== "string") state.brandApplied = "";
  if (typeof state.qApplied !== "string") state.qApplied = "";

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

  root.innerHTML = `
    <div style="display:flex; gap:12px; align-items:center; margin-bottom:12px; flex-wrap:wrap;">
      <select id="brand" style="padding:8px; max-width:220px;">
        <option value="">（ブランド：すべて）</option>
        ${(state.brandKeys || []).map(k =>
          `<option value="${escAttr(k)}" ${state.brandDraft===k ? "selected" : ""}>${esc(k)}</option>`
        ).join("")}
      </select>

      <input id="q"
             placeholder="検索（title / desc / URL / ファイル名）"
             value="${escAttr(state.qDraft || "")}"
             style="flex:1; min-width:240px; padding:8px;">

      <button id="btnSearch" style="padding:8px 12px;">検索</button>
      <button id="btnClear" style="padding:8px 12px;">クリア</button>

      <a href="#/new" style="margin-left:auto;">新規</a>
    </div>

    <div style="color:#666; font-size:12px; margin-bottom:10px;" id="count"></div>
    <div id="list"></div>
  `;

  const brandEl = root.querySelector("#brand");
  const qEl = root.querySelector("#q");

  // 入力・選択は draft に入れるだけ（ここでは検索を走らせない）
  brandEl.addEventListener("change", (e) => {
    state.brandDraft = e.target.value;
  });
  qEl.addEventListener("input", (e) => {
    state.qDraft = e.target.value;
  });

  // 検索ボタン押下でだけ反映
  root.querySelector("#btnSearch").addEventListener("click", () => {
    state.brandApplied = state.brandDraft || "";
    state.qApplied = state.qDraft || "";
    applyFilterAndRender(root, state);
  });

  // クリア（条件を全消し → 全件表示）
  root.querySelector("#btnClear").addEventListener("click", () => {
    state.brandDraft = "";
    state.qDraft = "";
    state.brandApplied = "";
    state.qApplied = "";
    brandEl.value = "";
    qEl.value = "";
    applyFilterAndRender(root, state);
  });

  // 初回描画：Applied条件で描画（初期は全件）
  applyFilterAndRender(root, state);
}

function applyFilterAndRender(root, state){
  const q = (state.qApplied || "").toLowerCase();
  const brand = state.brandApplied || "";

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

  root.querySelector("#count").textContent =
    `件数：${filtered.length} / ${cards.length}（適用中：ブランド=${brand || "すべて"} / 検索=${state.qApplied ? "あり" : "なし"}）`;

  const listEl = root.querySelector("#list");
  listEl.innerHTML = filtered.map(x => cardHtml(x)).join("");

  // ボタン配線
  listEl.querySelectorAll("[data-act]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const act = btn.dataset.act;
      const file = btn.dataset.file;
      const item = cards.find(c => c && c.file === file);
      if (!item) return;

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
