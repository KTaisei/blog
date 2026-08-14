# GitHub Pages + Astro + Decap CMS ブログ

ブラウザの `/admin/` だけで記事を作成・編集・削除・公開できる個人ブログです。Decap CMS が GitHub API を通じて `main` に直接コミットし、GitHub Actions が GitHub Pages を更新します。日常の `git commit` / `git push` は不要です。

はじめてGitHub Pages・Cloudflare Workersを設定する場合は、画面操作を含めた [はじめての公開手順](./SETUP.md) を上から順に実行してください。

## 最初に変更する値

`public/admin/config.yml` の次を実際の値に置き換えます。

- `repo`: `YOUR_GITHUB_USERNAME/YOUR_REPOSITORY`
- `base_url`: デプロイした Worker の URL（末尾の `/` は不要）

さらに、GitHub の **プロジェクト Pages**（URL が `https://user.github.io/repository`）なら `public_folder` を `/repository/images/uploads` に変えます。ユーザー Pages（`https://user.github.io`）は `/images/uploads` のままです。

GitHub リポジトリの **Settings → Secrets and variables → Actions → Variables** にも次を設定します。

| 変数 | 値 |
| --- | --- |
| `SITE_URL` | 公開 URL。例: `https://alice.github.io/my-blog`（独自ドメインならその URL） |
| `BASE_PATH` | プロジェクト Pages は `/my-blog/`、`<username>.github.io` リポジトリは `/` |

`SITE_URL` は末尾スラッシュなし、`BASE_PATH` は先頭・末尾ともスラッシュありにします。

## 1. GitHub リポジトリと OAuth App

1. この内容を GitHub の新しいリポジトリへ最初の一度だけ登録します。
2. GitHub の **Settings → Developer settings → OAuth Apps → New OAuth App** を開きます。
3. 以下を入力します。
   - **Application name**: 任意（例: `My Blog CMS`）
   - **Homepage URL**: ブログの公開 URL（例: `https://alice.github.io/my-blog`）
   - **Authorization callback URL**: `https://<Worker のホスト名>/callback`
4. 作成後の **Client ID** を控え、**Generate a new client secret** で発行した Client secret も控えます。Client secret は Worker の Secret としてのみ保存し、リポジトリへは絶対に書き込みません。

OAuth App がアクセスを許可する範囲に加え、Worker がログイン GitHub ID を照合するため、指定した1アカウント以外は CMS を使えません。GitHub リポジトリ自体も private にするか、管理者以外に書き込み権限を渡さないでください。

## 2. Cloudflare Workers のデプロイ

`cloudflare-worker/` はブログ本体と別リポジトリに置いても構いません。以下はこのリポジトリに置く場合です。

```bash
cd cloudflare-worker
npm install
npx wrangler login
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put ALLOWED_GITHUB_LOGIN
npm run deploy
```

最後の値は管理者の GitHub ログイン名（例: `alice`）です。デプロイで表示された `https://...workers.dev` を `config.yml` の `base_url` に入れます。その URL の `/callback` を OAuth App の callback URL に設定し直してください。

Worker は OAuth の `state` を短時間の HttpOnly Cookie として検証し、トークン交換後に GitHub `/user` API の `login` と `ALLOWED_GITHUB_LOGIN` を厳密に比較します。トークンや Client secret はログ出力・コミットされません。

## 3. GitHub Pages の有効化

1. GitHub リポジトリの **Settings → Pages** を開きます。
2. **Build and deployment → Source** に **GitHub Actions** を選びます。
3. `main` への push（CMS の保存も含む）で workflow が動き、Pages が更新されます。
4. 独自ドメインを使うなら同画面で **Custom domain** を設定し、DNS 設定後に `SITE_URL` を独自ドメインへ変更します。使わない場合は空欄のままです。

workflow は [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) です。`main` で `npm ci` → Astro build → Pages artifact deploy を行い、`gh-pages` ブランチは作りません。

## CMS の使い方

公開サイトの `https://.../admin/` を開いて GitHub でログインします。

- **下書き**: 「下書き」をオンにして保存します。`draft: true` の Markdown が `src/content/posts/` にコミットされますが、公開サイトには表示されません。
- **公開**: 「下書き」をオフにして保存します。`draft: false` がコミットされ、Actions の成功後に記事が表示されます。
- **画像**: CMS の画像フィールドからアップロードすると `public/images/uploads/` にコミットされ、記事内で `/images/uploads/...` として参照されます。
- 編集・削除も同じ管理画面で実行でき、いずれも GitHub に直接反映されます。

記事の frontmatter は `title`, `description`, `date`, `tags`, `image`, `draft` です。公開日が新しい順で一覧表示されます。

## ローカル開発

```bash
npm install
npm run dev
```

`http://localhost:4321` でサイトを確認します。型・コンテンツ検査は `npm run check`、本番ビルド確認は `npm run build` です。ローカルの `/admin/` で OAuth を試す場合、OAuth App の callback URL は1件だけのため、本番 Worker を使うのが簡単です。本番公開前の CMS 操作はテスト用リポジトリで行うことをおすすめします。

## 注意

- GitHub OAuth App の Client secret、Worker の Secret、CMS 用アクセストークンはリポジトリへコミットしないでください。
- `public/admin/config.yml` のプレースホルダーを置換しない限りログインは動きません。
- リポジトリ Pages（`https://user.github.io/repo`）では `BASE_PATH` の設定が必須です。リンク、管理画面、画像のパスに反映されます。

## デザインシステムの出典・ライセンス

UI は [デジタル庁デザインシステム](https://design.digital.go.jp/dads/) のデザイン言語およびアクセシビリティの考え方を参考に、ブログ向けに編集・加工して実装しています。デジタル庁が本ブログを作成・承認したことを示すものではありません。出典と利用条件は、[利用上の注意事項](https://design.digital.go.jp/dads/introduction/notices/) を参照してください。

本リポジトリにはデジタル庁デザインシステムのコードスニペット、Figmaデータ、アイコン素材をそのまま含めていません。これらを追加利用する場合は、それぞれに適用されるライセンス（コードスニペットは MIT License、Figmaデータは CC BY 4.0、Material Symbols は Apache License 2.0）および出典表示の条件を確認してください。
