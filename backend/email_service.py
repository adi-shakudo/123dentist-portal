import requests
from config import MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM, APP_BASE_URL


def send_sent_back_notification(
    clinic_name: str,
    clinic_email: str,
    task_name: str,
    task_ref: str,
    what_to_provide: str | None,
):
    if not MAILGUN_API_KEY:
        print(f"[email] MAILGUN_API_KEY not set — skipping email to {clinic_email}")
        return

    body = f"""Hello {clinic_name},

One of your onboarding tasks requires your attention:

Task: {task_ref} — {task_name}
Status: Sent Back for Revision

{f"What to provide: {what_to_provide}" if what_to_provide else ""}

Please review the instructions on your portal and resubmit the required information.

View your portal: {APP_BASE_URL}

If you have questions, please contact your 123Dentist onboarding contact.

— The 123Dentist Onboarding Team
"""

    try:
        requests.post(
            f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages",
            auth=("api", MAILGUN_API_KEY),
            data={
                "from": MAILGUN_FROM,
                "to": clinic_email,
                "subject": f"Action Required: {task_ref} — {task_name}",
                "text": body,
            },
            timeout=10,
        )
        print(f"[email] Sent 'Sent Back for Revision' notification to {clinic_email}")
    except Exception as e:
        print(f"[email] Failed to send email: {e}")
