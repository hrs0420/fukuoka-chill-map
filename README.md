# fukuoka-chill-map

福岡のカフェ・サウナ・ランニングスポットを紹介するWebサイトです。

## 使用技術

- HTML
- CSS
- JavaScript（フレームワーク不使用 / LocalStorageでデータ保存）

## 実装済み機能

- カフェ・サウナ・ランニング共通の一覧ページ（検索・チェックボックス絞り込み・エリア絞り込み・並び替え）
- スポット詳細ページ（カフェ・サウナ・ランニング共通の1ページで、カテゴリごとに表示項目を出し分け）
- Googleマップ埋め込み表示
- 口コミ・評価投稿機能（LocalStorageに保存）
- お気に入り登録・一覧表示（LocalStorageに保存）
- トップページに高評価TOP3・新着口コミを表示
- スマホ対応レイアウト（ハンバーガーメニュー）

## ディレクトリ構成

```
fukuoka-chill-map/
├── .vscode/
├── css/
│   └── style.css
├── data/
│   ├── cafes.json
│   ├── running.json
│   └── saunas.json
├── images/            # 各スポット・ロゴ等の画像一式
├── js/
│   ├── categories.js
│   ├── detail.js
│   ├── favorites.js
│   ├── list.js
│   ├── script.js
│   └── utils.js
├── detail.html
├── favorites.html
├── index.html
├── list.html
├── README.md
├── robots.txt
└── sitemap.xml
```

### カテゴリ管理の仕組み

カフェ・サウナ・ランニングの「絞り込み項目」「並び替え候補」「検索対象」「データファイル名」などは、
すべて `js/categories.js` の `CATEGORY_CONFIG` にまとめて定義している。

一覧ページ（`list.html`）は `?category=cafe` のようにURLでカテゴリを受け取り、
`list.js` が `CATEGORY_CONFIG` の内容だけを見て検索欄・チェックボックス・並び替えUI・カードを動的生成する。
詳細ページ（`detail.html`）も同様に `?type=cafe` を受け取り、`detail.js` が該当カテゴリの項目だけを表示する。

**表示項目を追加・変更したいときは `js/categories.js` を編集するだけでよく、
`list.html` / `list.js` / `detail.html` を直接触る必要はない。**

## SEO対策

検索エンジン経由での流入を増やすため、以下の対策を実施している。

- `robots.txt`（クロール許可設定 / お気に入りページは除外）
- `sitemap.xml`（検索エンジンへのURL一覧の提供）
- 各ページの `title` / `meta description` の個別最適化
  - `index.html`：静的に設定
  - `list.html`：`list.js` がカテゴリごとに動的に設定
  - `detail.html`：`detail.js` がスポットごとに動的に設定
- OGP / Twitter Card 設定（SNSシェア時のカード表示対応）
- 構造化データ（JSON-LD）を `detail.html` に埋め込み（Googleにレビュー星評価等を認識させるため）
- `favorites.html` は `noindex` 設定（ユーザーごとにlocalStorageで内容が異なるため、検索結果には出さない）
- Google Search Console 登録・サイトマップ送信済み

### スポット（カフェ・サウナ・ランニング）を追加した時の注意

`cafes.json` / `saunas.json` / `running.json` にデータを追加しただけでは `sitemap.xml` は自動更新されない。
新しいスポットの詳細ページURLを `sitemap.xml` に手動で1行追加すること。

```xml
<url><loc>https://hrs0420.github.io/fukuoka-chill-map/detail.html?name=スポット名&type=カテゴリ</loc><priority>0.6</priority></url>
```

- `name=` の部分はURLエンコードが必要（ブラウザで該当ページを開き、アドレスバーのURLをそのままコピーするのが確実）
- XMLの仕様上 `&` は `&amp;` と書く必要がある
- 追加頻度が増えてきたら、Node.jsでの自動生成スクリプト導入を検討する

## 今後追加予定

- 検索条件をURLに反映（条件付きリンクの共有）
- 検索候補・オートコンプリート
- ページネーション / 表示件数の絞り込み
- 口コミ・お気に入りデータのサーバー保存化（現状はLocalStorageのみで端末依存）
