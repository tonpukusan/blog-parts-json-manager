import { buildEmbedTag } from "./template.js";
import { copyText } from "./clipboard.js";

export function renderList(root, state) {
  const q = state.q || "";
  const filtered = state.cards.filter(x => {
    const t = (x.data?.title || "") + " " + x.file + " " + (x.data?.desc || "");
    return t.toLowerCase().includes(q.toLowerCase());
  });

  root.innerHTML = `
    <div style="display:flex; gap:12px; align-items:center; margin-bottom:12px;">
      <input id="q" placeholder="検索（title / desc / ファイル名）" value="${escapeHtml(q)}" style="flex:1; padding:8px;">
      <a href="#/new">新規</a>
    </div>
    <div style="color:#666; font-size:12px; margin-bottom:10px;">件数：${filtered.length} / ${state.cards.length}</div>
    <div id="list"></div>
  `;

  root.querySelector("#q").addEventListener("input", (e) => {
    state.q = e.target.value;
    renderList(root, state);
  });

  const listEl = root.querySelector("#list");
  listEl.innerHTML = filtered.map(x => rowHtml(x)).join("");

  listEl.querySelectorAll("[data-act]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const act = btn.dataset.act;
      const file = btn.dataset.file;

      if (act === "copy") {
        const tag = buildEmbedTag(state.manifest.baseUrl, file);
        const ok = await copyText(tag);
        btn.textContent = ok ? "コピー済" : "失敗";
        setTimeout(() => (btn.textContent = "タグコピー"), 900);
      } else if (act === "edit") {
        location.hash = `#/edit?file=${encodeURIComponent(file)}`;
      }
    });
  });
}

function rowHtml(x) {
  const title = x.data?.title || "(タイトル未設定)";
  const img = x.data?.imgUrl || "";
  const url = x.data?.aUrl || "";
  const err = x.data?._error ? `<div style="color:#b00020;font-size:12px;">取得失敗: ${escapeHtml(x.data._error)}</div>` : "";

  return `
    <div style="display:flex; gap:12px; align-items:center; padding:10px; border:1px solid #eee; border-radius:8px; margin-bottom:10px;">
      <div style="width:56px;height:56px;border-radius:6px;background:#f5f5f5 center/cover no-repeat; background-image:url('${escapeAttr(img)}')"></div>
      <div style="flex:1;">
        <div style="font-weight:600;">${escapeHtml(title)}</div>
        <div style="font-size:12px;color:#666;">${escapeHtml(x.file)}</div>
        <div style="font-size:12px;color:#666; word-break:break-all;">${escapeHtml(url)}</div>
        ${err}
      </div>
      <div style="display:flex; gap:8px;">
        <button data-act="copy" data-file="${escapeAttr(x.file)}">タグコピー</button>
        <button data-act="edit" data-file="${escapeAttr(x.file)}">編集</button>
      </div>
    </div>
  `;
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function escapeAttr(s){ return escapeHtml(s).replace(/`/g,"&#96;"); }
