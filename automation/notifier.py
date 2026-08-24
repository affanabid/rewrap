"""
notifier.py
-----------
Sends email notifications whenever a user is added to (or removed from)
the Rewrap Spotify app.

Supports HTTP-based Email APIs (Resend, Brevo, SendGrid) over Port 443 HTTPS
(works on cloud platforms like Render, Vercel, Railway) with smtplib fallback for local dev.

Environment variables:
    RESEND_API_KEY          — API key from Resend.com (Recommended for Render)
    BREVO_API_KEY           — API key from Brevo.com (Sendinblue)
    SENDGRID_API_KEY        — API key from SendGrid.com
    NOTIFY_RECIPIENT_EMAIL  — Email address that receives admin notifications
    NOTIFY_SENDER_EMAIL     — Optional custom sender email address
    NOTIFY_SENDER_PASSWORD  — Gmail App Password (for local smtplib fallback)
"""

import os
import json
import urllib.request
import urllib.error
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
    Prefers HTTP-based APIs (Resend / Brevo / SendGrid) over Port 443,
    falling back to smtplib for local dev.
    """
    recipient = recipient_email or os.getenv("NOTIFY_RECIPIENT_EMAIL") or os.getenv("NOTIFY_SENDER_EMAIL")

    if not recipient:
        log.warning("Email notification skipped — no NOTIFY_RECIPIENT_EMAIL set in environment.")
        return False

    subject, body_html, body_text = _build_message(
        name=name,
        email=email,
        removed_name=removed_name,
        removed_email=removed_email,
    )

    # 1. Try Resend HTTP API (Port 443 HTTPS)
    resend_key = os.getenv("RESEND_API_KEY")
    if resend_key:
        return _send_via_resend(resend_key, recipient, subject, body_html, body_text)

    # 2. Try Brevo HTTP API (Port 443 HTTPS)
    brevo_key = os.getenv("BREVO_API_KEY")
    if brevo_key:
        return _send_via_brevo(brevo_key, recipient, subject, body_html, body_text)

    # 3. Try SendGrid HTTP API (Port 443 HTTPS)
    sendgrid_key = os.getenv("SENDGRID_API_KEY")
    if sendgrid_key:
        return _send_via_sendgrid(sendgrid_key, recipient, subject, body_html, body_text)

    # 4. Fallback to standard SMTP (Local Dev / Unblocked environments)
    sender = sender_email or os.getenv("NOTIFY_SENDER_EMAIL")
    password = sender_password or os.getenv("NOTIFY_SENDER_PASSWORD")

    if sender and password:
        return _send_via_smtp(sender, password, recipient, subject, body_html, body_text)

    log.warning(
        "Email notification skipped — no HTTP API keys (RESEND_API_KEY/BREVO_API_KEY/SENDGRID_API_KEY) "
        "or SMTP credentials found."
    )
    return False


def _send_via_resend(api_key: str, recipient: str, subject: str, body_html: str, body_text: str) -> bool:
    """Send email via Resend HTTP API over Port 443 HTTPS."""
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "Rewrap-Notifier/1.0",
    }
    from_email = os.getenv("NOTIFY_SENDER_EMAIL") or "onboarding@resend.dev"
    payload = {
        "from": f"Rewrap Notifier <{from_email}>",
        "to": [recipient],
        "subject": subject,
        "html": body_html,
        "text": body_text,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status in (200, 201, 202):
                log.info("Notification email sent via Resend HTTP API to %s", recipient)
                return True
    except Exception as e:
        log.error("Failed to send email via Resend HTTP API: %s", e)
    return False


def _send_via_brevo(api_key: str, recipient: str, subject: str, body_html: str, body_text: str) -> bool:
    """Send email via Brevo (Sendinblue) HTTP API over Port 443 HTTPS."""
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "api-key": api_key,
        "Content-Type": "application/json",
        "User-Agent": "Rewrap-Notifier/1.0",
    }
    from_email = os.getenv("NOTIFY_SENDER_EMAIL") or "noreply@rewrap.app"
    payload = {
        "sender": {"name": "Rewrap Notifier", "email": from_email},
        "to": [{"email": recipient}],
        "subject": subject,
        "htmlContent": body_html,
        "textContent": body_text,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status in (200, 201, 202):
                log.info("Notification email sent via Brevo HTTP API to %s", recipient)
                return True
    except Exception as e:
        log.error("Failed to send email via Brevo HTTP API: %s", e)
    return False


def _send_via_sendgrid(api_key: str, recipient: str, subject: str, body_html: str, body_text: str) -> bool:
    """Send email via SendGrid HTTP API over Port 443 HTTPS."""
    url = "https://api.sendgrid.com/v3/mail/send"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "Rewrap-Notifier/1.0",
    }
    from_email = os.getenv("NOTIFY_SENDER_EMAIL") or "noreply@rewrap.app"
    payload = {
        "personalizations": [{"to": [{"email": recipient}]}],
        "from": {"email": from_email, "name": "Rewrap Notifier"},
        "subject": subject,
        "content": [
            {"type": "text/plain", "value": body_text},
            {"type": "text/html", "value": body_html},
        ],
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status in (200, 201, 202):
                log.info("Notification email sent via SendGrid HTTP API to %s", recipient)
                return True
    except Exception as e:
        log.error("Failed to send email via SendGrid HTTP API: %s", e)
    return False


def _send_via_smtp(sender: str, password: str, recipient: str, subject: str, body_html: str, body_text: str) -> bool:
    """Send email via standard SMTP (for local dev environments)."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Rewrap Notifier <{sender}>"
        msg["To"] = recipient
        msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=5) as server:
            server.ehlo()
            server.starttls()
            server.login(sender, password)
            server.sendmail(sender, recipient, msg.as_string())

        log.info("Notification email sent via SMTP to %s", recipient)
        return True
    except Exception as exc:
        log.error("Failed to send email via SMTP: %s", exc)
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
