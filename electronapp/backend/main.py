import hashlib
import hmac
import json
import os
from datetime import datetime
from typing import List, Optional

import firebase_admin
import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from firebasemanager import firebase_manager
from pydantic import BaseModel
from slack_sdk import WebClient

app = FastAPI()
load_dotenv()

# WebSocket接続管理
active_connections: List[WebSocket] = []
# ===== Slack環境変数 =====
SLACK_SIGNING_SECRET = os.getenv("SLACK_SIGNING_SECRET")
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")

# ===== AI API環境変数（Gemini優先、OpenAIフォールバック） =====
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Gemini初期化
gemini_model = None
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel('gemini-2.5-flash')
        print("✅ Gemini API初期化完了")
    except Exception as e:
        print(f"⚠️ Gemini API初期化失敗: {e}")

# OpenAI初期化
openai_client = None
if OPENAI_API_KEY:
    try:
        from openai import OpenAI
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        print("✅ OpenAI API初期化完了")
    except Exception as e:
        print(f"⚠️ OpenAI API初期化失敗: {e}")

# どちらも設定されていない場合は警告
if not gemini_model and not openai_client:
    print("⚠️ 警告: Gemini/OpenAI API両方とも未設定です。緊急度判定はデフォルト値を返します。")

slack_client = WebClient(token=os.environ["SLACK_BOT_TOKEN"])



# --- 🔹 リクエストモデル定義 ---
class UserRegisterRequest(BaseModel):
    user_id: str                     # ← 必須
    real_name: Optional[str] = None  # ← 任意
    display_name: Optional[str] = None
    email: Optional[str] = None


# --- 🔹 Firestore 登録API ---
@app.post("/register-user")
async def register_user(user: UserRegisterRequest):
    """
    デスクトップアプリ導入時にユーザー情報をFirestoreへ登録するAPI
    （user_idのみ必須、他は任意）
    """
    try:
        # FirebaseManagerのメソッド呼び出し
        data = firebase_manager.create_or_update_user(
            user_id=user.user_id,
            real_name=user.real_name or "",
            display_name=user.display_name or "",
            email=user.email or None
        )

        return {"status": "success", "data": data}

    except Exception as e:
        print("❌ Firestore登録エラー:", e)
        raise HTTPException(status_code=500, detail="Failed to register user.")


# =========================================================
# 🤖 AI緊急度判定関数（Gemini優先、OpenAIフォールバック）
# =========================================================
async def analyze_urgency(text: str) -> str:
    """
    AI APIを使用してメッセージの緊急度を判定
    Gemini優先、失敗時はOpenAIにフォールバック
    Returns: "低" | "中" | "高"
    """
    # 判定用プロンプト（f-stringで変数展開）
    prompt_text = f"""あなたはSlackメッセージの緊急度を判定するAIです。
以下の基準で判定してください:

【高】即座の対応が必要
- システム障害、エラー、緊急のバグ報告
- 締切が迫っている重要なタスク
- 顧客からのクレームや緊急の問い合わせ
- セキュリティ関連の警告
- 「至急」「緊急」「すぐに」などの緊急を示す言葉

【中】通常の業務連絡
- 一般的な質問や相談
- 通常のタスク依頼
- 情報共有

【低】確認不要または雑談
- 雑談、挨拶
- 既読確認のみで対応不要なもの
- スタンプのみのリアクション

回答は必ず「低」「中」「高」のいずれか1文字のみで返してください。

メッセージ:
{text}"""

    # ✅ 1. Gemini APIを試す
    if gemini_model:
        try:
            print("🔵 Gemini APIで判定中...")
            response = gemini_model.generate_content(prompt_text)
            urgency = response.text.strip()
            print(f"🤖 Gemini判定結果: '{urgency}'")

            # 正規化
            if urgency in ["低", "中", "高"]:
                return urgency
            else:
                print(f"⚠️ 予期しない判定結果: {urgency}")
        except Exception as e:
            print(f"❌ Gemini API エラー: {e}")

    # ✅ 2. OpenAI APIにフォールバック
    if openai_client:
        try:
            print("🟢 OpenAI APIで判定中...")
            response = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": prompt_text.split("メッセージ:")[0]},
                    {"role": "user", "content": f"以下のメッセージの緊急度を判定してください:\n\n{text}"}
                ],
                temperature=0.3,
                max_tokens=10
            )
            urgency = response.choices[0].message.content.strip()
            print(f"🤖 OpenAI判定結果: '{urgency}'")

            # 正規化
            if urgency in ["低", "中", "高"]:
                return urgency
            else:
                print(f"⚠️ 予期しない判定結果: {urgency}")
        except Exception as e:
            print(f"❌ OpenAI API エラー: {e}")

    # ✅ 3. 両方とも失敗した場合はデフォルト値
    print("⚠️ すべてのAI APIが使用不可 - デフォルトで'中'を返します")
    return "中"

