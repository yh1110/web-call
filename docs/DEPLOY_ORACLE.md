# Oracle Cloud + Vercel デプロイガイド

Oracle Cloud Always Free（永久無料）を使って、完全無料で通話アプリをデプロイする手順です。

## 📋 構成

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  [Vercel]                                               │
│    ├─ Next.js フロントエンド                           │
│    └─ トークン生成 API                                 │
│         │                                               │
│         │ wss://                                        │
│         ▼                                               │
│  [Oracle Cloud - ARM]                                   │
│    ├─ LiveKit SFU (Docker)                             │
│    └─ Caddy (SSL 自動取得)                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 💰 コスト

| 項目         | 料金              |
| ------------ | ----------------- |
| Oracle Cloud | **永久無料**      |
| Vercel       | **無料**          |
| ドメイン     | ¥100〜/月（任意） |
| **合計**     | **¥0〜100/月**    |

---

## Step 1: Oracle Cloud アカウント作成

### 1.1 サインアップ

1. https://www.oracle.com/cloud/free/ にアクセス
2. 「無料で始める」をクリック
3. 必要情報を入力
   - メールアドレス
   - 国: Japan
   - **ホームリージョン: ap-tokyo-1（東京）推奨**

⚠️ **クレジットカード登録が必要**ですが、Always Free の範囲では課金されません。

### 1.2 アカウント有効化

- メール認証を完了
- ダッシュボードにログインできることを確認

---

## Step 2: ARM インスタンスの作成

### 2.1 コンピュート → インスタンスの作成

1. Oracle Cloud Console にログイン
2. 左メニュー → **コンピュート** → **インスタンス**
3. **インスタンスの作成** をクリック

### 2.2 インスタンス設定

| 項目     | 設定値                                                 |
| -------- | ------------------------------------------------------ |
| 名前     | `livekit-server`                                       |
| イメージ | **Oracle Linux 8** または **Ubuntu 22.04**（ARM 対応） |
| シェイプ | **VM.Standard.A1.Flex**（ARM）                         |
| OCPU     | **2**（最大 4 まで無料）                               |
| メモリ   | **12GB**（最大 24GB まで無料）                         |

### 2.3 ネットワーク設定

- **パブリック IPv4 アドレスの割当て**: 有効
- **新しい仮想クラウドネットワークを作成** を選択

### 2.4 SSH キーの追加

```bash
# ローカルで SSH キー生成（まだない場合）
ssh-keygen -t ed25519 -f ~/.ssh/oracle_cloud

# 公開鍵を表示してコピー
cat ~/.ssh/oracle_cloud.pub
```

公開鍵を Oracle Cloud の「SSH キーの追加」欄に貼り付け

### 2.5 作成

「作成」をクリックして、インスタンスが **RUNNING** になるまで待つ（2〜5 分）

---

## Step 3: ファイアウォール設定

### 3.1 セキュリティリストの編集

1. インスタンス詳細 → **サブネット** をクリック
2. **セキュリティ・リスト** → デフォルトのセキュリティリスト
3. **イングレス・ルールの追加**

以下のポートを開放：

| ソース CIDR | プロトコル | ポート      | 用途              |
| ----------- | ---------- | ----------- | ----------------- |
| 0.0.0.0/0   | TCP        | 80          | HTTP              |
| 0.0.0.0/0   | TCP        | 443         | HTTPS             |
| 0.0.0.0/0   | TCP        | 7881        | LiveKit RTC (TCP) |
| 0.0.0.0/0   | UDP        | 7882        | LiveKit RTC (UDP) |
| 0.0.0.0/0   | UDP        | 50100-50200 | WebRTC ポート     |

### 3.2 OS ファイアウォールの設定

SSH でインスタンスに接続後、以下を実行：

```bash
# Ubuntu の場合
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 7881 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 7882 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 50100:50200 -j ACCEPT
sudo netfilter-persistent save

# Oracle Linux の場合
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=7881/tcp
sudo firewall-cmd --permanent --add-port=7882/udp
sudo firewall-cmd --permanent --add-port=50100-50200/udp
sudo firewall-cmd --reload
```

---

## Step 4: Docker インストール

SSH でインスタンスに接続：

```bash
ssh -i ~/.ssh/oracle_cloud ubuntu@YOUR_PUBLIC_IP
```

Docker をインストール：

```bash
# Docker インストール
curl -fsSL https://get.docker.com | sh

# 現在のユーザーを docker グループに追加
sudo usermod -aG docker $USER

# 一度ログアウトして再接続
exit
```

再接続後、動作確認：

