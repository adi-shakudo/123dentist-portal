import requests
from config import MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM, APP_BASE_URL


def _send(to: str, subject: str, body: str):
    if not MAILGUN_API_KEY:
        print(f"[email] MAILGUN_API_KEY not set — skipping email to {to}")
        return
    try:
        resp = requests.post(
            f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages",
            auth=("api", MAILGUN_API_KEY),
            data={"from": MAILGUN_FROM, "to": to, "subject": subject, "text": body},
            timeout=10,
        )
        if resp.status_code == 200:
            print(f"[email] OK {resp.status_code} — '{subject}' to {to}")
        else:
            print(f"[email] FAILED {resp.status_code} — {resp.text[:200]}")
    except Exception as e:
        print(f"[email] Exception: {e}")


def send_welcome_email(clinic_name: str, email: str, username: str, password: str):
    body = f"""Welcome to the 123Dentist Partner Portal!

Your onboarding portal account has been created. Use the credentials below to log in and track your acquisition checklist.

Portal: {APP_BASE_URL}
Username: {username}
Password: {password}

Once you log in, you will see your full task list, required documents, and real-time status updates from the 123Dentist team.

If you have trouble logging in, use the "Forgot Password" link on the login page.

— The 123Dentist Onboarding Team
"""
    _send(email, f"Your 123Dentist Partner Portal Access — {clinic_name}", body)


def send_password_reset_email(email: str, username: str, new_password: str):
    body = f"""Your 123Dentist Partner Portal password has been reset.

Portal: {APP_BASE_URL}
Username: {username}
New Password: {new_password}

Use these credentials to log back in. If you did not request this reset, contact your 123Dentist onboarding contact.

— The 123Dentist Onboarding Team
"""
    _send(email, "Your 123Dentist Portal Password Has Been Reset", body)


def send_sent_back_notification(
    clinic_name: str,
    clinic_email: str,
    task_name: str,
    task_ref: str,
    what_to_provide: str | None,
):
    body = f"""Hello {clinic_name},

One of your onboarding tasks requires your attention:

Task: {task_ref} — {task_name}
Status: Sent Back for Revision
{f"What to provide: {what_to_provide}" if what_to_provide else ""}

Please review the instructions on your portal and resubmit the required information.

Portal: {APP_BASE_URL}

— The 123Dentist Onboarding Team
"""
    _send(clinic_email, f"Action Required: {task_ref} — {task_name}", body)
