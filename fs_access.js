// fs_access.js
// File System Access API を使って、選択した products フォルダにJSONを直接保存する。
// Chrome/Edge向け。GitHub PagesでもOK（ユーザー操作トリガーは必須）。

const DB_NAME = "json-tool-fs";
const STORE = "handles";
const KEY_PRODUCTS_DIR = "productsDirHandle";

function isSupported() {
  return !!window.showDirectoryPicker;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const st = tx.objectStore(STORE);
    const req = st.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbSet(key, val) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const st = tx.objectStore(STORE);
    const req = st.put(val, key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbDel(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const st = tx.objectStore(STORE);
    const req = st.delete(key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function getProductsDirHandle() {
  if (!isSupported()) return null;
  return await idbGet(KEY_PRODUCTS_DIR);
}

async function pickProductsDir() {
  if (!isSupported()) throw new Error("File System Access API is not supported.");
  const handle = await window.showDirectoryPicker({
    id: "json-tool-products-dir",
    mode: "readwrite"
  });
  await idbSet(KEY_PRODUCTS_DIR, handle);
  return handle;
}

async function ensurePermission(dirHandle) {
  if (!dirHandle) return false;
  // 既に許可されているか？
  let perm = await dirHandle.queryPermission({ mode: "readwrite" });
  if (perm === "granted") return true;
  perm = await dirHandle.requestPermission({ mode: "readwrite" });
  return perm === "granted";
}

function sanitizeFilename(name) {
  let n = String(name || "").trim();
  if (!n) n = "new_item.json";
  if (!n.endsWith(".json")) n += ".json";
  // Windowsで危険な文字を置換（最低限）
  n = n.replace(/[\\/:*?"<>|]/g, "_");
  return n;
}

async function saveJsonToProducts(filename, obj) {
  if (!isSupported()) throw new Error("This browser does not support File System Access API.");

  const dir = await getProductsDirHandle();
  if (!dir) throw new Error("保存先フォルダが未設定です。まず「保存先フォルダを設定」を実行してください。");

  const ok = await ensurePermission(dir);
  if (!ok) throw new Error("フォルダへの書き込み権限がありません。");

  const fname = sanitizeFilename(filename);
  const fileHandle = await dir.getFileHandle(fname, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(new Blob([JSON.stringify(obj, null, 2) + "\n"], { type: "application/json;charset=utf-8" }));
  await writable.close();

  return fname;
}

async function clearProductsDirSetting() {
  await idbDel(KEY_PRODUCTS_DIR);
}

export {
  isSupported,
  getProductsDirHandle,
  pickProductsDir,
  saveJsonToProducts,
  clearProductsDirSetting
};
