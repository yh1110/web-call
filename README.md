# MetaLive - グループ音声通話アプリ

シンプルでパワフルなグループ音声通話・画面共有 Web アプリケーション。

## ✨ 機能

- 🎤 **高品質音声通話** - 最大 20 人以上同時参加可能
- 🖥️ **画面共有** - プレゼンテーションやデモに最適
- 🔗 **簡単なルーム共有** - 6 文字のルームコードで簡単参加
- 🎨 **モダンな UI** - ダークモード対応のスタイリッシュなデザイン
- 🆓 **完全無料** - セルフホストなら制限なし！

## 🚀 ローカル開発

### 1. 依存関係のインストール

```bash
npm install
```

### 2. LiveKit サーバーを起動（Docker）

```bash
docker-compose up -d
```

### 3. 開発サーバーを起動

```bash
npm run dev
```

http://localhost:3000 をブラウザで開いてください。

## 📖 使い方

### ルームの作成

1. 🔄 ボタンでルームコードを生成
2. 名前を入力
3. 「ルームに参加」をクリック

### ルームへの参加

1. 共有されたルームコード（例: `ABC123`）を入力
2. 名前を入力
3. 「ルームに参加」をクリック

### 通話中の操作

- **マイク ON/OFF** - マイクボタン
- **画面共有** - 画面共有ボタン
- **退出** - 「退出」ボタン

## 🛠️ 技術スタック

- **フロントエンド**: Next.js 14 + TypeScript
- **スタイリング**: Tailwind CSS v4
- **リアルタイム通信**: LiveKit (WebRTC SFU)

## 📁 プロジェクト構成

```
├── docker-compose.yml      # ローカル開発用 Docker 設定
├── livekit.yaml            # LiveKit サーバー設定
├── docs/
│   └── DEPLOY_ORACLE.md    # Oracle Cloud デプロイガイド
├── src/
│   ├── app/
│   │   ├── api/token/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── components/
│       └── VideoConference.tsx
```

## 📝 ライセンス

MIT
