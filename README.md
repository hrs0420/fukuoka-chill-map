# fukuoka-chill-map

福岡のカフェ・サウナ・ランニングスポットを紹介するWebサイトです。

## 使用技術

**フロントエンド**

- HTML / CSS / JavaScript（フレームワーク不使用）
- 口コミ・お気に入りはLocalStorageで保存

**バックエンド（スポット追加依頼機能）**

- Python / Flask
- SQLite
- SMTP（Gmail）によるメール通知

## 実装済み機能

- カフェ・サウナ・ランニング共通の一覧ページ（検索・チェックボックス絞り込み・エリア絞り込み・並び替え）
- 検索候補のオートコンプリート表示
- スポット詳細ページ（カフェ・サウナ・ランニング共通の1ページで、カテゴリごとに表示項目を出し分け）
- Googleマップ埋め込み表示
- 口コミ・評価投稿機能（LocalStorageに保存）
- お気に入り登録・一覧表示（LocalStorageに保存）
- トップページに高評価TOP3・新着口コミを表示
- スマホ対応レイアウト（ハンバーガーメニュー）
- スポット追加依頼フォーム（画像アップロード対応）
- 管理者による依頼の確認・編集・承認・却下機能
- 承認済みスポットの自動公開（既存の静的JSONデータと合体して表示）
- 新規依頼受信時の管理者へのメール通知
- 管理者モードでの口コミ一括管理（トップページで全件表示・削除）

## ディレクトリ構成

```
fukuoka-chill-map/
├── .vscode/
├── backend/
│   ├── app.py
│   └── requirements.txt
├── css/
│   └── style.css
├── data/
│   ├── cafes.json
│   ├── running.json
│   └── saunas.json
├── images/            # 各スポット・ロゴ等の画像一式
├── js/
│   ├── admin.js
│   ├── categories.js
│   ├── detail.js
│   ├── favorites.js
│   ├── list.js
│   ├── request.js
│   ├── script.js
│   └── utils.js
├── admin.html
├── detail.html
├── favorites.html
├── index.html
├── list.html
├── request.html
├── README.md
├── robots.txt
└── sitemap.xml
```

### カテゴリ管理の仕組み

カフェ・サウナ・ランニングの「絞り込み項目」「並び替え候補」「検索対象」「データファイル名」「詳細表示項目」などは、
すべて `js/categories.js` の `CATEGORY_CONFIG` / `FIELD_CONFIG` にまとめて定義している。

一覧ページ（`list.html`）は `?category=cafe` のようにURLでカテゴリを受け取り、
`list.js` が `CATEGORY_CONFIG` の内容だけを見て検索欄・チェックボックス・並び替えUI・カードを動的生成する。
詳細ページ（`detail.html`）も同様に `?type=cafe` を受け取り、`detail.js` が該当カテゴリの項目だけを表示する。
申請フォーム（`request.html`）もこの `FIELD_CONFIG` を参照してカテゴリごとの入力項目を動的に出し分けている。

**表示項目を追加・変更したいときは `js/categories.js` を編集するだけでよく、
`list.html` / `list.js` / `detail.html` / `request.html` を直接触る必要はない。**

## スポット追加依頼機能について

訪問者が「このスポットを掲載してほしい」と申請できる機能。申請されたデータは管理者の承認を経てはじめて、他の訪問者にも公開される。

### 全体の流れ

```
[訪問者] request.html で申請フォームに入力・画像アップロード
        ↓ POST /api/submissions
[Flask + SQLite] status: pending として保存 → 管理者へメール通知
        ↓
[管理者] admin.html で内容確認・加筆修正 → 承認 or 却下
        ↓ status: approved
[全訪問者] list.html / index.html などが
          既存の静的JSON + 承認済み投稿データを合体して表示
```

### 管理者モードへの入り方

1. フッターの「© 2026 Fukuoka Chill Map」を5回連続クリック
2. パスワードを入力（`js/utils.js` の `ADMIN_PASSWORD` と、`js/admin.js` の `ADMIN_PASSWORD_FOR_GATE` は必ず同じ値にすること）
3. ハンバーガーメニューに「🛠 管理者ページ」が出現し、admin.htmlへアクセス可能になる

### バックエンドの起動方法（ローカル開発）

```bash
cd backend
pip install -r requirements.txt
python app.py
```

`http://127.0.0.1:5000` でAPIが起動する。`js/utils.js` の `API_BASE_URL` がこのURLを指すように設定してある。

### メール通知の設定

管理者への通知メールを送るには、起動前に環境変数を設定する必要がある（Gmailの場合、通常のパスワードではなく「アプリパスワード」の発行が必要）。

```bash
export MAIL_USERNAME="送信元Gmailアドレス"
export MAIL_PASSWORD="発行した16桁のアプリパスワード"
export MAIL_TO="通知を受け取りたいアドレス"
```

未設定の場合も動作はするが、通知メールの送信だけがスキップされる（申請自体は問題なく保存される）。

### データの保存場所についての注意

DBファイル（`spots.db`）とアップロード画像は、**プロジェクトフォルダの外**（ユーザーのホームディレクトリ配下の `.fukuoka_chill_map_data/`）に保存される。これはVSCode Live Serverがプロジェクト内のファイル変更を検知して自動リロードしてしまい、フォーム送信直後にポップアップが消えてしまう不具合を避けるための対応。

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
- `favorites.html` / `admin.html` は `noindex` 設定（人によって内容が異なる、または非公開ページのため検索結果には出さない）
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
- なお、バックエンド経由で承認されたスポットは動的に取得されるURLのため、現時点ではsitemap.xmlには含めていない

## 今後追加予定

- ページネーション / 表示件数の絞り込み
- バックエンドの本番デプロイ（Render等）と、実際の一般公開
- 画像ストレージのクラウド化（現状はローカルファイル保存のため、本番ホスティング先によってはファイルが永続化されない）
- 口コミ・お気に入りデータのサーバー保存化（現状はLocalStorageのみで端末依

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
