# Replay Mate - AI メッセージ返信アシスタント

[![IMAGE ALT TEXT HERE](https://jphacks.com/wp-content/uploads/2025/05/JPHACKS2025_ogp.jpg)](https://www.youtube.com/watch?v=lA9EluZugD8)

## 製品概要

### 背景(製品開発のきっかけ、課題等）

「あ、このメッセージ、後で返信しよう」── そう思ったまま、気づけば数日が経過していた経験はありませんか?

現代のビジネスパーソンは、Slack、LINE、Discord、Microsoft Teams など、複数のコミュニケーションツールを日常的に使用しています。それぞれのアプリに通知が溜まり、デスクトップには絶え間なく通知が表示されます。

**しかし、問題は「返信を後回しにすること」それ自体ではありません。** 本当の問題は、**後回しにした結果、本当に重要な返信ができなくなってしまうこと**です。

**なぜ重要な返信ができなくなるのか?**

1. **複数の媒体で通知が分散**: Slack、LINE、Discord、Teams...それぞれのアプリを開くだけで時間がかかり、どこに重要なメッセージがあるか把握できません
2. **すべてのメッセージが同じ優先度**: 既存の通知システムは、緊急度に関係なくすべてのメッセージを同じように表示します。その結果、本当に重要なメッセージが大量の通知に埋もれてしまいます
3. **返信のハードルが高い**: 返信するには作業を中断し、該当アプリを開き、メッセージを確認して、文章を考えなければなりません。このステップの多さが、特に重要なメッセージへの迅速な対応を妨げています

既存の通知システムは、デスクトップに通知を表示し、アプリ上に未読を溜め込むだけ。これでは**通知疲れ**を引き起こし、**本当に返信すべき重要なメッセージを見逃すリスク**を高めてしまいます。

**私たちは、この「重要な返信ができなくなる」問題に着目しました。**

もし、複数の媒体を一括管理でき、目につきやすいデスクトップアプリで常に通知状況が確認でき、AI が緊急度を判定して本当に重要なメッセージだけを優先的に知らせてくれたら ── 返信までのステップを最小限にし、少しでも楽しく返信できるキャラクター演出があったら ── 重要なメッセージへの返信漏れを防げるのではないか。

そんな想いから、**Replay Mate**は生まれました。

### 製品説明（具体的な製品の説明）

**Replay Mate**は、複数のコミュニケーションプラットフォームからのメッセージを一元管理し、AI が緊急度を自動判定してフィルタリングするデスクトップアプリケーションです。

可愛らしいフグのキャラクターが、受信したメッセージの数や緊急度に応じて表情や動きを変え、視覚的に通知の状態を伝えます。高緊急度のメッセージのみがリアルタイムでデスクトップ通知として表示されるため、ユーザーは重要な連絡を見逃すことなく、集中して作業に取り組むことができます。

### 特長

#### 1. AI による自動緊急度判定

**Google Gemini API** や **OpenAI API** を活用し、メッセージ内容を分析

```
メッセージ内容を AI が分析
    ↓
緊急度を 3 段階で自動分類
    ↓
低 │ 中 │ 高
    ↓
高緊急度のみリアルタイム通知
```

緊急度が**高**と判定されたメッセージのみがリアルタイム通知として表示されるため、重要な連絡に集中できます。

#### 2. 可愛らしいフグキャラクターによる視覚的フィードバック

| 状態                 | 表情      | 説明                                      |
| -------------------- | --------- | ----------------------------------------- |
| **通常時**           | 😊 kawaii | 可愛い表情で画面を泳ぐフグ                |
| **メッセージ蓄積時** | 😠 angry  | 怒った表情に変化                          |
| **5 件以上蓄積時**   | 😵 dead   | 困った表情で緊急性を視覚的に伝達          |
| **受信時**           | 🌀 shake  | シェイクアニメーションで新着を通知        |
| **常時**             | ← →       | 左右に泳ぐアニメーションで親しみやすい UI |

#### 3. マルチプラットフォーム対応とデスクトップ統合

```
Electron ベース
    ├─ 🍎 macOS 対応
    ├─ 🪟 Windows 対応
    └─ 🐧 Linux 対応
```

#### 4. デスクトップアプリならではのセキュリティと利便性

**ブラウザ Web アプリとの比較**

| 観点 | ブラウザ Web アプリ | Replay Mate |
|------|------------------|--------------------------------|
| 🗄️ **データ保存** | クラウドサーバーに依存 | ローカル環境で安全に管理 |
| 🔑 **認証情報** | ブラウザのクッキー/セッション | OS 環境変数で厳重に管理 |
| 📡 **ネットワーク通信** | 常時サーバーと通信 | 高緊急度メッセージのみ送信（通信最小化） |
| 🌐 **動作環境** | インターネット接続必須 | オフラインでも基本機能が利用可能 |
| 👁️ **常時表示** | タブ切り替えで見失う | Always on Top 機能で常に視界に |

**セキュリティ面の強み:**

- **ローカルデータ保存**: メッセージデータはローカルで管理され、クラウド漏洩リスクを回避
- **認証情報の安全管理**: API キーやトークンを OS 環境変数で管理し、ブラウザのクッキー漏洩リスクを排除
- **通信の最小化**: AI が「高」と判定したメッセージのみを送信し、ネットワーク露出を削減

**利便性の強み:**

- **オフライン利用**: ネットワークが不安定な環境でも蓄積されたメッセージの確認が可能
- **常に視界に配置**: Always on Top 機能で作業中も通知状態を見逃さない

### 解決出来ること

| 課題                          | 解決策                                          |
| ----------------------------- | ----------------------------------------------- |
| 🔔 **通知疲れ**               | AI が重要度を判定し、不要な通知を削減           |
| 🚨 **重要メッセージの見逃し** | 緊急度が高いメッセージは確実にリアルタイム通知  |
| 📱 **複数アプリの管理負担**   | Slack・LINE・Discord・Teams を 1 箇所で一元管理 |
| 🎯 **集中力の低下**           | 緊急でないメッセージは後でまとめて確認可能      |
| 👀 **状況把握の困難さ**       | フグキャラクターの表情で未読状況を直感的に把握  |

### 今後の展望

#### プラットフォーム拡張

- **LINE・Discord・Microsoft Teams との完全統合**
  現在 Slack のみ実装済み → 他のプラットフォームとの連携を追加予定

#### カスタマイズ機能

- **緊急度判定のパーソナライズ**
  ユーザーごとにキーワードや送信者に基づいた緊急度ルールを設定可能に
- **キャラクターのカスタマイズ**
  フグ以外のキャラクターや表情パターンの追加

#### 機能強化

- **返信機能の拡充**
  アプリ内から直接各プラットフォームにメッセージを送信
- **AI 自動返信機能**
  簡単なメッセージは AI が自動で返信を生成

#### 分析・最適化

- **統計・分析ダッシュボード**
  メッセージの受信パターンや緊急度の傾向を可視化

#### マルチデバイス対応

- **モバイルアプリ版の開発**
  スマートフォンでも同様の体験を提供

### 注力したこと（こだわり等）

#### 1. AI による緊急度判定の精度向上

**Gemini API** と **OpenAI API** によるメッセージの緊急度分類

#### 2. リアルタイム通信の実装

**WebSocket** を用いた双方向通信により、メッセージ受信から通知までの遅延を最小化

#### 3. キャラクターアニメーションの細部デザイン

**CSS アニメーション** × **React 状態管理** による自然な動きの実装

- フグキャラクターが自然に泳ぐ動き
- メッセージ受信時のシェイクエフェクト
- ユーザーに親しみやすく、視覚的に楽しい体験

#### 4. Firebase によるスケーラブルなデータ管理

**Firestore** を活用したユーザー登録とメッセージ履歴の永続化

```
複数ユーザー同時利用
    ↓
Firestore でデータ永続化
    ↓
安定した動作基盤
```

## 開発技術

### 🛠 Tech Stack

<div align="left">

#### Frontend

[![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-38.3.0-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![CSS3](https://img.shields.io/badge/CSS3-Animations-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)

#### Backend

[![Python](https://img.shields.io/badge/Python-3.13+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Framework-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Uvicorn](https://img.shields.io/badge/Uvicorn-ASGI_Server-499848?style=for-the-badge&logo=gunicorn&logoColor=white)](https://www.uvicorn.org/)

#### AI & APIs

[![Gemini](https://img.shields.io/badge/Gemini_API-2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--3.5--Turbo-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![Slack](https://img.shields.io/badge/Slack_API-Events_&_Web-4A154B?style=for-the-badge&logo=slack&logoColor=white)](https://api.slack.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

#### Platform

[![macOS](https://img.shields.io/badge/macOS-Supported-000000?style=for-the-badge&logo=apple&logoColor=white)](https://www.apple.com/macos/)
[![Windows](https://img.shields.io/badge/Windows-Supported-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://www.microsoft.com/windows)
[![Linux](https://img.shields.io/badge/Linux-Supported-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://www.kernel.org/)

</div>

---

### 📦 活用した技術の詳細

<details>
<summary><b>フロントエンド</b></summary>

| 技術                 | バージョン | 用途                           |
| -------------------- | ---------- | ------------------------------ |
| **React**            | 19.2.0     | UI 構築・状態管理              |
| **TypeScript**       | 4.9.5      | 型安全な開発                   |
| **Electron**         | 38.3.0     | デスクトップアプリケーション化 |
| **Electron Builder** | 26.0.12    | ビルド・パッケージング         |
| **Axios**            | -          | HTTP 通信                      |
| **WebSocket API**    | -          | リアルタイム双方向通信         |
| **CSS3**             | -          | アニメーション・エフェクト     |

</details>

<details>
<summary><b>バックエンド</b></summary>

| 技術        | バージョン | 用途                       |
| ----------- | ---------- | -------------------------- |
| **Python**  | 3.13+      | バックエンド言語           |
| **FastAPI** | -          | 高速 Web フレームワーク    |
| **Uvicorn** | -          | ASGI サーバー              |
| **uv**      | -          | 高速パッケージマネージャー |

</details>

<details>
<summary><b>AI・API・データ</b></summary>

| サービス               | モデル/機能          | 用途                                   |
| ---------------------- | -------------------- | -------------------------------------- |
| **Google Gemini API**  | gemini-2.5-flash     | メッセージ緊急度分析（プライマリ）     |
| **OpenAI API**         | gpt-3.5-turbo        | メッセージ緊急度分析（フォールバック） |
| **Slack API**          | Web API & Events API | メッセージ受信・イベント処理           |
| **Firebase Admin SDK** | Firestore            | ユーザー・メッセージデータ永続化       |

</details>

---

### 特に力を入れた部分

<table>
<tr>
<td width="50%">

**AI マルチモデル緊急度判定システム**

Gemini と OpenAI の 2 つの AI を組み合わせた高精度・高可用性な緊急度分類

```
Gemini API (Primary)
    ↓ (失敗時)
OpenAI API (Fallback)
    ↓
高可用性を実現
```

</td>
<td width="50%">

**リアルタイム WebSocket 通信基盤**

FastAPI × React による低遅延メッセージ配信

```
FastAPI WebSocket
    ⟷
React WebSocket Client
    ↓
低遅延リアルタイム通信
```

</td>
</tr>
<tr>
<td width="50%">

**キャラクターアニメーションシステム**

メッセージ数・緊急度に応じた動的アニメーション

- React 状態管理
- CSS アニメーション
- 表情・動きの動的変化

</td>
<td width="50%">

**Slack Webhook 署名検証 & Firestore 連携**

安全なイベント受信とメッセージ分配システム

```
Slack Event
    ↓ (署名検証)
チャンネルメンバー取得
    ↓
Firestore に一括保存
```

</td>
</tr>
</table>
