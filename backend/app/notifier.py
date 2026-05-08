import os
from twilio.rest import Client
from firebase_admin import messaging

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
    """Sends a push notification to all users subscribed to the 'alerts' topic."""
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            topic='alerts',
        )
        response = messaging.send(message)
        print('Successfully sent push message:', response)
        return True
    except Exception as e:
        print('Error sending push message:', e)
        return False
