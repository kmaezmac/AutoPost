# AutoPost

WordPress と Pinterest に楽天アフィリエイト・Amazon アソシエイトの商品記事を自動投稿するツール。

---

## エンドポイント一覧

| メソッド | パス | 内容 |
|---|---|---|
| POST | `/api/wordpress-rakuten` | 楽天商品 → WordPress記事 |
| POST | `/api/wordpress-amazon` | Amazon商品 → WordPress記事 |
| POST | `/api/pinterest-rakuten` | 楽天商品 → Pinterest Pin |
| POST | `/api/pinterest-amazon` | Amazon商品 → Pinterest Pin |

---

## セットアップ

```bash
cp .env.example .env
npm install
npm start
```

---

## 環境変数の取得方法

### OpenAI API

1. https://platform.openai.com/api-keys にアクセス
2. 「Create new secret key」でキーを発行
3. `OPENAI_API_KEY` に設定
4. `OPENAI_MODEL` は `gpt-4o-mini`（安価）または `gpt-4o` を指定

---

### 楽天アフィリエイト

#### 1. 楽天アフィリエイト登録

1. https://affiliate.rakuten.co.jp/ にアクセスして会員登録
2. 審査通過後、マイページ → 「ツール取得」→「リンク作成」で `RAKUTEN_AFFILIATE_ID` を確認

#### 2. 楽天 Web サービス（API）登録

1. https://webservice.rakuten.co.jp/ でアプリ登録（無料）
2. 「アプリ ID / デベロッパー ID」= `RAKUTEN_APP_ID`
3. 「アクセスキー」= `RAKUTEN_APP_ACCESS_KEY`

#### 注意（規約）

- 商品紹介にはアフィリエイトリンクであることの開示が必要（コード内に実装済み）
- 楽天の商品画像をそのまま第三者サーバーに保存することは原則禁止（本ツールは URL をそのまま参照するため問題なし）

---

### Amazon アソシエイト（Creators API）

#### 1. Amazon アソシエイト登録

1. https://affiliate.amazon.co.jp/ でアソシエイト登録（審査あり）
2. 審査通過後、「アカウント設定」→「トラッキング ID」を確認 = `AMAZON_PARTNER_TAG`

#### 2. Creators API 利用申請

本ツールは xbot と同様に **Amazon Creators API** を使用します。

1. Amazon アソシエイト承認後、Creator アカウントを https://creatorcentral.amazon.co.jp/ で作成
2. Creators API のクライアント ID・シークレットは Creator Central のダッシュボード → 「API 設定」から取得
3. `AMAZON_CLIENT_ID` / `AMAZON_CLIENT_SECRET` に設定

> **代替手段（PA API 5.0）**  
> Creator Central にアクセスできない場合、Amazon Product Advertising API（PA API）を使う方法もあります。  
> PA API は https://affiliate.amazon.co.jp/assoc_credentials/home から「アクセスキー」「シークレットキー」を発行できます。  
> ただし PA API は署名（AWS Signature V4）が必要で実装が複雑なため、本ツールでは Creators API を採用しています。

#### 注意（規約）

- 記事に「Amazonのアソシエイトとして、当ブログは適格販売により収入を得ています。」の開示文が必須（コード内に実装済み）
- 商品リンクは `amazon.co.jp/dp/{ASIN}?tag={PARTNER_TAG}` 形式を使用（実装済み）
- 価格の直接表示は規約違反になる場合があるため、本ツールでは価格を取得・表示しません

---

### WordPress

#### 1. アプリケーションパスワードの発行

1. WordPress 管理画面 → **ユーザー** → **プロフィール編集**
2. 下部の「アプリケーションパスワード」セクションへスクロール
3. 任意の名前（例: `AutoPost`）を入力して「新しいアプリケーションパスワードを追加」
4. 表示されたパスワード（スペース区切り）を `WP_APP_PASSWORD` にそのままコピー
5. `WP_USERNAME` は WordPress のログインユーザー名

> WordPress 5.6 以上かつ REST API が有効になっている必要があります。  
> プラグインで REST API を無効化している場合は設定を見直してください。

#### 2. 環境変数

```
WP_SITE_URL=https://your-site.com   # 末尾スラッシュなし
WP_USERNAME=admin
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
```

#### SEO について

記事は OpenAI が以下の構造で生成します：

- `<h2>` 〜 `<h3>` を使ったアウトライン構造
- 800〜1200字（検索エンジンが評価しやすい文字数）
- アフィリエイト開示文（`rel="nofollow noopener"` 付きリンク）
- WordPress タグ（5〜10個）を自動作成・付与

Yoast SEO や Rank Math などのプラグインを使用している場合、メタディスクリプションは `excerpt` フィールドから自動取得されます。

---

### Pinterest

#### 1. Pinterest Developer アカウント

1. https://developers.pinterest.com/ にアクセス
2. 「My apps」→「Connect app」でアプリを作成
3. **Redirect URI** を任意の URL に設定（ローカルなら `https://localhost`）

#### 2. アクセストークンの取得（OAuth 2.0）

Pinterest API は OAuth 2.0 のアクセストークンが必要です。**初回のみ手動で取得**します。

**必要なスコープ:**
```
pins:read, pins:write, boards:read
```

**認可 URL（ブラウザで開く）:**
```
https://www.pinterest.com/oauth/?client_id={YOUR_CLIENT_ID}&redirect_uri={YOUR_REDIRECT_URI}&response_type=code&scope=pins:read,pins:write,boards:read
```

ブラウザでアクセスし、承認すると `?code=xxx` がリダイレクト URL に付きます。  
その code を使ってアクセストークンを取得します：

```bash
curl -X POST https://api.pinterest.com/v5/oauth/token \
  -u "{CLIENT_ID}:{CLIENT_SECRET}" \
  -d "grant_type=authorization_code&code={CODE}&redirect_uri={REDIRECT_URI}"
```

レスポンスの `access_token` を `PINTEREST_ACCESS_TOKEN` に設定してください。

> **有効期限**: Pinterest のアクセストークンは通常 **30日間** 有効（refresh_token は最大1年）。  
> 期限切れ時は上記手順で再取得するか、refresh_token を使って更新してください。

#### 3. ボード ID の確認

```bash
curl -X GET https://api.pinterest.com/v5/boards \
  -H "Authorization: Bearer {ACCESS_TOKEN}"
```

`id` フィールドの値を `PINTEREST_BOARD_ID_RAKUTEN` / `PINTEREST_BOARD_ID_AMAZON` に設定します。

#### 注意（規約）

- アフィリエイトリンクは Pinterest で許可されていますが、`#ad` または `#PR` による開示が必要（コード内に実装済み）
- 同一コンテンツの短時間連続投稿はスパムとみなされます（投稿間隔を空けてください）
- Pinterest は商品画像のダイレクト URL（`imageUrl`）を受け付けます

---

## 規約対応まとめ

| プラットフォーム | 対応内容 |
|---|---|
| WordPress | アフィリエイトリンクに `rel="nofollow noopener noreferrer"` を付与。PR 開示文を記事先頭に挿入 |
| WordPress (Amazon) | 「Amazonのアソシエイトとして〜」の必須開示文を挿入 |
| Pinterest (全般) | `#ad #PR` を説明文末尾に必ず付与 |
| Pinterest (Amazon) | `#Amazon #ad #PR` を付与 |
| 楽天 | キャッチコピー・商品説明を加工して自然な文章に変換。アフィリエイトリンク開示あり |
