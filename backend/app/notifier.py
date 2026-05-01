import os
from twilio.rest import Client

def send_sms_alert(message, to_number):
    """
    Sends an SMS alert using Twilio.
    Requires environment variables:
    - TWILIO_ACCOUNT_SID
    - TWILIO_AUTH_TOKEN
    - TWILIO_NUMBER
    """
    account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
    auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
    from_number = os.environ.get('TWILIO_NUMBER')
    
    if not all([account_sid, auth_token, from_number]):
        print("Twilio credentials missing. SMS alert skipped.")
        print(f"DEBUG - SMS to {to_number}: {message}")
        return False
        
    try:
        client = Client(account_sid, auth_token)
        message = client.messages.create(
            body=message,
            from_=from_number,
            to=to_number
        )
        print(f"SMS sent successfully: {message.sid}")
        return True
    except Exception as e:
        print(f"Twilio error: {e}")
        return False