# =========================================================
# 🔒 Slack署名検証関数
# =========================================================
def verify_slack_request(request: Request, body: bytes) -> bool:
    """Slackからのリクエストが正当かを検証"""
    timestamp = request.headers.get("X-Slack-Request-Timestamp", "")
    signature = request.headers.get("X-Slack-Signature", "")

    # タイムスタンプチェック（5分以上経過していたら拒否）
    if not timestamp or abs(int(datetime.now().timestamp()) - int(timestamp)) > 60 * 5:
        return False

    # 署名の生成
    sig_basestring = f"v0:{timestamp}:{body.decode()}"
    my_signature = "v0=" + hmac.new(
        SLACK_SIGNING_SECRET.encode(),
        sig_basestring.encode(),
        hashlib.sha256
    ).hexdigest()

    # Slackの署名と比較
    return hmac.compare_digest(my_signature, signature)


@app.post("/slack/event")
async def slack_event(request: Request):
    body = await request.body()
    print("Headers:", request.headers)

    # ✅ Slack署名検証（本番運用では必須）
    if not verify_slack_request(request, body):
        raise HTTPException(status_code=403, detail="Invalid signature")
    
    data = json.loads(body.decode("utf-8"))

    # ✅ URL検証（Slack初回設定時のみ）
    if data.get("type") == "url_verification":
        print("✅ challenge確認リクエストを受信しました")
        return {"challenge": data["challenge"]}
    
    # ✅ 通常イベント内容の確認
    event = data.get("event", {})
    channel_id = event.get("channel")
    sender_id = event.get("user")
    text = event.get("text")
    ts = event.get("ts")

    # チャンネルの全メンバーを取得
    members_response = slack_client.conversations_members(channel=channel_id)
    channel_members = members_response["members"]
    print("👥 チャンネルメンバー一覧:", channel_members)

    # 各ユーザーに対してメッセージ保存
    for receiver_id in channel_members:
        firebase_manager.receive_message(
            receiver_id=receiver_id,  # 🔥 アプリ利用者（Botではない）
            sender_id=sender_id,      # 発言者
            message_id=ts,
            channel_id=channel_id,
            text=text,
            is_ai=False,
            is_bot=False,
            is_see=False,
            channel_type=event.get("channel_type", "im")
        )
    
    # 🤖 AI緊急度判定
    print(f"🤖 緊急度判定開始: {text}")
    urgency = await analyze_urgency(text)
    print(f"📊 緊急度: {urgency}")

    # ✅ 緊急度が「高」の場合のみWebSocketで送信
    if urgency == "高":
        print(f"📤 緊急度が高いため、WebSocketで送信します")
        await handle_message(event)
    else:
        print(f"⏭️  緊急度が'{urgency}'のためWebSocket送信をスキップ")

    return {"ok": True}

# =========================================================
# 🔌 WebSocketエンドポイント
# =========================================================
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket接続を受け入れてメッセージをブロードキャスト"""
    await websocket.accept()
    active_connections.append(websocket)
    print(f"✅ WebSocket接続: {len(active_connections)}クライアント接続中")

    try:
        while True:
            # クライアントからのメッセージを受信（ping/pongなど）
            data = await websocket.receive_text()
            print(f"📨 WebSocket受信: {data}")

            # pingに対してpongを返す
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        print(f"❌ WebSocket切断: {len(active_connections)}クライアント接続中")

# =========================================================
# 📤 Slackメッセージをブロードキャスト
# =========================================================
async def handle_message(event: dict):
    """Slackメッセージの緊急度を判定し、高緊急度のみWebSocketクライアントにブロードキャスト"""
    message_text = event.get("text", "")

    # ✅ OpenAI APIで緊急度を判定
    print(f"🤖 緊急度判定開始: {message_text}")
    urgency = await analyze_urgency(message_text)
    print(f"📊 緊急度: {urgency}")

    # ✅ 緊急度が「高」の場合のみクライアントに送信
    if urgency != "高":
        print(f"⏭️  緊急度が'{urgency}'のためスキップ (高のみ送信)")
        return

    message_data = {
        "type": "new_message",
        "data": {
            "id": event.get("client_msg_id", event.get("ts", "")),
            "channel": event.get("channel", ""),
            "user": event.get("user", ""),
            "text": message_text,
            "timestamp": event.get("ts", ""),
            "urgency": urgency  # 緊急度を追加
        }
    }

    print(f"📤 ブロードキャスト: {len(active_connections)}クライアントに送信 (緊急度: {urgency})")
    print(f"📤 送信データ: {json.dumps(message_data, ensure_ascii=False)}")

    # 切断されたクライアントを追跡
    disconnected = []

    for connection in active_connections:
        try:
            await connection.send_json(message_data)
            print(f"✅ 送信成功")
        except Exception as e:
            print(f"❌ 送信失敗: {e}")
            disconnected.append(connection)

    # 切断されたクライアントを削除
    for connection in disconnected:
        active_connections.remove(connection)


