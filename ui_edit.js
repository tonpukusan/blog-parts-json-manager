// ui_edit.js (DIV preview version)
import { validateKattene } from "./validate.js";
import { normalizeAmazonUrl, normalizeUrlLite } from "./normalize.js";
import { buildEmbedTag } from "./template.js";
import { copyText } from "./clipboard.js";
import { isSupported as fsSupported, saveJsonToProducts } from "./fs_access.js";

// ★ 追加（common.jsから）

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
  const data = {
    title: "",
    imgUrl: "",
    imgWidth: 200,
    aUrl: "",
    yUrl: "",
    rUrl: "",
    btnStyle: "__three",
    desc: ""
  };
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

  const refresh = () => {
    readForm(form, data);
    updateErrors(root, data);
    updatePreviewWithCommon(root, data);
  };

  form.addEventListener("input", refresh);

  root.querySelector("#btnNormalize").addEventListener("click", () => {
    readForm(form, data);
    data.aUrl = normalizeAmazonUrl(data.aUrl);
    data.yUrl = normalizeUrlLite(data.yUrl);
    data.rUrl = normalizeUrlLite(data.rUrl);
    writeForm(form, data);
    updateErrors(root, data);
    updatePreview(root, data);
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
        setTimeout(() => {
          btnSaveLocal.textContent = "PCへ保存（products）";
        }, 900);

        alert(`保存しました：${saved}\n\n次に update_manifest.ps1 を実行してください。`);
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

  // 初期描画
  writeForm(form, data);
  updateErrors(root, data);
  updatePreviewWithCommon(root, data);
}

function updatePreviewWithCommon(root, data) {
  const el = root.querySelector("#previewArea");
  if (!el) return;

  console.log(data);
  const amazonUrl = generateAmazonAffiliateLink(data.aUrl, "yusatosh-22");
  const rakutenUrl = data.rUrl
    ? generateRakutenAffiliateUrl(data.rUrl)
    : "";

  el.innerHTML = insKattene(
    data.title,
    data.imgUrl,
    data.imgWidth,
    amazonUrl,
    data.yUrl || "",
    rakutenUrl,
    data.btnStyle || "__three",
    data.desc || ""
  );
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
        <input id="filename" value="${escapeAttr(file)}" />
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
          <input name="imgWidth" value="${escapeAttr(data.imgWidth ?? 200)}" />
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

    <div class="preview-wrap">
      <div class="preview-title">プレビュー</div>
      <div id="previewArea"></div>
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

function downloadJson(file, data) {
  const blob = new Blob(
    [JSON.stringify(data, null, 2) + "\n"],
    { type: "application/json;charset=utf-8" }
  );
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