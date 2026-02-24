// ui_edit.js (FULL REPLACE)
import { validateKattene } from "./validate.js";
import { normalizeAmazonUrl, normalizeUrlLite } from "./normalize.js";
import { buildEmbedTag } from "./template.js";
import { copyText } from "./clipboard.js";
import { isSupported as fsSupported, saveJsonToProducts } from "./fs_access.js";

export function renderEdit(root, state, file) {
  const item = state.cards.find(x => x.file === file);
  if (!item) {
    root.innerHTML = `<div>対象が見つかりません</div>`;
    return;
  }
  const data = structuredClone(item.data || {});
  root.innerHTML = buildFormHtml(file, data, [], false);
  wire(root, state, file, data);
}

export function renderNew(root, state) {
  const data = { title: "", imgUrl: "", imgWidth: 200, aUrl: "", yUrl: "", rUrl: "", btnStyle: "__three", desc: "" };
  const defaultFile = "new_item.json";
  root.innerHTML = buildFormHtml(
    defaultFile,
    data,
    [
      "※ ファイル名を入力して保存/ダウンロードしてください",
      "※ ローカル保存を使う場合は、画面上部で保存先フォルダを設定してください"
    ],
    true
  );
  wire(root, state, defaultFile, data);
}

function wire(root, state, file, data) {
  const form = root.querySelector("form");

  // preview assets (optional)
  root._previewCssUrls = state.manifest?.previewCss || [];
  root._previewJsUrls  = state.manifest?.previewJs  || [];

  const refresh = () => {
    readForm(form, data);
    updateErrors(root, data);
    updatePreviewWithCommon(root, data); // ← 確実に出る簡易版
  };

  form.addEventListener("input", refresh);

  root.querySelector("#btnNormalize").addEventListener("click", () => {
    readForm(form, data);
    data.aUrl = normalizeAmazonUrl(data.aUrl);
    data.yUrl = normalizeUrlLite(data.yUrl);
    data.rUrl = normalizeUrlLite(data.rUrl);
    writeForm(form, data);
    updateErrors(root, data);
    updatePreviewWithCommon(root, data);
  });

  root.querySelector("#btnCopyTag").addEventListener("click", async () => {
    const fname = currentFilename(root, file);
    const tag = buildEmbedTag(state.manifest.baseUrl, fname);
    const ok = await copyText(tag);
    flash(root.querySelector("#btnCopyTag"), ok ? "コピー済" : "失敗");
  });

  root.querySelector("#btnDownload").addEventListener("click", () => {
    readForm(form, data);
    const errs = validateKattene(data);
    if (errs.length) {
      alert("エラーがあります：\n- " + errs.join("\n- "));
      return;
    }
    const fname = currentFilename(root, file);
    downloadJson(fname, data);
  });

  const btnSaveLocal = root.querySelector("#btnSaveLocal");
  if (btnSaveLocal) {
    btnSaveLocal.addEventListener("click", async () => {
      if (!fsSupported()) {
        alert("このブラウザはローカル保存に未対応です（Chrome/Edge推奨）");
        return;
      }
      readForm(form, data);
      const errs = validateKattene(data);
      if (errs.length) {
        alert("エラーがあります：\n- " + errs.join("\n- "));
        return;
      }
      const fname = currentFilename(root, file);
      try {
        btnSaveLocal.disabled = true;
        btnSaveLocal.textContent = "保存中…";
        const saved = await saveJsonToProducts(fname, data);
        btnSaveLocal.textContent = "保存しました";
        setTimeout(() => (btnSaveLocal.textContent = "PCへ保存（products）"), 900);
        alert(`保存しました：${saved}\n\n次に update_manifest.ps1 を実行して manifest.json を更新してください。`);
      } catch (e) {
        alert("保存に失敗: " + (e?.message || e));
        btnSaveLocal.textContent = "PCへ保存（products）";
      } finally {
        btnSaveLocal.disabled = false;
      }
    });
  }

  root.querySelector("#btnBack").addEventListener("click", () => {
    location.hash = "#/";
  });

  // initial
  writeForm(form, data);
  updateErrors(root, data);
  updatePreviewWithCommon(root, data);
}

function currentFilename(root, fallbackFile) {
  let fname = fallbackFile;
  const fnEl = root.querySelector("#filename");
  if (fnEl) fname = (fnEl.value || "").trim() || fallbackFile;
  if (!fname.endsWith(".json")) fname += ".json";
  return fname;
}

