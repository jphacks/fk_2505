import os
from firebase_admin import credentials, firestore, initialize_app
from dotenv import load_dotenv

# .env を読み込む（環境変数が設定済みなら不要）
load_dotenv()

google_url = "https://www.googleapis.com/oauth2/v1/certs"

firebase_credentials = {
    "type": "service_account",
    "project_id": os.environ["FIREBASE_PROJECT_ID"],
    "private_key_id": os.environ["FIREBASE_PRIVATE_KEY_ID"],
    "private_key": os.environ["FIREBASE_PRIVATE_KEY"].replace("\\n", "\n"),
    "client_email": os.environ["FIREBASE_CLIENT_EMAIL"],
    "client_id": os.environ["FIREBASE_CLIENT_ID"],
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": google_url,
    "client_x509_cert_url": os.environ["FIREBASE_CLIENT_CERT_URL"],
}

# Firebase初期化
cred = credentials.Certificate(firebase_credentials)
app = initialize_app(cred)
db = firestore.client()

# # Firestore書き込みテスト
doc_ref = db.collection("test_collection").document("test_doc")
doc_ref.set({"message": "Hello from FastAPI!", "success": True})

# Firestore読み取りテスト
doc = doc_ref.get()
print("✅ Firestore connection successful.")
print("📄 Document data:", doc.to_dict())
