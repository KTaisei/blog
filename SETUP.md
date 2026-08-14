# はじめての公開手順

この手順を終えると、以後の記事作成・下書き・公開はブラウザの `/admin/` だけで完結します。`git commit` や `git push` をローカルで行う必要はありません。

> 「Cloudflare Workers」は、GitHub ログイン時の秘密情報を安全に扱う小さな中継サーバーです。ブログ本文を置いたり、ブログを公開したりする場所ではありません。

## 用意するもの

- GitHub アカウント（メールアドレスを確認済み）
- Cloudflare アカウント（無料プランで可）
- Node.js 18 以上が使えるPCのターミナル
- このフォルダにあるブログ一式

秘密情報（GitHub OAuth App の Client secret）は、公開リポジトリ、Markdown記事、`config.yml`、スクリーンショットには書き込まないでください。

## 1. GitHub にブログを置く

1. GitHub にログインし、右上の **+ → New repository** を選びます。
2. Repository name に例として `my-blog` を入力します。公開ブログにするなら **Public** を選びます。
3. **Create repository** を押します。
4. 作成直後の画面で **uploading an existing file** を選び、このフォルダ内のファイルをドラッグ＆ドロップします。`node_modules` と `dist` はアップロードしません（`.gitignore` にも指定済みです）。
5. 画面下部の **Commit changes** を押します。

ここまでの「Commit changes」は初回の設置作業です。以後の記事のコミットは Decap CMS が自動で行います。

## 2. GitHub Pages を有効にする

1. リポジトリ画面の **Settings → Pages** を開きます。
2. **Build and deployment → Source** で **GitHub Actions** を選びます。
3. リポジトリの **Settings → Secrets and variables → Actions → Variables** を開き、次の2つを追加します。

| Name | 例 | 意味 |
| --- | --- | --- |
| `BASE_PATH` | `/my-blog/` | リポジトリ名を含むURLのパス。`username.github.io` という名前のリポジトリなら `/` |
| `SITE_URL` | `https://YOUR_GITHUB_ID.github.io/my-blog` | 実際の公開URL。末尾 `/` は付けない |

4. **Actions** タブを開き、「Deploy Astro site to GitHub Pages」が成功（緑）になるまで待ちます。
5. **Settings → Pages** に表示される **Visit site** から公開サイトを開きます。

公開後のURLは、通常 `https://<GitHub ID>.github.io/<リポジトリ名>/` です。独自ドメインを使う場合は、同じ Pages 画面の **Custom domain** にドメインを設定してDNSを案内に従って設定し、`SITE_URL` も独自ドメインのURLへ変更します。

## 3. Cloudflare Workers を公開する

1. [Cloudflare](https://dash.cloudflare.com/sign-up) でアカウントを作成・ログインします。
2. PCのターミナルで、このブログのフォルダに移動して以下を順に実行します。

```bash
cd cloudflare-worker
npm install
npx wrangler login
npm run deploy
```

ブラウザが開いたら Cloudflare へのアクセスを許可します。最後のコマンドが成功すると、`https://decap-github-oauth-proxy.<あなたのサブドメイン>.workers.dev` のようなURLが表示されます。これを以降 **Worker URL** と呼びます。末尾の `/` は付けません。

`npm run deploy` でエラーが出る場合は、Cloudflare ダッシュボードの **Workers & Pages** を開き、Workers用の `workers.dev` サブドメインを設定してから再試行します。

## 4. GitHub OAuth App を作る

1. GitHub 右上のプロフィール画像 → **Settings → Developer settings → OAuth Apps → New OAuth App** を開きます。
2. 次を入力します。

| 項目 | 入力値 |
| --- | --- |
| Application name | `My Blog CMS` など任意の名前 |
| Homepage URL | 手順2で得たブログの公開URL |
| Authorization callback URL | `<Worker URL>/callback` |

3. **Register application** を押します。
4. 表示された **Client ID** を控えます。
5. **Generate a new client secret** を押し、表示された値を直ちに安全な場所に控えます。この値は画面を離れると再表示できません。

OAuth App は callback URL を1つしか登録できません。`/callback` を付け忘れないでください。

## 5. Worker に秘密情報を登録する

ターミナルは `cloudflare-worker` フォルダにいる状態で、次を1行ずつ実行します。各コマンドの後に値を貼り付け、Enterを押します。

```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put ALLOWED_GITHUB_LOGIN
```

入力する値は以下です。

| Secret 名 | 入力する値 |
| --- | --- |
| `GITHUB_CLIENT_ID` | 手順4の Client ID |
| `GITHUB_CLIENT_SECRET` | 手順4の Client secret |
| `ALLOWED_GITHUB_LOGIN` | ログインを許可する自分の GitHub ID（プロフィールURLの末尾。表示名ではない） |

各 `secret put` は Worker を即時更新します。Secret の内容は Cloudflare の画面やコマンドで後から表示できません。間違えた場合は同じコマンドで上書きします。

## 6. CMS の設定をブラウザから入れる

GitHubリポジトリで `public/admin/config.yml` を開き、鉛筆アイコン（Edit）で以下を変更し、**Commit changes** を押します。

```yml
backend:
  name: github
  repo: YOUR_GITHUB_ID/YOUR_REPOSITORY_NAME
  branch: main
  base_url: https://YOUR_WORKER.YOUR_SUBDOMAIN.workers.dev
  auth_endpoint: auth
```

さらに GitHub Pages が `https://YOUR_GITHUB_ID.github.io/YOUR_REPOSITORY_NAME/` 形式なら、同じファイルの `public_folder` も次のようにします。

```yml
public_folder: /YOUR_REPOSITORY_NAME/images/uploads
```

リポジトリ名が `YOUR_GITHUB_ID.github.io` の場合は、`public_folder: /images/uploads` のままで構いません。設定を保存すると Actions が再び走ります。

## 7. 管理画面を試す

1. `https://<GitHub ID>.github.io/<リポジトリ名>/admin/` を開きます。
2. **Login with GitHub** を押します。
3. GitHub の認可画面で内容を確認し、Authorize を押します。
4. CMSに戻れば成功です。
5. 「記事」→「New 記事」からテスト記事を作ります。最初は **下書き** をオンにして保存します。
6. GitHub のリポジトリに Markdown ファイルが自動コミットされます。下書きは公開サイトには出ません。
7. 同じ記事で **下書き** をオフにして保存すると、Actionsがビルド後に公開します。

ログインできない場合は、次を上から確認してください。

1. `config.yml` の `base_url` が Worker URL と完全一致しているか
2. OAuth App の callback URL が `<Worker URL>/callback` か
3. `ALLOWED_GITHUB_LOGIN` が表示名ではなくGitHub IDか
4. ブラウザのポップアップがブロックされていないか
5. Actions の最新実行が成功していて、設定変更がPagesへ反映されたか

## 普段の運用

以後は `/admin/` を開くだけです。

- 保存: GitHubへ自動コミット
- 下書きオン: サイトには非表示
- 下書きオフで保存: 自動コミット → GitHub Actions → Pages公開
- 画像アップロード: `public/images/uploads/` に自動コミット

## 公式資料

- [GitHub PagesをGitHub Actionsで公開する手順](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub OAuth Appの作成](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [Cloudflare WorkersのCLI入門](https://developers.cloudflare.com/workers/get-started/guide/)
- [Cloudflare WorkersのSecret管理](https://developers.cloudflare.com/workers/configuration/secrets/)
