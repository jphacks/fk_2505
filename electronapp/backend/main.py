import hashlib
import hmac
import json
import os
from datetime import datetime

import firebase_admin
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from firebasemanager import firebase_manager
from pydantic import BaseModel

app = FastAPI()
load_dotenv()
# ===== Slack環境変数 =====
SLACK_SIGNING_SECRET = os.getenv("SLACK_SIGNING_SECRET")
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")




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

#slackイベント受信エンドポイント
@app.post("/slack/event")
async def slack_event(request: Request):
    """Slack Event Subscriptions endpoint"""
    body = await request.body()
    print("Headers:", request.headers)

    # ✅ Slack署名検証（本番運用では必須）
    if not verify_slack_request(request, body):
        raise HTTPException(status_code=403, detail="Invalid signature")

    data = json.loads(body.decode("utf-8"))
    print("=== Slackから届いたデータ ===")
    print(json.dumps(data, indent=2, ensure_ascii=False))

    # ✅ URL検証（Slack初回設定時のみ）
    if data.get("type") == "url_verification":
        print("✅ challenge確認リクエストを受信しました")
        return {"challenge": data["challenge"]}

    # ✅ 通常イベント内容の確認
    if data.get("type") == "event_callback":
        event = data.get("event", {})
        print(f"[イベントタイプ] {event.get('type')}")
        print(f"[送信者] {event.get('user')}")
        print(f"[メッセージ内容] {event.get('text')}")

    return {"ok": True}

# === リクエストボディのスキーマ ===
class UserRegisterRequest(BaseModel):
    user_id: str          # Slack上のユーザーID
    real_name: str        # 実名
    display_name: str     # 表示名（Slack表示名）
    email: str | None = None  # 任意
# === 登録API ===
@app.post("/register-user")
async def register_user(user: UserRegisterRequest):
    """
    デスクトップアプリ導入時にユーザー情報をFirestoreへ登録するAPI
    """
    try:
        data = firebase_manager.create_or_update_user(
            user_id=user.user_id,
            real_name=user.real_name,
            display_name=user.display_name,
            email=user.email
        )
        return {"status": "success", "data": data}

    except Exception as e:
        print("❌ Firestore登録エラー:", e)
        raise HTTPException(status_code=500, detail="Failed to register user.")

# # slackイベント受信エンドポイント
# @app.post("/slack/event")
# async def slack_event(request: Request):
#     """Slack Event Subscriptions endpoint"""
#     body = await request.body()
#     print("Headers:", request.headers)

#     # ✅ Slack署名検証（本番運用では必須）
#     if not verify_slack_request(request, body):
#         raise HTTPException(status_code=403, detail="Invalid signature")

#     data = json.loads(body.decode("utf-8"))
#     print("=== Slackから届いたデータ ===")
#     print(json.dumps(data, indent=2, ensure_ascii=False))

#     # ✅ URL検証（Slack初回設定時のみ）
#     if data.get("type") == "url_verification":
#         print("✅ challenge確認リクエストを受信しました")
#         return {"challenge": data["challenge"]}

#     # ✅ 通常イベント内容の確認
#     if data.get("type") == "event_callback":
#         event = data.get("event", {})
#         print(f"[イベントタイプ] {event.get('type')}")
#         print(f"[送信者] {event.get('user')}")
#         print(f"[メッセージ内容] {event.get('text')}")

#         # ✅ メッセージイベントの場合、Firestoreに保存
#         if event.get("type") == "message" and not event.get("bot_id") and not event.get("subtype"):
#             try:
#                 sender_id = event.get("user")
#                 text = event.get("text")
#                 ts = event.get("ts")
#                 channel = event.get("channel")
#                 channel_type = event.get("channel_type", "im")
                
#                 # Bot自身のユーザーID（メッセージの受信者）
#                 bot_user_id = data.get("authorizations", [{}])[0].get("user_id")
                
#                 if not bot_user_id:
#                     print("⚠️ Bot user IDが取得できませんでした")
#                     return {"ok": True}
                
#                 # Firestoreにメッセージを保存
#                 firebase_manager.receive_message(
#                     receiver_id=bot_user_id,
#                     sender_id=sender_id,
#                     message_id=ts,
#                     channel_id=channel,
#                     text=text,
#                     is_ai=False,
#                     is_bot=False,
#                     is_see=False,
#                     channel_type=channel_type
#                 )
                
#                 print(f"✅ Firestoreにメッセージを保存しました")
#                 print(f"   - Receiver: {bot_user_id}")
#                 print(f"   - Sender: {sender_id}")
#                 print(f"   - Text: {text}")
#                 print(f"   - Channel: {channel} ({channel_type})")
                
#             except Exception as e:
#                 print(f"❌ メッセージ保存エラー: {e}")
#                 import traceback
#                 traceback.print_exc()
#                 # エラーが発生してもSlackには200を返す（リトライ防止）

#     return {"ok": True}

# import hashlib
# import hmac
# import json
# import os
# from datetime import datetime
# from typing import List

# import firebase_admin
# from dotenv import load_dotenv
# from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect

# app = FastAPI()
# load_dotenv()

# # WebSocket接続管理
# active_connections: List[WebSocket] = []
# # ===== Slack環境変数 =====
# SLACK_SIGNING_SECRET = os.getenv("SLACK_SIGNING_SECRET")
# SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")



