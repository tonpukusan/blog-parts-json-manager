import { loadManifest, loadCardsProgressive } from "./data_loader.js";
import { renderList } from "./ui_list.js";
import { renderEdit, renderNew } from "./ui_edit.js";

const state = {
  manifest: null,
  cards: [],
  q: "",

  // Progressive load status (optional)
  loading: false,
  loaded: 0,
  total: 0
};

const appEl = document.getElementById("app");

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

async function boot() {
  state.loading = true;

  // ルーティングは先に有効化（manifest取得中でも「新規」等に移動できる）
  window.addEventListener("hashchange", route);

  // まずUIを出す（0件でも表示できるように）
  route();

  state.manifest = await loadManifest("manifest.json");
  state.total = (state.manifest.files || []).length;

  // 取得できた分から追加していく
  await loadCardsProgressive(
    state.manifest,
    (batch) => {
      state.cards.push(...batch);
      state.loaded = state.cards.length;

      // ui_list.js が brand cache を持つ場合に備えてリセット
      state._brandCacheReady = false;

      // 一覧画面を見ている時だけ再描画（編集画面を邪魔しない）
      if (isListRoute()) route();
    },
    { concurrency: 6, batchSize: 20 }
  );

  state.loading = false;

  // 最終状態を反映（一覧にいる場合）
  if (isListRoute()) route();
}

boot().catch(err => {
  console.error(err);
  appEl.innerHTML = `<p style="color:#b00020">初期化に失敗しました。Consoleを確認してください。</p>`;
});
