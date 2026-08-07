# VoiceAtlas Docker Web App

VoiceAtlasの初期プロトタイプです。初回同意、ライト登録、ホーム画面、研究参加同意、氏名・住所登録、研究認証バッジ表示までを、Docker上のWebアプリ + PostgreSQLで動かせます。

## 起動

```bash
cp .env.example .env
docker compose up --build
```

ブラウザで `http://localhost:3000` を開きます。
初回ビルド時に `express` と `pg` をnpmレジストリから取得します。

## 限定テスト公開

このリポジトリは、Cloudflare Quick Tunnelで一時公開できます。Quick Tunnelは起動するたびにランダムな `trycloudflare.com` URLを発行するため、短時間の確認・デモ用途に使います。

Basic認証はアプリ全体にかかります。`.env` に以下を設定してください。

```env
BASIC_AUTH_ENABLED=true
BASIC_AUTH_USERNAME=voiceatlas
BASIC_AUTH_PASSWORD=change-this-basic-auth-password
BASIC_AUTH_REALM=VoiceAtlas Test
```

起動:

```bash
docker compose up --build
```

発行された外部公開URLは `cloudflared` のログに出ます。

```bash
docker compose logs -f cloudflared
```

Quick Tunnelでは `TUNNEL_TOKEN` は使いません。Named Tunnelへ戻す場合だけ使用します。

## DB設定

ローカルPCからDBへ接続する場合:

```text
Host: localhost
Port: 5432
Database: voiceatlas
User: voiceatlas
Password: voiceatlas_password
URL: postgresql://voiceatlas:voiceatlas_password@localhost:5432/voiceatlas
```

アプリコンテナ内から接続する場合:

```text
Host: db
Port: 5432
Database: voiceatlas
User: voiceatlas
Password: voiceatlas_password
URL: postgresql://voiceatlas:voiceatlas_password@db:5432/voiceatlas
```

これらは `.env` で変更できます。

```env
APP_PORT=3000
DB_PORT=5432
POSTGRES_DB=voiceatlas
POSTGRES_USER=voiceatlas
POSTGRES_PASSWORD=voiceatlas_password
DATABASE_URL=postgresql://voiceatlas:voiceatlas_password@db:5432/voiceatlas
```

## DB初期化

初回起動時に `db/init/001_schema.sql` と `db/init/002_seed.sql` が実行されます。

DBをまっさらにして初期化し直す場合:

```bash
docker compose down -v
docker compose up --build
```

## 主なテーブル

- `users`: アカウント本体。ライト登録で作成。
- `consent_documents`: 利用規約、プライバシー、研究同意の文書バージョン。
- `user_consents`: ユーザーごとの同意・撤回履歴。
- `diseases`: 疾患マスタ。
- `user_conditions`: 疾患、状態、ステージ、治療状況。
- `user_demographics`: 年代、性別など任意属性。
- `research_studies`: 研究プロジェクト。
- `research_enrollments`: 研究参加登録と認証状態。
- `research_identity_profiles`: 研究用の氏名・住所。通常プロフィールとは分離。
- `badges` / `user_badges`: 研究認証バッジなど。
- `social_profiles`, `user_follows`, `communities`, `posts`: 将来の検索・SNS・コミュニティ拡張用。
- `reports`, `moderation_actions`, `audit_logs`: 通報、運営対応、監査ログ。

## 実装メモ

このプロトタイプではログイン認証を省略し、ブラウザのLocalStorageにユーザーIDを保存しています。本番化ではメール/電話/外部IDプロバイダなどの認証、研究用個人情報の暗号化、アクセス権限、バックアップ、監査ログの保全、同意文書の法務確認を追加してください。

氏名・住所は `research_identity_profiles` に分離しており、通常のプロフィール、検索、SNS機能では参照しない前提です。
