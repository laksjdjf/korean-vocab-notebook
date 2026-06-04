# Korean Vocab Notebook / 韓国語単語帳

韓国語の単語を覚えるためのWebアプリ。
一覧表示（暗記モード）、4択クイズ、単語編集、音声読み上げ、PWA対応。

## ローカル起動

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
npm run preview   # 確認
```

## GitHub Pagesへのデプロイ

1. GitHubでリポジトリを作る（例：`korean-vocab-notebook`）
2. ローカルで:

   ```bash
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/<USER>/<REPO>.git
   git push -u origin main
   ```

3. デプロイ（`gh-pages` ブランチに `dist/` を push）:

   ```bash
   npm run build
   npm run deploy
   ```

4. リポジトリの Settings → Pages で、Source = `gh-pages` ブランチ / `/ (root)` を選ぶ。

`vite.config.ts` の `base: './'` により、リポジトリ名がサブパスでも動く設定です。

## データ

すべてブラウザの localStorage に保存されます。初回起動時にAI生成のスターター646語が投入されます。
編集画面から JSON エクスポート/インポート、スターターへのリセットが可能。

このアプリと単語データは、特定の公式試験・公式教材・出版社とは関係ありません。

## 音声

ブラウザ標準の Web Speech API を使用。Windows の場合 `Microsoft Heami` (女性) が自動選択されます。
将来 AI 音声に差し替えるときは `src/composables/useSpeech.ts` の `speak()` を差し替えるだけ。
