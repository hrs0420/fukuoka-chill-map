# Fukuoka Chill Map

福岡のカフェ・サウナ・ランニングスポットを、エリアや条件で探せるWebサイトです。

公開URL: https://hrs0420.github.io/fukuoka-chill-map/

## 使用技術

- HTML / CSS / JavaScript（フレームワーク・ビルドツールなし）
- ホスティング: GitHub Pages（`main` ブランチにpushすると自動で公開される。作業者は `main` に直接pushせず、ブランチで作業し、マージを経て公開する）
- 口コミ・お気に入り: ブラウザの LocalStorage に保存（その端末でのみ表示される）
- アイコン: lucide（0.460.0 に固定）

## 主な機能

- カテゴリごとの静的一覧ページ（キーワード検索・候補の自動表示・条件の絞り込み・エリア選択・並び替え）
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
│   ├── running.json    # ランニングスポットのデータ
│   ├── articles.json   # まとめ記事のデータ
│   ├── areas.json      # エリア名とURL用slug
│   ├── affiliates.json # アフィリエイト商品のデータ
│   └── generated/      # 自動生成されたデータ（検索用インデックス・画像情報）
├── docs/
│   ├── notes.md        # 作業メモ
│   └── status.md       # 運営状況レポート（自動生成）
├── images/             # ヘッダー・フッターの画像
│   ├── spots/          # 運営者撮影のスポット写真（{slug}.jpg）
│   └── placeholders/   # 写真がないスポット用の仮画像
├── js/
│   ├── categories.js   # カテゴリごとの設定（最重要）
│   ├── utils.js        # 全ページ共通の処理（データ読み込み・escapeHTML・メニュー）
│   ├── script.js       # トップページ
│   ├── list.js         # 一覧ページ
│   ├── detail.js       # 詳細ページ・口コミ
│   ├── favorites.js    # お気に入りページ
│   └── search.js       # 検索ページ
├── scripts/
│   ├── build.js        # 静的詳細HTML・sitemap.xml生成スクリプト
│   └── check.js        # データ・リンク・sitemapの品質チェック
├── spots/              # 自動生成された静的詳細・カテゴリ一覧HTML
├── articles/           # 自動生成された記事一覧・記事ページ
├── areas/              # 自動生成されたエリア一覧・エリアページ
├── index.html          # トップ
├── list.html           # 旧一覧URLから静的カテゴリ一覧への転送
├── detail.html         # 詳細（?name=スポット名&type=カテゴリ、旧URL用）
├── favorites.html      # お気に入り
├── request.html        # スポット追加依頼
├── search.html         # 検索
├── about.html          # 運営者情報
├── contact.html        # お問い合わせ
├── privacy.html        # プライバシーポリシー
├── 404.html            # ページが見つからないときの表示
├── AGENTS.md           # AIエージェント向けの作業ルール
├── CLAUDE.md           # Claude Code 用（AGENTS.md を読み込むだけ）
├── robots.txt
└── sitemap.xml
```

## カテゴリ設定の仕組み

カテゴリごとの違いは、すべて `js/categories.js` にまとめてある。

- `CATEGORY_CONFIG`: データファイル名、絞り込み項目、並び替えの選択肢、検索対象、お気に入りの保存キーなど
- `FIELD_CONFIG`: 詳細ページに表示する項目と、申請フォームの入力項目

`list.js` / `detail.js` / `favorites.js` はこの設定を読んで画面を組み立てるだけなので、
**項目を追加・変更するときは `categories.js` を編集すればよく、HTMLや他のJSを触る必要はない。**

## データの形式

スポットには任意項目 `checked` を追加できます。形式は `YYYY-MM`（例: `2026-10`）です。詳細ページには「情報確認日: 2026年10月」と表示されます。`checked` がない場合は `visited` を表示用の確認日として使います。

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

### アフィリエイト商品（`data/affiliates.json`）

商品ごとに `id`（識別子）、`name`（商品名）、`shop`（販売サイト名）、`url`（アフィリエイトリンク）、任意の `impression`（表示計測画像URL）、`status`（`using` / `used` / `interested`）、`comment`（紹介文）、`categories`（表示対象カテゴリ）、`spots`（表示対象スポットID）を設定する。カテゴリまたはスポットIDが一致した詳細ページに表示される。

### カテゴリ固有の項目

- **カフェ**: `wifi` / `outlet` / `parking`（true / false）、`hours`、`closed`、`payment`
- **サウナ**: `onsen` / `loyly` / `stay` / `parking`（true / false）、`hours`、`ikitai`（サウナイキタイのURL）
- **ランニング**: `distance`、`surface`、`lighted` / `locker` / `bathroom`（true / false）

## スポットを追加する手順

1. 該当カテゴリのJSON（`data/*.json`）に1件追加する（上の形式に合わせる。`slug` も含む）。新しいエリアの場合は `data/areas.json` にも追加する
2. 写真がある場合は `images/spots/{slug}.jpg` に置く（1枚500KB以下）。`image` は `images/placeholders/` の仮画像のままでよく、ビルド時に写真が自動で使われる
3. `node scripts/build.js` を実行し、スポット詳細ページ・カテゴリ一覧ページ・`sitemap.xml` を更新する
4. `node scripts/check.js` を実行し、成功することを確認する

## 記事を追加する手順

1. `data/articles.json` に記事オブジェクトを追加する。`slug`、`title`、`description`、`published`、`intro`、`sections` を設定し、必要なら `updated` と `outro` を追加する
2. 各 `sections` に `heading` と `body` を設定する。スポットカードを表示する場合は、該当スポットの `id` を `spot_id` に指定する
3. 下書きは `draft: true` にする。下書き記事は個別HTMLとsitemapに出力されない
4. `node scripts/build.js` を実行し、記事一覧・公開記事ページ・`sitemap.xml` を更新する

## エリアページ

`data/areas.json` に全エリアの `name` とURL用 `slug` を登録し、`node scripts/build.js` を実行すると `areas/index.html` と各エリアページを生成する。ビルド後の `node scripts/check.js` で、スポットの全エリアが登録されていることも確認する。

## 品質チェック

```bash
node scripts/check.js
```

`data/*.json` の形式とスポット情報、画像ファイル、アフィリエイトの参照先、HTML内の相対リンク、`sitemap.xml` の掲載URLを検査する。問題がある場合は内容を表示し、終了コード1で終了する。GitHub Actionsでもpushとpull requestのたびにビルドと品質チェックを実行する。

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

現在は[Googleフォーム](https://docs.google.com/forms/d/e/1FAIpQLScdJJ_ajw-hWmFZqTONkwXwVglNVS707i10w1HeZN0NlnFGFg/viewform)でスポット追加依頼を受け付けている。運営者が内容を確認し、実際に訪問したうえで掲載を検討する。写真の送付は受け付けず、掲載写真は運営者が撮影したものを使用する。

以前はFlask + SQLiteのバックエンドで申請を受け付けていたが、現在はGoogleフォームに切り替えている。バックエンドのコードはこのリポジトリから外して別途保管している。

## 今後の予定

- スポット数の拡充と紹介文の充実
- 記事コンテンツとアフィリエイト商品の追加
