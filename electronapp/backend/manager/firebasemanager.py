# managers/firebase_manager.py
from datetime import datetime
import pytz
from google.cloud.firestore_v1.client import Client

class FirebaseManager:
    def __init__(self, db: Client):
        self.db = db
        self.tz = pytz.timezone("Asia/Tokyo")

    def create_or_update_user(
        self,
        user_id: str,
        real_name: str,
        display_name: str,
        email: str = None
    ):
        """アプリ利用者を登録または更新"""
        ref = self.db.collection("users").document(user_id)
        now = datetime.now(self.tz)

        data = {
            "user_id": user_id,
            "real_name": real_name,
            "display_name": display_name,
            "email": email,
            "updated_at": now
        }

        # 既存ユーザなら更新、なければ新規登録
        doc = ref.get()
        if doc.exists:
            ref.update(data)
        else:
            data["created_at"] = now
            ref.set(data)

        return data


    def receive_message(self, receiver_id: str, sender_id: str,
                     message_id: str, channel_id: str, text: str,
                     is_ai=False, is_bot=False, is_see=False, channel_type="im"):
        """
        Firestoreにメッセージを保存
        receiver_id : Firestore上のアプリ利用者（自分）
        sender_id   : 発信者のSlackユーザID（relationsで参照）
        """
        ref = (
            self.db.collection("users")
            .document(receiver_id)
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
