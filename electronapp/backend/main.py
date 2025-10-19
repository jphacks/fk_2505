import hashlib
import hmac
import json
import os
from datetime import datetime
from typing import List, Optional

import firebase_admin
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
    """Slackメッセージを全WebSocketクライアントにブロードキャスト"""
    message_data = {
        "type": "new_message",
        "data": {
            "id": event.get("client_msg_id", event.get("ts", "")),
            "channel": event.get("channel", ""),
            "user": event.get("user", ""),
            "text": event.get("text", ""),
            "timestamp": event.get("ts", "")
        }
    }

    print(f"📤 ブロードキャスト: {len(active_connections)}クライアントに送信")
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


