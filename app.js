import { loadManifest, loadCardsProgressive } from "./data_loader.js";
import { renderList } from "./ui_list.js";
import { renderEdit, renderNew } from "./ui_edit.js";

import {
  isSupported as fsSupported,
  getProductsDirHandle,
  pickProductsDir,
  clearProductsDirSetting
} from "./fs_access.js";

const state = {
  manifest: null,
  cards: [],
  loading: false,
  loaded: 0,
  total: 0
};

const appEl = document.getElementById("app");
const fsBarEl = document.getElementById("fsbar");

function route() {
  const hash = location.hash || "#/";
  const [path, qs] = hash.slice(1).split("?");
  const params = new URLSearchParams(qs || "");

  if (path === "/" || path === "") {
    renderList(appEl, state);
    return;
  }
  if (path === "/edit") {
    const file = params.get("file");
    renderEdit(appEl, state, file);
    return;
  }
  if (path === "/new") {
    renderNew(appEl, state);
    return;
  }

  appEl.innerHTML = `<p>Not found</p>`;
}

function isListRoute() {
  const hash = location.hash || "#/";
  const [path] = hash.slice(1).split("?");
  return path === "/" || path === "";
}

async function renderFsBar() {
  if (!fsBarEl) return;

  if (!fsSupported()) {
    fsBarEl.innerHTML = `
      <div style="color:#666;">
        ローカル保存：このブラウザは未対応です（Chrome/Edge推奨）
      </div>
    `;
    return;
  }

  const handle = await getProductsDirHandle();
  const status = handle ? "設定済み" : "未設定";

  fsBarEl.innerHTML = `
    <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
      <div>ローカル保存（products）：<b>${status}</b></div>
      <button id="btnPickDir" style="padding:6px 10px;">保存先フォルダを設定</button>
      <button id="btnClearDir" style="padding:6px 10px;">設定解除</button>
      <div style="color:#666;">※初回だけ C:\\Repo\\blog-parts\\products を選択</div>
    </div>
  `;

  fsBarEl.querySelector("#btnPickDir").addEventListener("click", async () => {
    try {
      await pickProductsDir();
      await renderFsBar();
      alert("保存先フォルダを設定しました。以後は新規/編集画面の「PCへ保存」が使えます。");
    } catch (e) {
      alert("フォルダ設定に失敗: " + (e?.message || e));
    }
  });

  fsBarEl.querySelector("#btnClearDir").addEventListener("click", async () => {
    await clearProductsDirSetting();
    await renderFsBar();
  });
}

async function boot() {
  state.loading = true;

  window.addEventListener("hashchange", route);

  // 先にUIを出す
  route();
  await renderFsBar();

  // manifest → progressive load
  state.manifest = await loadManifest("manifest.json");
  state.total = (state.manifest.files || []).length;

  await loadCardsProgressive(
    state.manifest,
    (batch) => {
      state.cards.push(...batch);
      state.loaded = state.cards.length;

      // ui_list がキャッシュ持つ場合に備えて
      state._brandCacheReady = false;

      if (isListRoute()) route();
    },
    { concurrency: 6, batchSize: 20 }
  );

  state.loading = false;
  if (isListRoute()) route();
}

boot().catch(err => {
  console.error(err);
  appEl.innerHTML = `<p style="color:#b00020">初期化に失敗しました。Consoleを確認してください。</p>`;
});
