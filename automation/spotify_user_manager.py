"""
Spotify Developer Dashboard - User Management Automation
=========================================================
Automates adding users to the 'rewrap' app on Spotify Developer Dashboard.
If the user limit is reached (no input fields visible), removes the first user
and then adds the new one.

Usage (standalone):
    python spotify_user_manager.py --name "John Doe" --email "john@gmail.com"

Usage (as a module / Flask integration):
    from spotify_user_manager import add_spotify_user
    result = add_spotify_user(name="John Doe", email="john@gmail.com")

Dependencies:
    pip install playwright python-dotenv
    playwright install chromium
"""

import os
import sys
import time
import logging
import argparse
from dataclasses import dataclass
from typing import Optional

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Logging setup — structured, coloured output so progress is easy to follow
# ---------------------------------------------------------------------------

LOG_FORMAT = "%(asctime)s  %(levelname)-8s  %(message)s"
DATE_FORMAT = "%H:%M:%S"

logging.basicConfig(
    level=logging.INFO,
    format=LOG_FORMAT,
    datefmt=DATE_FORMAT,
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("spotify_user_manager")

# ---------------------------------------------------------------------------
# Config / constants
# ---------------------------------------------------------------------------

DASHBOARD_URL   = "https://developer.spotify.com/dashboard"
APP_USERS_URL   = "https://developer.spotify.com/dashboard/700a2a6962fc423d89680261ed6d2477/users"
LOGIN_URL       = "https://accounts.spotify.com/login"
TIMEOUT_MS      = 15_000            # 15 s default element timeout
NAV_TIMEOUT_MS  = 30_000            # 30 s for full page navigations
HEADLESS        = True              # set False to watch the browser

# ---------------------------------------------------------------------------
# Result dataclass — handy for Flask consumers
# ---------------------------------------------------------------------------

@dataclass
class AddUserResult:
    success: bool
    message: str
    removed_user: Optional[str] = None   # email that was evicted, if any


# ---------------------------------------------------------------------------
# Core automation
# ---------------------------------------------------------------------------

def add_spotify_user(
    name: str,
    email: str,
    spotify_email: Optional[str] = None,
    spotify_password: Optional[str] = None,
    headless: bool = HEADLESS,
) -> AddUserResult:
    """
    Add *email* (with display name *name*) to the 'rewrap' Spotify app.

    Returns an AddUserResult with success/failure details.
    Raises no exceptions — all errors are caught and returned in the result.
    """

    backend_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend", ".env")
    load_dotenv(backend_env)
    load_dotenv()

    sp_email    = spotify_email    or os.getenv("SPOTIFY_DEV_EMAIL")
    sp_password = spotify_password or os.getenv("SPOTIFY_DEV_PASSWORD")

    if not sp_email or not sp_password:
        msg = (
            "Spotify credentials not found. "
            "Set SPOTIFY_DEV_EMAIL and SPOTIFY_DEV_PASSWORD env vars "
            "or pass them as arguments."
        )
        log.error(msg)
        return AddUserResult(success=False, message=msg)

    try:
        from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    except ImportError:
        msg = (
            "Playwright is not installed. "
            "Run: pip install playwright && playwright install chromium"
        )
        log.error(msg)
        return AddUserResult(success=False, message=msg)

    removed_user: Optional[str] = None
    session_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".spotify_session")

    try:
        with sync_playwright() as pw:
            log.info("Launching browser with persistent session (headless=%s)…", headless)
            try:
                ctx = pw.chromium.launch_persistent_context(
                    user_data_dir=session_dir,
                    channel="chrome",
                    headless=headless,
                    viewport={"width": 1280, "height": 900},
                    user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
                    args=[
                        "--disable-blink-features=AutomationControlled",
                        "--no-sandbox",
                        "--disable-setuid-sandbox"
                    ]
                )
            except Exception:
                ctx = pw.chromium.launch_persistent_context(
                    user_data_dir=session_dir,
                    headless=headless,
                    viewport={"width": 1280, "height": 900},
                    user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
                    args=[
                        "--disable-blink-features=AutomationControlled",
                        "--no-sandbox",
                        "--disable-setuid-sandbox"
                    ]
                )
            page = ctx.pages[0] if ctx.pages else ctx.new_page()
            page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            page.set_default_timeout(TIMEOUT_MS)
            page.set_default_navigation_timeout(NAV_TIMEOUT_MS)

            sp_dc_cookie = os.getenv("SPOTIFY_SP_DC")
            if sp_dc_cookie:
                log.info("Injecting SPOTIFY_SP_DC session cookie into browser context...")
                ctx.add_cookies([{
                    'name': 'sp_dc',
                    'value': sp_dc_cookie.strip(),
                    'domain': '.spotify.com',
                    'path': '/',
                    'secure': True,
                    'httpOnly': True
                }])


            # ----------------------------------------------------------------
            # 1. Check if already logged in via persistent session
            # ----------------------------------------------------------------
            log.info("Navigating to User Management page...")
            page.goto(APP_USERS_URL, wait_until="networkidle")
            page.wait_for_timeout(2000)

            # Check if login is required
            if "accounts.spotify.com" in page.url or "login" in page.url or page.url.rstrip('/') == "https://developer.spotify.com":
                log.info("Session expired or unauthenticated. Performing Spotify login...")

                if not headless:
                    log.info("--------------------------------------------------")
                    log.info("PLEASE LOG IN TO SPOTIFY IN THE OPEN BROWSER WINDOW.")
                    log.info("Once logged in, your session cookies will be saved.")
                    log.info("--------------------------------------------------")

                    page.goto(LOGIN_URL, wait_until="domcontentloaded")
                    try:
                        page.wait_for_url(
                            lambda u: "developer.spotify.com" in u and "accounts.spotify.com" not in u,
                            timeout=300_000
                        )
                        log.info("Authentication successful! Session cookies saved to .spotify_session")
                        page.wait_for_timeout(3000)
                    except Exception as e:
                        log.warning("Timed out waiting for manual login. Will attempt auto-fill... %s", e)


                if "developer.spotify.com/dashboard" not in page.url:
                    page.goto(LOGIN_URL, wait_until="domcontentloaded")
                    log.info("Entering username…")
                    page.wait_for_selector('[data-testid="login-username"]', timeout=TIMEOUT_MS)
                    page.click('[data-testid="login-username"]')
                    page.keyboard.type(sp_email, delay=50)

                    password_visible = page.is_visible('[data-testid="login-password"]')

                    if not password_visible:
                        log.info("Two-step login detected — clicking Continue…")
                        page.click('[data-testid="login-button"]')
                        page.wait_for_timeout(2000)

                        page_text = page.inner_text("body")
                        if "Oops! Something went wrong" in page_text or "check out our help area" in page_text:
                            raise RuntimeError(
                                "Spotify reCAPTCHA bot security blocked automated login. "
                                "Please run 'python ../automation/spotify_user_manager.py --no-headless --name \"Admin\" --email \"admin@example.com\"' "
                                "and log in once in the browser window to save session cookies."
                            )

                        page.wait_for_selector('[data-testid="login-password"]', timeout=TIMEOUT_MS, state="visible")

                    log.info("Entering password…")
                    page.click('[data-testid="login-password"]')
                    page.keyboard.type(sp_password, delay=50)

                    log.info("Clicking Log In button…")
                    page.click('[data-testid="login-button"]')
                    page.wait_for_load_state("domcontentloaded")

                log.info("Login successful. Navigating to User Management page...")
                page.goto(APP_USERS_URL, wait_until="domcontentloaded")
                page.wait_for_timeout(2000)

            log.info("User Management page loaded. URL: %s", page.url)




            # ----------------------------------------------------------------
            # 3. Check whether the add-user form is available
            #    Wait up to 10s for any input to appear before deciding
            # ----------------------------------------------------------------
            log.info("Waiting for page inputs to render...")
            try:
                page.wait_for_selector("input", timeout=10_000, state="visible")
            except Exception:
                log.warning("No input elements visible after 10s — may be at limit.")

            name_field  = _get_field(page, "name")
            email_field = _get_field(page, "email")
            log.info("Field detection — name_field: %s, email_field: %s",
                     "found" if name_field else "NOT FOUND",
                     "found" if email_field else "NOT FOUND")

            # Check X/5 added counter to detect limit
            # Log the counter for info, but use field presence as the real check
            _is_at_limit(page)
            at_limit = (name_field is None or email_field is None)
            log.info("User limit reached: %s", at_limit)

            if at_limit:
                log.warning("User limit reached — removing first user to make room...")
                _save_snapshot(page, "users_limit_snapshot.html")
                removed_user = _remove_first_user(page)
                log.info("Removed user: %s", removed_user or "(unknown)")

                log.info("Waiting for form fields to reappear...")
                try:
                    page.wait_for_selector("input#name", timeout=10_000, state="visible")
                except Exception:
                    pass
                name_field  = _get_field(page, "name")
                email_field = _get_field(page, "email")

                if name_field is None or email_field is None:
                    _save_snapshot(page, "after_removal_snapshot.html")
                    raise RuntimeError(
                        "Form fields still not visible after removing a user. "
                        "Snapshot saved to after_removal_snapshot.html."
                    )


            # ----------------------------------------------------------------
            # 5. Fill in name + email and submit
            # ----------------------------------------------------------------
            log.info("Filling in name: '%s'", name)
            name_field.fill(name)

            log.info("Filling in email: '%s'", email)
            email_field.fill(email)

            log.info("Clicking 'Add user' button…")
            _click_add_user(page)

            # Wait for confirmation (toast / list update)
            log.info("Waiting for confirmation…")
            _wait_for_success(page, email)

            log.info("User '%s' <%s> successfully added.", name, email)

            ctx.close()

            return AddUserResult(
                success=True,
                message=f"User '{name}' <{email}> added successfully.",
                removed_user=removed_user,
            )

    except Exception as exc:  # noqa: BLE001
        log.exception("Unexpected error during automation: %s", exc)
        return AddUserResult(
            success=False,
            message=str(exc),
            removed_user=removed_user,
        )


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _is_at_limit(page) -> bool:
    """
    Check the "X/5 added" counter span. Logs the count if found.
    Returns True if X >= max, False otherwise (or if span not found).
    Also used purely for logging — caller uses field presence as primary signal.
    """
    import re
    try:
        for el in page.query_selector_all("span, [data-encore-id='type']"):
            try:
                txt = el.inner_text().strip()
                if not txt:
                    continue
                m = re.match(r'(\d+)/(\d+)\s+added', txt)
                if m:
                    current, maximum = int(m.group(1)), int(m.group(2))
                    log.info("User count: %d/%d", current, maximum)
                    return current >= maximum
            except Exception:
                continue
        log.info("User count span not found on page (will rely on field detection).")
    except Exception as exc:
        log.warning("Could not read user count: %s", exc)
    return False


