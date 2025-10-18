import hashlib
import hmac
import json
import os
from datetime import datetime

import firebase_admin
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request

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

