import { buildEmbedTag } from "./template.js";
import { copyText } from "./clipboard.js";

/** HTML escape */
function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[m]));
}

/** Title prefix until first whitespace */
function brandKeyFromTitle(title){
  const t = String(title ?? "").trim();
  if (!t) return "(none)";
  return t.split(/\s+/)[0];
}

/** Cache brand keys on state */
function ensureBrandCache(state){
  if (state._brandCacheReady) return;

  (state.cards || []).forEach(c => {
    if (!c) return;
    c.brandKey = brandKeyFromTitle(c.data?.title);
  });

  const keys = Array.from(new Set((state.cards || []).map(c => c.brandKey || "(none)")));
  keys.sort((a,b) => String(a).localeCompare(String(b), "ja"));
  state.brandKeys = keys;

  // Draft vs Applied (search runs only on button click / submit)
  if (typeof state.brandDraft !== "string") state.brandDraft = "";
  if (typeof state.qDraft !== "string") state.qDraft = "";
  if (typeof state.brandApplied !== "string") state.brandApplied = "";
  if (typeof state.qApplied !== "string") state.qApplied = "";

  state._brandCacheReady = true;
}

function kvLine(label, value, act, file){
  const v = value ?? "";
  return `
    <div class="kv">
      <div class="small">${esc(label)}</div>
      <pre>${esc(v)}</pre>
      <button type="button" data-act="${act}" data-file="${esc(file)}">Copy</button>
    </div>
  `;
}

export function renderList(root, state) {
  ensureBrandCache(state);

  const loadingText = state.loading
    ? `読み込み中… ${state.loaded ?? 0} / ${state.total ?? 0}`
    : `読み込み完了 ${state.loaded ?? (state.cards?.length ?? 0)} / ${state.total ?? (state.cards?.length ?? 0)}`;

  root.innerHTML = `
    <div class="list-toolbar">
      <span class="pill small">${esc(loadingText)}</span>
      <span id="count" class="small"></span>
    </div>

    <form id="searchForm" class="list-toolbar">
      <label class="small">ブランド：</label>
      <select id="brand">
        <option value="">（すべて）</option>
        ${(state.brandKeys || []).map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join("")}
      </select>

      <input id="q" class="q" placeholder="検索（title / file / desc / URL）" />

      <button id="btnSearch" type="submit">検索</button>
      <button id="btnClear" type="button">クリア</button>
      <button id="btnNew" type="button">新規</button>
    </form>

    ${state.loading ? `<div class="loading-box">JSONを取得しています。表示は随時更新されます。</div>` : ""}

    <div id="list"></div>
  `;

  const brandEl = root.querySelector("#brand");
  const qEl = root.querySelector("#q");

  // restore draft UI
  brandEl.value = state.brandDraft || "";
  qEl.value = state.qDraft || "";

  brandEl.addEventListener("change", (e) => { state.brandDraft = e.target.value; });
  qEl.addEventListener("input", (e) => { state.qDraft = e.target.value; });

  // Enter => submit => 検索
  root.querySelector("#searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.brandApplied = state.brandDraft || "";
    state.qApplied = state.qDraft || "";
    applyFilterAndRender(root, state);
  });

  root.querySelector("#btnClear").addEventListener("click", () => {
    state.brandDraft = "";
    state.qDraft = "";
    state.brandApplied = "";
    state.qApplied = "";
    brandEl.value = "";
    qEl.value = "";
    applyFilterAndRender(root, state);
  });

  root.querySelector("#btnNew").addEventListener("click", () => {
    location.hash = "#/new";
  });

  // Initial render
  applyFilterAndRender(root, state);
}

function applyFilterAndRender(root, state){
  const q = (state.qApplied || "").toLowerCase();
  const brand = state.brandApplied || "";
  const cards = state.cards || [];

  // タイトル辞書順（ja）で安定ソート
  const sorted = [...cards].sort((a,b) => {
    const at = String(a?.data?.title || "");
    const bt = String(b?.data?.title || "");
    const c = at.localeCompare(bt, "ja");
    if (c !== 0) return c;
    return String(a?.file || "").localeCompare(String(b?.file || ""), "ja");
  });

  const filtered = sorted.filter(x => {
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
  listEl.innerHTML = filtered.map(x => cardHtml(state, x)).join("");

  // Wire buttons
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
      if (act === "copy-aurl") text = item.data?.aUrl || "";
      if (act === "copy-yurl") text = item.data?.yUrl || "";
      if (act === "copy-rurl") text = item.data?.rUrl || "";

      const ok = await copyText(text);
      const old = btn.textContent;
      btn.textContent = ok ? "OK" : "NG";
      setTimeout(() => (btn.textContent = old), 700);
    });
  });
}

function cardHtml(state, x) {
  const title = x.data?.title || "(タイトル未設定)";
  const err = x.data?._error
    ? `<div class="small">取得失敗: ${esc(x.data._error)}</div>`
    : "";

  return `
    <div class="card">
      <div class="card-head">
        <div>
          <div class="card-title">${esc(title)}</div>
          <div class="card-file">${esc(x.file)}</div>
        </div>
        <div class="card-actions">
          <button type="button" data-act="copy-embed" data-file="${esc(x.file)}">埋め込みタグ</button>
          <button type="button" data-act="edit" data-file="${esc(x.file)}">編集</button>
        </div>
      </div>

      ${kvLine("aUrl", x.data?.aUrl, "copy-aurl", x.file)}
      ${kvLine("yUrl", x.data?.yUrl, "copy-yurl", x.file)}
      ${kvLine("rUrl", x.data?.rUrl, "copy-rurl", x.file)}

      ${err}
    </div>
  `;
}