def _fill(page, selector: str, value: str) -> None:
    """Wait for element and fill it."""
    page.wait_for_selector(selector)
    page.fill(selector, value)



def _save_snapshot(page, filename: str) -> None:
    """Save page HTML to a local file for debugging selector issues."""
    try:
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(page.content())
        log.info("Debug snapshot saved: %s", path)
    except Exception as exc:
        log.warning("Could not save snapshot: %s", exc)


def _find_app_link(page, app_name: str):
    """
    Return the element (link / button / card) whose visible text matches
    *app_name* (case-insensitive). Returns None if not found.
    Tries multiple strategies to handle JS-rendered dashboards.
    """
    # Strategy 1: exact text match on any clickable/visible element
    for selector in ["a", "button", "[role='link']", "[role='button']",
                     "h2", "h3", "li", "div[class*='app']", "div[class*='card']"]:
        try:
            for el in page.query_selector_all(selector):
                try:
                    txt = el.inner_text().strip()
                    if txt.lower() == app_name.lower():
                        # If this element itself isn't clickable, find its
                        # closest anchor/button ancestor
                        parent = el.evaluate_handle(
                            "el => el.closest('a, button, [role=\'link\']') || el"
                        ).as_element()
                        return parent or el
                except Exception:
                    continue
        except Exception:
            continue

    # Strategy 2: Playwright text selector
    try:
        el = page.query_selector(f"text='{app_name}'")
        if el:
            return el
    except Exception:
        pass

    # Strategy 3: case-insensitive contains
    try:
        el = page.query_selector(f":text-is('{app_name}')")
        if el:
            return el
    except Exception:
        pass

    return None


