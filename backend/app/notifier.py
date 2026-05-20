import os
from twilio.rest import Client
from firebase_admin import messaging
from .firebase_config import db, firebase_initialized

def send_sms_alert(message, to_number):
    """Sends an SMS alert using Twilio."""
    account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
    auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
    from_number = os.environ.get('TWILIO_NUMBER')
    
    if not all([account_sid, auth_token, from_number]):
        print("Twilio credentials missing. SMS alert skipped.")
        return False
        
    try:
        client = Client(account_sid, auth_token)
        msg = client.messages.create(body=message, from_=from_number, to=to_number)
        return True
    except Exception as e:
        print(f"Twilio error: {e}")
        return False

def send_push_notification(title, body):
    """Sends a push notification to all registered tokens using FCM multicast."""
    try:
        if not firebase_initialized or not db:
            print("Firebase not initialized. Push notification skipped.")
            return False

        # Query all registered push tokens
        tokens_ref = db.collection('push_tokens')
        docs = tokens_ref.stream()
        registration_tokens = [doc.id for doc in docs]

        if not registration_tokens:
            print("[FCM] No push tokens registered in Firestore. Push skipped.")
            return False

        print(f"[FCM] Found {len(registration_tokens)} active push token(s). Broad-casting...")

        # Multicast message to all active tokens
        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            tokens=registration_tokens,
        )
        response = messaging.send_each_for_multicast(message)
        print(f"[FCM] Multicast complete: {response.success_count} success, {response.failure_count} failure.")
        return True
    except Exception as e:
        print('[FCM] Error sending multicast push message:', e)
        return False
