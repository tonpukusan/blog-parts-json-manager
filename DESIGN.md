# JSONメンテナンスWebアプリ（MVP）設計概要

目的：blog-parts用JSONを安全・効率的に管理する。

構成モジュール:
app.js: 起動とルーティング
data_loader.js: JSON読込
ui_list.js: 一覧UI
ui_edit.js: 編集UI
normalize.js: URL正規化
validate.js: 入力検証
template.js: 埋め込みタグ生成
clipboard.js: コピー処理
