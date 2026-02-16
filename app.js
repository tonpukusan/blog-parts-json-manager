import { loadManifest, loadAllCards } from "./data_loader.js";
import { renderList } from "./ui_list.js";
import { renderEdit, renderNew } from "./ui_edit.js";

const state = {
  manifest: null,
  cards: [],
  q: ""
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

async function boot() {
  state.manifest = await loadManifest("manifest.json");
  state.cards = await loadAllCards(state.manifest);
  window.addEventListener("hashchange", route);
  route();
}

boot().catch(err => {
  console.error(err);
  appEl.innerHTML = `<p style="color:#b00020">初期化に失敗しました。Consoleを確認してください。</p>`;
});