def _click_tab(page, tab_text: str) -> bool:
    """
    Click a navigation tab whose visible text contains *tab_text*.
    Returns True if clicked, False if not found.
    """
    selectors = [
        f"[role='tab']:has-text('{tab_text}')",
        f"nav a:has-text('{tab_text}')",
        f"nav button:has-text('{tab_text}')",
        f"ul li a:has-text('{tab_text}')",
        f"ul li button:has-text('{tab_text}')",
        f"a:has-text('{tab_text}')",
        f"button:has-text('{tab_text}')",
        f"text='{tab_text}'",
    ]
    for sel in selectors:
        try:
            el = page.query_selector(sel)
            if el and el.is_visible():
                el.click()
                log.info("Clicked tab using selector: %s", sel)
                return True
        except Exception:
            continue
    return False


def _get_field(page, field_id: str):
    """
    Find an input by its id attribute directly.
    field_id: "name" or "email"
    """
    return page.query_selector(f"input#{field_id}")


def _click_add_user(page) -> None:
    """Click the Add user submit button."""
    el = page.query_selector("button:has-text('Add user')") or page.query_selector("form button[type='submit']")
    if el and el.is_enabled():
        el.click()
        return
    raise RuntimeError("Could not find the 'Add user' submit button.")


def _wait_for_success(page, email: str, timeout_ms: int = 12_000) -> None:
    """
    Wait for the email to appear in the table/page content.
    """
    deadline = time.time() + timeout_ms / 1000
    email_lower = email.lower()
    while time.time() < deadline:
        if email_lower in page.content().lower():
            log.info("Email '%s' verified in page content — user added successfully.", email)
            return
        time.sleep(0.5)

    if email_lower not in page.content().lower():
        raise RuntimeError(f"User '{email}' was submitted but did not appear in the User Management list.")