```bash
docker --version
```

---

## Step 5: LiveKit のデプロイ

### 5.1 ディレクトリ作成

```bash
mkdir -p ~/livekit
cd ~/livekit
```

### 5.2 設定ファイル作成

```bash
cat > docker-compose.yml << 'EOF'
services:
  livekit:
    image: livekit/livekit-server:latest
    container_name: livekit-server
    command: --config /etc/livekit.yaml
    network_mode: host
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml:ro
    restart: always

  caddy:
    image: caddy:2-alpine
    container_name: caddy
    network_mode: host
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    restart: always

volumes:
  caddy_data:
  caddy_config:
EOF
```

### 5.3 LiveKit 設定

```bash
cat > livekit.yaml << 'EOF'
port: 7880

rtc:
  port_range_start: 50100
  port_range_end: 50200
  tcp_port: 7881
  use_external_ip: true

# API Keys - 必ず変更してください！
keys:
  YOUR_API_KEY: YOUR_API_SECRET

logging:
  level: info

room:
  max_participants: 25
  empty_timeout: 300
  departure_timeout: 20
EOF
```

### 5.4 Caddy 設定（SSL）

ドメインがある場合：

```bash
cat > Caddyfile << 'EOF'
your-domain.com {
    reverse_proxy localhost:7880
}
EOF
```

ドメインがない場合（IP 直接アクセス）：

```bash
cat > Caddyfile << 'EOF'
:443 {
    tls internal
    reverse_proxy localhost:7880
}
EOF
```

### 5.5 起動

```bash
docker compose up -d
```

### 5.6 動作確認

```bash
# ログ確認
docker logs livekit-server

# 接続テスト
curl http://localhost:7880
# "OK" と表示されれば成功
```

---

## Step 6: DNS 設定（ドメインがある場合）

お使いのドメイン管理サービスで A レコードを追加：

```
your-domain.com → Oracle Cloud のパブリック IP
```

---

## Step 7: Vercel にデプロイ

### 7.1 GitHub にプッシュ

```bash
cd /path/to/web-call
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/web-call.git
git push -u origin main
```

### 7.2 Vercel でインポート

1. https://vercel.com/new にアクセス
2. GitHub リポジトリを選択
3. **Environment Variables** を設定：

| 変数名                    | 値                                       |
| ------------------------- | ---------------------------------------- |
| `LIVEKIT_API_KEY`         | `YOUR_API_KEY`（livekit.yaml と同じ）    |
| `LIVEKIT_API_SECRET`      | `YOUR_API_SECRET`（livekit.yaml と同じ） |
| `NEXT_PUBLIC_LIVEKIT_URL` | `wss://your-domain.com`                  |

4. **Deploy** をクリック

---

## Step 8: 動作確認

1. Vercel の URL にアクセス
2. ルームコードを生成
3. 名前を入力して参加
4. 別のブラウザ/デバイスで同じルームに参加
5. 音声通話と画面共有をテスト

---

## 🔧 トラブルシューティング

### 接続できない場合

1. **ファイアウォール確認**

   ```bash
   sudo iptables -L -n | grep -E "(7880|7881|7882|50100)"
   ```

2. **LiveKit ログ確認**

   ```bash
   docker logs livekit-server --tail 50
   ```

3. **Caddy ログ確認**
   ```bash
   docker logs caddy --tail 50
   ```

### ARM イメージが見つからない場合

LiveKit は ARM に対応しています。`latest` タグで自動的に ARM イメージが使用されます。

---

## 📊 リソース使用量の目安

| 利用状況         | CPU    | メモリ   |
| ---------------- | ------ | -------- |
| アイドル         | < 1%   | 約 100MB |
| 5 人通話         | 5-10%  | 約 200MB |
| 10 人 + 画面共有 | 15-25% | 約 400MB |

**2 OCPU + 12GB RAM で余裕を持って運用できます！**

---

## 🔄 更新・メンテナンス

### LiveKit の更新

```bash
cd ~/livekit
docker compose pull
docker compose up -d
```

### ログの確認

```bash
docker logs -f livekit-server
```

---

## ✅ 完了チェックリスト

- [ ] Oracle Cloud アカウント作成
- [ ] ARM インスタンス作成（VM.Standard.A1.Flex）
- [ ] セキュリティリストでポート開放
- [ ] OS ファイアウォール設定
- [ ] Docker インストール
- [ ] LiveKit 起動
- [ ] DNS 設定（または IP 直接）
- [ ] Vercel デプロイ
- [ ] 環境変数設定
- [ ] 動作確認
