"""
notifier.py
-----------
Sends email notifications whenever a user is added to (or removed from)
the Rewrap Spotify app.

Uses Python's built-in smtplib with Gmail SMTP — no extra dependencies.

Environment variables (add to your .env):
    NOTIFY_SENDER_EMAIL     — Gmail address sending the notification
    NOTIFY_SENDER_PASSWORD  — Gmail App Password (NOT your Gmail login password)
                              Generate one at: https://myaccount.google.com/apppasswords
    NOTIFY_RECIPIENT_EMAIL  — Address that receives the notifications
                              (can be the same as sender)

Integration (two lines in spotify_user_manager.py):
    from notifier import notify_user_added
    # call after successful add:
    notify_user_added(name=name, email=email, removed_name=removed_name, removed_email=removed_user)
"""

import os
import smtplib
import logging
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger("spotify_user_manager")

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


def notify_user_added(
    name: str,
    email: str,
    removed_name: Optional[str] = None,
    removed_email: Optional[str] = None,
    sender_email: Optional[str] = None,
    sender_password: Optional[str] = None,
    recipient_email: Optional[str] = None,
) -> bool:
    """
    Send an email notification about a newly added (and optionally removed) user.

    Returns True if sent successfully, False otherwise.
    Never raises — all errors are logged.
    """
    sender    = sender_email    or os.getenv("NOTIFY_SENDER_EMAIL")
    password  = sender_password or os.getenv("NOTIFY_SENDER_PASSWORD")
    recipient = recipient_email or os.getenv("NOTIFY_RECIPIENT_EMAIL")

    if not all([sender, password, recipient]):
        log.warning(
            "Email notification skipped — missing credentials. "
            "Set NOTIFY_SENDER_EMAIL, NOTIFY_SENDER_PASSWORD, NOTIFY_RECIPIENT_EMAIL in .env"
        )
        return False

    try:
        subject, body_html, body_text = _build_message(
            name=name,
            email=email,
            removed_name=removed_name,
            removed_email=removed_email,
        )

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"Rewrap Notifier <{sender}>"
        msg["To"]      = recipient
        msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(sender, password)
            server.sendmail(sender, recipient, msg.as_string())

        log.info("Notification email sent to %s", recipient)
        return True

    except smtplib.SMTPAuthenticationError:
        log.error(
            "Gmail authentication failed. Make sure you're using an App Password, "
            "not your Gmail login password. "
            "Generate one at: https://myaccount.google.com/apppasswords"
        )
        return False
    except Exception as exc:
        log.error("Failed to send notification email: %s", exc)
        return False


def _build_message(
    name: str,
    email: str,
    removed_name: Optional[str],
    removed_email: Optional[str],
) -> tuple[str, str, str]:
    """Build subject, HTML body, and plain-text body."""

    timestamp = datetime.now().strftime("%B %d, %Y at %I:%M %p")
    user_limit_hit = removed_email is not None

    # ---- Subject ----
    subject = f"[Rewrap] New user added: {name}"
    if user_limit_hit:
        subject = f"[Rewrap] User swapped — added: {name} / removed: {removed_email}"

    # ---- Plain text ----
    lines = [
        "REWRAP — USER MANAGEMENT NOTIFICATION",
        "=" * 40,
        "",
        "NEW USER ADDED",
        f"  Name   : {name}",
        f"  Email  : {email}",
        f"  Time   : {timestamp}",
        "",
    ]
    if user_limit_hit:
        lines += [
            "USER REMOVED (limit reached)",
            f"  Name   : {removed_name or 'Unknown'}",
            f"  Email  : {removed_email}",
            "",
            "The user limit (5/5) was reached. The oldest eligible user was",
            "automatically removed to make room for the new registration.",
            "",
        ]
    lines += ["— Rewrap Automation"]
    body_text = "\n".join(lines)

    # ---- HTML ----
    removed_block = ""
    if user_limit_hit:
        removed_block = f"""
        <tr><td colspan="2" style="padding:16px 0 4px;font-size:13px;
            font-weight:600;color:#b91c1c;text-transform:uppercase;
            letter-spacing:.05em;">User Removed (limit reached)</td></tr>
        <tr>
            <td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px;width:80px;">Name</td>
            <td style="padding:4px 0;font-size:14px;color:#111827;">{removed_name or "Unknown"}</td>
        </tr>
        <tr>
            <td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px;">Email</td>
            <td style="padding:4px 0;font-size:14px;color:#111827;">{removed_email}</td>
        </tr>
        <tr><td colspan="2" style="padding:12px 0 0;font-size:13px;color:#6b7280;">
            The 5/5 user limit was reached. The oldest eligible user was automatically
            removed to make room for this registration.
        </td></tr>
        """

    body_html = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,
        BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#f3f4f6;padding:32px 16px;">
        <tr><td align="center">
          <table width="520" cellpadding="0" cellspacing="0"
                 style="background:#ffffff;border-radius:12px;
                        box-shadow:0 1px 3px rgba(0,0,0,.08);overflow:hidden;">

            <!-- Header -->
            <tr><td style="background:#1DB954;padding:24px 32px;">
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,.75);
                  text-transform:uppercase;letter-spacing:.1em;">Rewrap</p>
              <h1 style="margin:4px 0 0;font-size:20px;color:#ffffff;font-weight:700;">
                User Management Notification
              </h1>
            </td></tr>

            <!-- Body -->
            <tr><td style="padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">

                <tr><td colspan="2" style="padding:0 0 4px;font-size:13px;
                    font-weight:600;color:#1DB954;text-transform:uppercase;
                    letter-spacing:.05em;">New User Added</td></tr>
                <tr>
                  <td style="padding:4px 12px 4px 0;color:#6b7280;
                      font-size:14px;width:80px;">Name</td>
                  <td style="padding:4px 0;font-size:14px;
                      font-weight:600;color:#111827;">{name}</td>
                </tr>
                <tr>
                  <td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px;">Email</td>
                  <td style="padding:4px 0;font-size:14px;color:#111827;">{email}</td>
                </tr>
                <tr>
                  <td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px;">Time</td>
                  <td style="padding:4px 0;font-size:14px;color:#6b7280;">{timestamp}</td>
                </tr>

                {removed_block}

              </table>
            </td></tr>

            <!-- Footer -->
            <tr><td style="padding:16px 32px;background:#f9fafb;
                border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Sent automatically by Rewrap user management automation.
              </p>
            </td></tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """

    return subject, body_html, body_text
