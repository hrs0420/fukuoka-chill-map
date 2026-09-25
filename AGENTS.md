# AGENTS.md

このリポジトリで作業するAIエージェント向けのルールです。作業前に必ず README.md と合わせて読んでください。

## プロジェクト概要

- 福岡のカフェ・サウナ・ランニングスポットを紹介する静的サイト
- GitHub Pages で公開（URL: https://hrs0420.github.io/fukuoka-chill-map/ ）
- `main` ブランチへのマージがそのまま本番公開になる

## 技術的な制約

- HTML / CSS / JavaScript のみ。React などのフレームワーク、npm パッケージ、ビルドツールは導入しない
  - 例外: Issue で明示的に指示された場合の `scripts/` 配下の Node.js スクリプト（外部ライブラリなし）
- 外部スクリプトを追加するときは、バージョンを固定した URL を使う（`@latest` は使わない）
- サイトは `/fukuoka-chill-map/` 配下で公開されるため、パスは相対パスで書く
  - 良い例: `images/xxx.jpg`、`css/style.css`
  - 悪い例: `/images/xxx.jpg`（ルートからのパスは GitHub Pages で壊れる）

## コードのルール

- カテゴリごとの違いは `js/categories.js` の `CATEGORY_CONFIG` / `FIELD_CONFIG` で表現する

  - `list.js` などに `if (category === "cafe")` のような分岐を書かない
- `innerHTML` に外部データ（JSON、口コミ、URLパラメータなど）を入れるときは、必ず `escapeHTML()`（`js/utils.js`）を通す
- 共通の処理は `js/utils.js` にまとめ、同じ関数を複数のファイルに定義しない
- コメントは日本語で書く
- 新しいページを作るときは、index.html の （Google Fonts・favicon を含む）、ヘッダー、ナビメニュー（lucide アイコンを含む）、フッターをそのままコピーして使う
- 新しいページには必ず title、meta description、canonical を設定する
- HTML は既存ページと同じようにインデントして整形する（1行に詰め込まない）
- 新しいページには GA4 タグ（`index.html` の `<head>` にあるもの）を必ず入れる
- 新しいページを作るときは、index.html の `<head>`（Google Fonts・favicon を含む）、ヘッダー、ナビメニュー（lucide アイコンを含む）、フッターをそのままコピーして使う

## 変更してはいけないもの

- デザイン（色・フォント・レイアウト）は、Issue で指示された場合を除き変更しない
- LocalStorage のキー名（`favorites`、`saunaFavorites`、`runningFavorites`、`comments_*`）は変更しない
  - 変更すると、利用者が保存したお気に入りや口コミが消える
- `data/*.json` のスポット情報の中身（店名・住所・評価など）は、Issue で指示された場合を除き変更しない
- `images/` の画像は削除・リネームしない
- 画像は運営者が撮影したもの、または掲載許可を得たものだけを使う。インターネット上の画像を保存して使わない
- パスワード、APIキー、個人情報をコードや Issue、PR に書かない

## 作業の進め方

- 1つの PR では、Issue に書かれた内容だけを変更する。関係のないリファクタリングや整形はしない
- コミットメッセージと PR の説明は日本語で書く
- PR の説明には次を書く
  - 変更したファイルと、その理由
  - 動作確認の方法（どのページで何を確認すればよいか）
  - Issue の完了条件をどう満たしたか

## 動作確認

- 変更した JS ファイルは `node --check ファイル名` で構文エラーがないことを確認する
- JSON を変更したら、正しい JSON として読み込めることを確認する
- 次のページが壊れていないことを意識する
  - `index.html`（トップ）
  - `list.html?category=cafe` / `sauna` / `running`（一覧）
  - `detail.html?name=...&type=...`（詳細）
  - `favorites.html`（お気に入り）
