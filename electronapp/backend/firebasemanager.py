# managers/firebase_manager.py
from datetime import datetime
from typing import Optional

import firebase_setting
import pytz
from firebase_admin import firestore, initialize_app
from google.cloud.firestore_v1.client import Client


class FirebaseManager:
    def __init__(self, db: Client):
        self.db = db
        self.tz = pytz.timezone("Asia/Tokyo")

    def create_or_update_user(
        self,
        user_id: str,
        real_name: Optional[str] = None,
        display_name: Optional[str] = None,
        email: Optional[str] = None,
        slack_team_id: Optional[str] = None,
        slack_user_token: Optional[str] = None,
    ):
        """アプリ利用者を登録または更新（Slack連携情報付き）"""
        ref = self.db.collection("users").document(user_id)
        now = datetime.now(self.tz)

        data = {
            "user_id": user_id,
            "real_name": real_name,
            "display_name": display_name,
            "email": email,
            "slack_team_id": slack_team_id,
            "slack_user_token": slack_user_token,
            "updated_at": now,
        }

        # 既存ユーザなら更新、なければ新規登録
        doc = ref.get()
        if doc.exists:
            ref.update(data)
        else:
            data["created_at"] = now
            ref.set(data)

        return data

    # def create_or_update_user(
    #     self,
    #     user_id: str,
    #     real_name: Optional[str] = None,
    #     display_name: Optional[str] = None,
    #     email: Optional[str] = None,
    # ):
    #     """アプリ利用者を登録または更新"""
    #     ref = self.db.collection("users").document(user_id)
    #     now = datetime.now(self.tz)

    #     data = {
    #         "user_id": user_id,
    #         "real_name": real_name,
    #         "display_name": display_name,
    #         "email": email,
    #         "updated_at": now
    #     }

    #     # 既存ユーザなら更新、なければ新規登録
    #     doc = ref.get()
    #     if doc.exists:
    #         ref.update(data)
    #     else:
    #         data["created_at"] = now
    #         ref.set(data)

    #     return data
    
    def receive_message(
        self,
        receiver_id: str,
        sender_id: str,
        message_id: str,
        channel_id: str,
        text: str,
        is_ai: bool = False,
        is_bot: bool = False,
        is_see: bool = False,
        channel_type: str = "im",
    ):
        """
        Firestore にメッセージを保存。
        receiver_id: Firestore 上のアプリ利用者（自分）
        sender_id  : 発信者の Slack ユーザー ID
        """
        user_ref = self.db.collection("users").document(receiver_id)
        user_doc = user_ref.get()
        
        # 🔍 デバッグ出力追加
        print(f"🔍 Firestore Document Path: users/{receiver_id}")
        print(f"🔍 Exists?: {user_doc.exists}")
        print(f"🔍 Raw Document Data: {user_doc.to_dict()}")

        if not user_doc.exists:
            print(f"⚠️ Firestore: ユーザー {receiver_id} は未登録のためメッセージを保存しません。")
            return None

        now = datetime.now(self.tz)

        message_ref = (
            user_ref
            .collection("messages")
            .document(message_id)
        )

        message_data = {
            "sender_id": sender_id,
            "receiver_id": receiver_id,
            "slack_message_id": message_id,
            "channel_id": channel_id,
            "text": text,
            "is_ai": is_ai,
            "is_bot": is_bot,
            "is_see": is_see,
            "channel_type": channel_type,
            "timestamp": now,
            "created_at": now,
        }

        message_ref.set(message_data)
        print(f"✅ Firestore: {receiver_id} の messages に保存完了 ({message_id})")
        return message_data
    
    def send_message(self, receiver_id: str, sender_id: str,
                     message_id: str, channel_id: str, text: str,
                     is_ai=False, is_bot=False, is_see=False, channel_type="im"):
        """
        Firestoreにメッセージを保存
        receiver_id : Firestore上のアプリ利用者（自分）
        sender_id   : 発信者のSlackユーザID（relationsで参照）
        """
        ref = (
            self.db.collection("users")
            .document(sender_id)
            .collection("messages")
            .document(message_id)
        )

        now = datetime.now(self.tz)
        data = {
            "sender_id": sender_id,
            "receiver_id": receiver_id,
            "slack_message_id": message_id,
            "channel_id": channel_id,
            "text": text,
            "is_ai": is_ai,
            "is_bot": is_bot,
            "is_see": is_see,
            "channel_type": channel_type,
            "timestamp": now,
            "created_at": now
        }

        ref.set(data)
        return data


# --- グローバルインスタンスを生成 ---
initialize_app(firebase_setting.cred)
db = firestore.client()
firebase_manager = FirebaseManager(db)