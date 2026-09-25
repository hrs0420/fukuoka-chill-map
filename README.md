# Fukuoka Chill Map

福岡のカフェ・サウナ・ランニングスポットを、エリアや条件で探せるWebサイトです。

公開URL: https://hrs0420.github.io/fukuoka-chill-map/

## 使用技術

- HTML / CSS / JavaScript（フレームワーク・ビルドツールなし）
- ホスティング: GitHub Pages（`main` ブランチにpushすると自動で公開される）
- 口コミ・お気に入り: ブラウザの LocalStorage に保存（その端末でのみ表示される）
- アイコン: lucide（0.460.0 に固定）

## 主な機能

- カテゴリ共通の一覧ページ（キーワード検索・候補の自動表示・条件の絞り込み・エリア選択・並び替え）
- 検索条件をURLに反映（条件付きのページをそのまま共有できる）
- カテゴリ共通の詳細ページ（カテゴリごとに表示項目を出し分け、Googleマップ埋め込み）
- 口コミ・評価の投稿と削除
- お気に入り登録と一覧表示
- トップページに全カテゴリの高評価TOP3と新着口コミを表示
- スマホ対応（ハンバーガーメニュー）

## ディレクトリ構成

```
fukuoka-chill-map/
├── css/
│   └── style.css
├── data/
│   ├── cafes.json      # カフェのデータ
│   ├── saunas.json     # サウナのデータ
│   └── running.json    # ランニングスポットのデータ
├── images/             # スポット写真・ロゴ
├── js/
│   ├── categories.js   # カテゴリごとの設定（最重要）
│   ├── utils.js        # 全ページ共通の処理（データ読み込み・escapeHTML・メニュー）
│   ├── script.js       # トップページ
│   ├── list.js         # 一覧ページ
│   ├── detail.js       # 詳細ページ・口コミ
│   ├── favorites.js    # お気に入りページ
│   └── request.js      # スポット追加依頼ページ（現在は受付停止中）
├── scripts/
│   └── build.js        # 静的詳細HTML・sitemap.xml生成スクリプト
├── spots/              # 自動生成された各スポットの静的HTML
├── index.html          # トップ
├── list.html           # 一覧（?category=cafe / sauna / running）
├── detail.html         # 詳細（?name=スポット名&type=カテゴリ、旧URL用）
├── favorites.html      # お気に入り
├── request.html        # スポット追加依頼
├── robots.txt
└── sitemap.xml
```

## カテゴリ設定の仕組み

カテゴリごとの違いは、すべて `js/categories.js` にまとめてある。

- `CATEGORY_CONFIG`: データファイル名、絞り込み項目、並び替えの選択肢、検索対象、お気に入りの保存キーなど
- `FIELD_CONFIG`: 詳細ページに表示する項目と、申請フォームの入力項目

`list.js` / `detail.js` / `favorites.js` / `request.js` はこの設定を読んで画面を組み立てるだけなので、
**項目を追加・変更するときは `categories.js` を編集すればよく、HTMLや他のJSを触る必要はない。**

## データの形式

### 共通項目

| 項目            | 型     | 内容                                   |
| --------------- | ------ | -------------------------------------- |
| `id`          | 文字列 | スポットの識別子（例:`sauna_1`）     |
| `slug`        | 文字列 | URL用の識別子（例:`wellbe-fukuoka`） |
| `name`        | 文字列 | スポット名                             |
| `area`        | 文字列 | エリア名（一覧のエリア選択に使われる） |
| `rating`      | 数値   | 評価（1.0〜5.0）                       |
| `description` | 文字列 | 紹介文                                 |
| `body`        | 文字列 | 詳細ページに表示する長い紹介文（段落は空行で区切る。省略時は `description` を表示） |
| `visited`     | 文字列 | 訪問時期（例: `2026年4月`。詳細ページの紹介文の上に表示） |
| `image`       | 文字列 | 画像パス（例:`images/xxx.jpg`）      |
| `address`     | 文字列 | 住所                                   |
| `map`         | 文字列 | GoogleマップのURL                      |

### カテゴリ固有の項目

- **カフェ**: `wifi` / `outlet` / `parking`（true / false）、`hours`、`closed`、`payment`
- **サウナ**: `onsen` / `loyly` / `stay` / `parking`（true / false）、`hours`、`ikitai`（サウナイキタイのURL）
- **ランニング**: `distance`、`surface`、`lighted` / `locker` / `bathroom`（true / false）

## スポットを追加する手順

1. `images/` に写真を追加する
2. 該当カテゴリのJSON（`data/*.json`）に1件追加する（上の形式に合わせる。`slug` も含む）
3. `node scripts/build.js` を実行し、静的HTMLおよび `sitemap.xml` を更新する

## ローカルでの確認方法

VS Code の拡張機能「Live Server」で `index.html` を開く。
JSONを `fetch` で読み込んでいるため、HTMLファイルをダブルクリックで直接開くとデータが表示されない。

## 開発ルール

- `innerHTML` に外部データ（JSON・口コミなど）を入れるときは、必ず `escapeHTML()`（`utils.js`）を通す
- カテゴリ固有の処理は `categories.js` の設定で表現し、`list.js` などに `if (category === "cafe")` のような分岐を書かない
- 公開前に Live Server で一覧・詳細・お気に入りの表示を確認する

## SEO対策

- `robots.txt` と `sitemap.xml` を設置し、Google Search Console に登録済み
- ページごとの `title` / `meta description` / canonical / OGP を設定
- 各スポットごとに静的HTML（`spots/{category}/{slug}.html`）を自動生成し、検索エンジンでのインデックスを最適化
- 詳細ページに構造化データ（JSON-LD）を出力（評価はサイト編集部のレビューとして記載）
- `favorites.html` は `noindex`

## スポット追加依頼機能について

以前は Flask + SQLite のバックエンドで申請を受け付けていたが、本番運用のコストとセキュリティ面を考慮し、現在は受付を停止している。
`js/utils.js` の `API_BASE_URL` が空文字のあいだは、バックエンドへの通信は一切行わず、`request.html` には受付停止の案内だけが表示される。
バックエンドのコードはこのリポジトリから外して別途保管している。

## 今後の予定

- プライバシーポリシー・運営者情報・お問い合わせページの追加
- スポット数の拡充と紹介文の充実
- アフィリエイト導線と記事コンテンツの追加
- スポット追加依頼の再開（外部フォームを利用予定）