def _remove_first_user(page) -> Optional[str]:
    """
    Find the first user row that is NOT affan.abid99@gmail.com,
    click its 'User options' button (aria-label="User options"),
    then click 'Remove user' in the popup.
    Returns the removed user's email.
    """
    import re

    PROTECTED_EMAIL = "affan.abid99@gmail.com"

    # Get all user rows from the table
    rows = page.query_selector_all("tbody tr[data-encore-id='tableRow']")
    if not rows:
        raise RuntimeError("No user rows found in the table.")

    log.info("Found %d user row(s) in the table.", len(rows))

    target_row = None
    removed_email = None

    for row in rows:
        try:
            # Email is in the 3rd <td> (index 2)
            cells = row.query_selector_all("td")
            if len(cells) < 3:
                continue
            email_text = cells[2].inner_text().strip()
            if email_text.lower() == PROTECTED_EMAIL.lower():
                log.info("Skipping protected user: %s", email_text)
                continue
            # This is our candidate — take the first non-protected row
            target_row = row
            removed_email = email_text
            break
        except Exception:
            continue

    if target_row is None:
        raise RuntimeError(
            f"All users are protected or no removable user found. "
            f"Cannot remove anyone (protected: {PROTECTED_EMAIL})."
        )

    log.info("Will remove user: %s", removed_email)

    # Click the 'User options' button (three dots) in this row
    options_btn = target_row.query_selector("button[aria-label='User options']")
    if not options_btn:
        raise RuntimeError(
            f"Could not find 'User options' button in row for {removed_email}."
        )

    options_btn.click()
    log.info("Clicked 'User options' button for: %s", removed_email)
    page.wait_for_timeout(600)

    # Click 'Remove user' in the popup
    # Structure: button[data-encore-id="popoverNavigationLink"] contains span "Remove user"
    remove_btn = page.wait_for_selector(
        "button[data-encore-id='popoverNavigationLink']",
        timeout=5_000,
        state="visible",
    )
    if not remove_btn:
        raise RuntimeError("'Remove user' popup button not found.")

    remove_btn.click()
    log.info("Clicked 'Remove user' for: %s", removed_email)

    _confirm_removal(page)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)

    return removed_email

def _confirm_removal(page) -> None:
    """
    If a confirmation dialog pops up after clicking Remove, confirm it.
    """
    confirm_selectors = [
        "button:has-text('Confirm')",
        "button:has-text('Remove')",
        "button:has-text('Yes')",
        "button:has-text('Delete')",
        "[role='dialog'] button:has-text('Remove')",
    ]
    for sel in confirm_selectors:
        try:
            el = page.query_selector(sel)
            if el and el.is_visible():
                el.click()
                log.info("Confirmed removal dialog.")
                return
        except Exception:
            continue
    # No confirmation dialog — that's fine
    log.debug("No confirmation dialog detected.")


# ---------------------------------------------------------------------------
# Flask-friendly wrapper
# ---------------------------------------------------------------------------

def flask_add_user(name: str, email: str) -> dict:
    """
    Thin wrapper that returns a plain dict — easy to jsonify in Flask.

    Example Flask route:
        @app.route("/add-user", methods=["POST"])
        def add_user():
            data = request.json
            result = flask_add_user(data["name"], data["email"])
            return jsonify(result), 200 if result["success"] else 500
    """
    result = add_spotify_user(name=name, email=email)
    return {
        "success":      result.success,
        "message":      result.message,
        "removed_user": result.removed_user,
    }


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Add a user to the Spotify 'rewrap' developer app."
    )
    parser.add_argument("--name",     required=True, help="User's full name")
    parser.add_argument("--email",    required=True, help="User's email address")
    parser.add_argument("--no-headless", action="store_true",
                        help="Run browser in visible (non-headless) mode")
    parser.add_argument("--sp-email",    default=None,
                        help="Spotify dev account email (overrides env var)")
    parser.add_argument("--sp-password", default=None,
                        help="Spotify dev account password (overrides env var)")
    args = parser.parse_args()

    result = add_spotify_user(
        name=args.name,
        email=args.email,
        spotify_email=args.sp_email,
        spotify_password=args.sp_password,
        headless=not args.no_headless,
    )

    if result.success:
        log.info("Done. %s", result.message)
        if result.removed_user:
            log.info("Note: '%s' was removed to make room.", result.removed_user)
        sys.exit(0)
    else:
        log.error("Failed. %s", result.message)
        sys.exit(1)