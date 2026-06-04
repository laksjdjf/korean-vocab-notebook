# Korean Vocab Notebook / 韓国語単語帳

韓国語の単語を覚えるためのWebアプリ。
一覧表示（暗記モード）、4択クイズ、単語編集、音声読み上げ、PWA対応。

## 公開URL

https://laksjdjf.github.io/korean-vocab-notebook/

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

`main` ブランチへ push すると、GitHub Actions が `npm run build` を実行し、GitHub Pagesへデプロイします。

リポジトリの Settings → Pages で Source を `GitHub Actions` に設定します。
`vite.config.ts` の `base: './'` により、リポジトリ名がサブパスでも動きます。

## データ

すべてブラウザの localStorage に保存されます。初回起動時にAI生成のスターター646語が投入されます。
編集画面から JSON エクスポート/インポート、スターターへのリセットが可能。

## 免責

このアプリと単語データは、特定の公式試験・公式教材・出版社とは関係ありません。
スターター単語データはAI生成であり、誤りや不自然な表現を含む可能性があります。

このプロジェクトは Claude / Codex を使った Vibe coding により作成しました。

## 音声

ブラウザ標準の Web Speech API を使用。Windows の場合 `Microsoft Heami` (女性) が自動選択されます。
将来 AI 音声に差し替えるときは `src/composables/useSpeech.ts` の `speak()` を差し替えるだけ。

## License

MIT
