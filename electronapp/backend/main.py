import hashlib
import hmac
import json
import os
from datetime import datetime
from typing import List, Optional

import firebase_admin
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from firebasemanager import firebase_manager
from pydantic import BaseModel
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

app = FastAPI()
load_dotenv()

# WebSocket接続管理
active_connections: List[WebSocket] = []
# ===== Slack環境変数 =====
SLACK_SIGNING_SECRET = os.getenv("SLACK_SIGNING_SECRET")
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")

slack_client = WebClient(token=os.environ["SLACK_BOT_TOKEN"])

SLACK_CLIENT_ID = os.getenv("SLACK_CLIENT_ID")
SLACK_CLIENT_SECRET = os.getenv("SLACK_CLIENT_SECRET")
SLACK_REDIRECT_URI = os.getenv("SLACK_REDIRECT_URI")



# --- 🔹 リクエストモデル定義 ---
class SlackReplyRequest(BaseModel):
    user_id: str
    channel: str
    text: str
    thread_ts: str | None = None
    
class UserRegisterRequest(BaseModel):
    real_name: str | None = None
    display_name: str | None = None
    email: str | None = None
    slack_code: str | None = None  # 👈 Slack OAuth認可コードを追加
# --- 🔹 Firestore 登録API ---
@app.post("/register-user")
async def register_user(user: UserRegisterRequest):
    """
    デスクトップアプリ導入時にユーザー情報＋Slack OAuthトークンをFirestoreへ登録
    """
    try:
        # 🔹 Slack OAuth認証がある場合はトークン取得
        slack_user_token = None
        slack_team_id = None
        slack_user_id = None

        if user.slack_code:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    "https://slack.com/api/oauth.v2.access",
                    data={
                        "client_id": SLACK_CLIENT_ID,
                        "client_secret": SLACK_CLIENT_SECRET,
                        "code": user.slack_code,
                        "redirect_uri": SLACK_REDIRECT_URI,
                    },
                )
                data = res.json()
                print(json.dumps(data, indent=2, ensure_ascii=False))
                print("📥 Slack OAuth Response:", data)  # ← デバッグ出力
                if not data.get("ok"):
                    raise HTTPException(status_code=400, detail=f"Slack OAuth failed: {data}")
                slack_user_token = data.get("authed_user", {}).get("access_token")
                slack_user_id = data.get("authed_user", {}).get("id")
                slack_team_id = data.get("team", {}).get("id")
                print("✅ Slack OAuth成功:", data)

        # 🔹 Firestore登録（既存メソッド呼び出し）
        firestore_data = firebase_manager.create_or_update_user(
            user_id=slack_user_id or "",
            real_name=user.real_name or "",
            display_name=user.display_name or "",
            email=user.email or "",
            slack_team_id=slack_team_id or "",
            slack_user_token=slack_user_token or ""
        )

        return {"status": "success", "data": firestore_data}

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

     # ✅ WebSocket経由でフロントにブロードキャスト
    await handle_message(event)
    
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

# =========================================================
# 📤 Slack返信エンドポイント
# =========================================================
@app.post("/slack/reply")
async def slack_reply(req: SlackReplyRequest):
    """
    Firestoreに保存されたSlackユーザートークンで本人として返信
    """
    try:
        # --- Firestoreからユーザー情報取得 ---
        user_doc = firebase_manager.db.collection("users").document(req.user_id).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")

        user_data = user_doc.to_dict()
        slack_token = user_data.get("slack_user_token")

        if not slack_token:
            raise HTTPException(status_code=400, detail="Slack user token not found")

        # --- Slackクライアント初期化（本人のトークン）---
        client = WebClient(token=slack_token)

        # --- メッセージ送信 ---
        response = client.chat_postMessage(
            channel=req.channel,
            text=req.text,
            thread_ts=req.thread_ts
        )

        print("✅ Slack送信成功:", response.data)
        return {"status": "success", "message_ts": response.data.get("ts")}

    except SlackApiError as e:
        print("❌ Slack APIエラー:", e.response.data)
        raise HTTPException(status_code=500, detail=f"Slack API error: {e.response.data}")

    except Exception as e:
        print("❌ Slack返信APIエラー:", e)
        raise HTTPException(status_code=500, detail=str(e))