function buildFormHtml(file, data, notes = [], isNew = false) {
  const noteHtml = notes.length
    ? `<div class="small">${notes.map(escapeHtml).join("<br>")}</div>`
    : "";

  const headerLeft = isNew
    ? `
      <div class="left">
        <label class="small">ファイル名（.json）</label>
        <input id="filename" value="${escapeAttr(file)}" placeholder="example.json" />
      </div>
    `
    : `
      <div class="left">
        <h2>${escapeHtml(file)}</h2>
      </div>
    `;

  return `
    <div class="edit-top">
      ${headerLeft}
      <div>
        <button type="button" id="btnBack">一覧へ戻る</button>
      </div>
    </div>

    ${noteHtml}
    <div id="errors" class="small"></div>

    <form class="form-grid">
      <div class="row-compact">
        <div>
          <label class="small">title</label><br>
          <input name="title" value="${escapeAttr(data.title || "")}" />
        </div>

        <div>
          <label class="small">btnStyle</label><br>
          <select name="btnStyle">
            ${["__one","__two","__three","__four","__five"].map(v =>
              `<option value="${v}" ${data.btnStyle===v ? "selected":""}>${v}</option>`
            ).join("")}
          </select>
        </div>

        <div>
          <label class="small">imgWidth</label><br>
          <input name="imgWidth" inputmode="numeric" value="${escapeAttr(data.imgWidth ?? 200)}" />
        </div>
      </div>

      <div class="row-1col">
        <label class="small">imgUrl</label><br>
        <input name="imgUrl" value="${escapeAttr(data.imgUrl || "")}" />
      </div>

      <div class="row-1col">
        <label class="small">aUrl（Amazon）</label><br>
        <input name="aUrl" value="${escapeAttr(data.aUrl || "")}" />
      </div>

      <div class="row-1col">
        <label class="small">yUrl（Yahoo）</label><br>
        <input name="yUrl" value="${escapeAttr(data.yUrl || "")}" />
      </div>

      <div class="row-1col">
        <label class="small">rUrl（楽天）</label><br>
        <input name="rUrl" value="${escapeAttr(data.rUrl || "")}" />
      </div>

      <div class="row-1col">
        <label class="small">desc</label><br>
        <textarea name="desc">${escapeHtml(data.desc || "")}</textarea>
      </div>
    </form>

    <div class="primary-actions">
      <button type="button" id="btnNormalize">URL正規化</button>
      <button type="button" id="btnCopyTag">埋め込みタグをコピー</button>
      <button type="button" id="btnDownload">JSONをダウンロード</button>
      <button type="button" id="btnSaveLocal">PCへ保存（products）</button>
    </div>

    <div class="preview-wrap" style="width: calc(66% - 346px);">
      <div class="preview-title">プレビュー</div>
      <iframe id="previewFrame" style="width:100%; height:260px; border:0;"></iframe>
    </div>
  `;
}

function readForm(form, data) {
  const fd = new FormData(form);
  for (const [k, v] of fd.entries()) {
    if (k === "imgWidth") data[k] = v === "" ? 200 : Number(v);
    else data[k] = String(v);
  }
}

function writeForm(form, data) {
  form.title.value = data.title || "";
  form.btnStyle.value = data.btnStyle || "__three";
  form.imgUrl.value = data.imgUrl || "";
  form.imgWidth.value = data.imgWidth ?? 200;
  form.aUrl.value = data.aUrl || "";
  form.yUrl.value = data.yUrl || "";
  form.rUrl.value = data.rUrl || "";
  form.desc.value = data.desc || "";
}

function updateErrors(root, data) {
  const errs = validateKattene(data);
  const el = root.querySelector("#errors");
  el.innerHTML = errs.length
    ? "エラー：<br>" + errs.map(e => `- ${escapeHtml(e)}`).join("<br>")
    : "OK";
}

function updatePreviewWithCommon(root, data) {
  const frame = root.querySelector("#previewFrame");
  if (!frame) return;

  const cssUrls = root._previewCssUrls || [];
  const jsUrls  = root._previewJsUrls  || [];

  // common.js が読む JSON（スキーマ通り）
  const previewJson = {
    title: String(data.title || ""),
    imgUrl: String(data.imgUrl || ""),
    imgWidth: Number(data.imgWidth || 200),
    aUrl: String(data.aUrl || ""),
    yUrl: String(data.yUrl || ""),
    rUrl: String(data.rUrl || ""),
    btnStyle: String(data.btnStyle || "__three"),
    desc: String(data.desc || "")
  };

  const cssLinks = cssUrls
    .map(u => `<link rel="stylesheet" href="${escapeAttr(u)}">`)
    .join("");

  // ★重要：script は “defer” で入れる（DOM構築後に走らせる）
  const jsLinks = jsUrls
    .map(u => `<script src="${escapeAttr(u)}" defer></script>`)
    .join("");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${cssLinks}
<style>
  body{ margin:12px; }
</style>
</head>
<body>

<!-- ブログと同じ埋め込みタグ構造 -->
<div class="kattene-parts" data-json="__preview__"></div>

<script>
  // preview JSON を iframe 内に保持
  window.__PREVIEW_JSON__ = ${JSON.stringify(previewJson).replace(/</g, "\\u003c")};

  // __preview__ だけをフックして JSON を返す
  const _fetch = window.fetch.bind(window);
  window.fetch = async function(url, opts){
    if(url === "__preview__"){
      return { ok:true, status:200, json: async () => window.__PREVIEW_JSON__ };
    }
    return _fetch(url, opts);
  };
</script>

${jsLinks}

</body>
</html>`;

  const doc = frame.contentDocument;
  doc.open();
  doc.write(html);
  doc.close();
}

function downloadJson(file, data) {
  const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file;
  a.click();
  URL.revokeObjectURL(a.href);
}

function flash(btn, text) {
  const old = btn.textContent;
  btn.textContent = text;
  setTimeout(() => (btn.textContent = old), 900);
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[m]));
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/`/g, "&#96;");
}