import { validateKattene } from "./validate.js";
import { normalizeAmazonUrl, normalizeUrlLite } from "./normalize.js";
import { buildEmbedTag } from "./template.js";
import { copyText } from "./clipboard.js";

export function renderEdit(root, state, file) {
  const item = state.cards.find(x => x.file === file);
  if (!item) {
    root.innerHTML = `<p style="color:#b00020">対象が見つかりません</p>`;
    return;
  }
  const data = structuredClone(item.data || {});
  root.innerHTML = buildFormHtml(file, data, [], false);
  wire(root, state, file, data, false);
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
  root.innerHTML = buildFormHtml(defaultFile, data, [
    "※ ファイル名を入力してから JSON をダウンロードしてください",
    "※ 保存後、manifest.json に追記してください"
  ], true);

  wire(root, state, defaultFile, data, true);
}

function wire(root, state, file, data, isNew) {
  const form = root.querySelector("form");

  form.addEventListener("input", () => {
    readForm(form, data);
    updateErrors(root, data);
  });

  root.querySelector("#btnNormalize").addEventListener("click", () => {
    readForm(form, data);
    data.aUrl = normalizeAmazonUrl(data.aUrl);
    data.yUrl = normalizeUrlLite(data.yUrl);
    data.rUrl = normalizeUrlLite(data.rUrl);
    writeForm(form, data);
    updateErrors(root, data);
  });

  root.querySelector("#btnCopyTag").addEventListener("click", async () => {
    let fname = file;
    const fnEl = root.querySelector("#filename");
    if (fnEl) {
      fname = (fnEl.value || "").trim() || file;
      if (!fname.endsWith(".json")) fname += ".json";
    }
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

    let fname = file;
    const fnEl = root.querySelector("#filename");
    if (fnEl) {
      fname = (fnEl.value || "").trim() || file;
      if (!fname.endsWith(".json")) fname += ".json";
    }

    downloadJson(fname, data);
  });

  root.querySelector("#btnBack").addEventListener("click", () => {
    location.hash = "#/";
  });

  updateErrors(root, data);
}

function buildFormHtml(file, data, notes = [], isNew = false) {
  const noteHtml = notes.length
    ? `<p style="color:#666;font-size:12px;">${notes.map(escapeHtml).join("<br>")}</p>`
    : "";

  const headerLeft = isNew ? `
    <div style="flex:1;">
      <label style="display:block; font-size:12px; color:#666;">ファイル名（.json）</label>
      <input id="filename" value="${escapeAttr(file)}" style="width:100%;padding:8px;">
    </div>
  ` : `<h2 style="margin:0;">${escapeHtml(file)}</h2>`;

  return `
    <div style="display:flex; justify-content:space-between; align-items:flex-end; gap:12px;">
      ${headerLeft}
      <a href="#/">一覧へ</a>
    </div>

    ${noteHtml}

    <form>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:10px;">
        <div>
          <label>title</label>
          <input name="title" value="${escapeAttr(data.title || "")}" style="width:100%;padding:8px;">
        </div>

        <div>
          <label>btnStyle</label>
          <select name="btnStyle" style="width:100%;padding:8px;">
            ${["__one","__two","__three","__four","__five"]
              .map(v => `<option value="${v}" ${data.btnStyle === v ? "selected" : ""}>${v}</option>`)
              .join("")}
          </select>
        </div>

        <div>
          <label>imgUrl</label>
          <input name="imgUrl" value="${escapeAttr(data.imgUrl || "")}" style="width:100%;padding:8px;">
        </div>

        <div>
          <label>imgWidth</label>
          <input name="imgWidth" type="number" value="${escapeAttr(data.imgWidth ?? 200)}" style="width:100%;padding:8px;">
        </div>

        <div>
          <label>aUrl（Amazon）</label>
          <input name="aUrl" value="${escapeAttr(data.aUrl || "")}" style="width:100%;padding:8px;">
        </div>

        <div>
          <label>yUrl（Yahoo）</label>
          <input name="yUrl" value="${escapeAttr(data.yUrl || "")}" style="width:100%;padding:8px;">
        </div>

        <div>
          <label>rUrl（楽天）</label>
          <input name="rUrl" value="${escapeAttr(data.rUrl || "")}" style="width:100%;padding:8px;">
        </div>

        <div>
          <label>desc</label>
          <textarea name="desc" rows="4" style="width:100%;padding:8px;">${escapeHtml(data.desc || "")}</textarea>
        </div>
      </div>

      <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <button type="button" id="btnNormalize">URL正規化</button>
        <button type="button" id="btnCopyTag">埋め込みタグをコピー</button>
        <button type="button" id="btnDownload">JSONをダウンロード</button>
        <button type="button" id="btnBack">戻る</button>
      </div>

      <div id="errors" style="margin-top:10px;"></div>
    </form>
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
    ? `<div style="color:#b00020;font-size:12px;">` + errs.map(e => `- ${escapeHtml(e)}`).join("<br>") + `</div>`
    : `<div style="color:#666;font-size:12px;">OK</div>`;
}

function downloadJson(file, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
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
    "'": "&#39;"
  }[m]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/`/g, "&#96;"); }
