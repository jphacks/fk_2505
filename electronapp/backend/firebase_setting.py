# Standard Library
import os

# Third Party Library
from firebase_admin import credentials

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

cred = credentials.Certificate(firebase_credentials)
