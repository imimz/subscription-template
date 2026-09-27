#!/usr/bin/env python3
"""
Emergency charge service for the PasarGuard subscription page.

The subscription page is a static template, so it cannot change a user's data
limit on its own (that needs an admin credential, which must never reach the
browser). This small service sits next to the panel, receives the user's
subscription token from the page, verifies it against the panel and adds a
fixed amount of free traffic so the user can reach the Telegram bot and renew.

Rules:
  * Only users whose status is `active` or `limited`, with a finite data limit,
    that are out of traffic or below the low-traffic threshold are eligible.
  * A user can claim once per purchase period. A new period starts when the
    admin changes the subscription (expire date or data limit changes, or the
    used traffic is reset), which is what happens on renewal.

Pure standard library: no pip install needed.
"""

from __future__ import annotations

import json
import logging
import os
import re
import sqlite3
import ssl
import sys
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest

MB = 1024 * 1024
TOKEN_RE = re.compile(r"^[A-Za-z0-9_\-.=]{8,512}$")
MAX_BODY_BYTES = 4096

log = logging.getLogger("emergency-charge")


def load_env_file(path: str) -> None:
    """Load KEY=VALUE lines into os.environ without overriding existing vars."""
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            os.environ.setdefault(key.strip(), value)


def env_str(name: str, default: str = "") -> str:
    """Like os.environ.get, but an empty value (KEY=) also falls back to the default."""
    return os.environ.get(name) or default


def env_bool(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None or value == "":
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


@dataclass(frozen=True)
class Config:
    panel_url: str
    sub_path: str
    admin_username: str
    admin_password: str
    api_key: str
    verify_panel_tls: bool
    charge_bytes: int
    threshold_bytes: int
    listen_host: str
    listen_port: int
    route_path: str
    allowed_origins: tuple[str, ...]
    db_path: str
    ssl_cert: str
    ssl_key: str
    trust_proxy: bool
    rate_limit_per_minute: int

    @classmethod
    def from_env(cls) -> "Config":
        panel_url = env_str("PANEL_URL", "").rstrip("/")
        if not panel_url:
            raise SystemExit("PANEL_URL is required (e.g. https://panel.example.com:8000)")

        api_key = env_str("PANEL_API_KEY", "").strip()
        admin_username = env_str("PANEL_ADMIN_USERNAME", "").strip()
        admin_password = env_str("PANEL_ADMIN_PASSWORD", "")
        if not api_key and not (admin_username and admin_password):
            raise SystemExit("Set PANEL_API_KEY or PANEL_ADMIN_USERNAME + PANEL_ADMIN_PASSWORD")

        origins = tuple(
            o.strip().rstrip("/") for o in env_str("ALLOWED_ORIGINS", "").split(",") if o.strip()
        )
        if not origins:
            raise SystemExit("ALLOWED_ORIGINS is required (the origin of your subscription page)")

        route_path = "/" + env_str("ROUTE_PATH", "/emergency-charge").strip("/")

        return cls(
            panel_url=panel_url,
            sub_path=env_str("SUB_PATH", "sub").strip("/"),
            admin_username=admin_username,
            admin_password=admin_password,
            api_key=api_key,
            verify_panel_tls=env_bool("PANEL_VERIFY_TLS", True),
            charge_bytes=int(float(env_str("CHARGE_MB", "500")) * MB),
            threshold_bytes=int(float(env_str("LOW_TRAFFIC_THRESHOLD_MB", "500")) * MB),
            listen_host=env_str("LISTEN_HOST", "127.0.0.1"),
            listen_port=int(env_str("LISTEN_PORT", "8765")),
            route_path=route_path,
            allowed_origins=origins,
            db_path=env_str("DB_PATH")
            or os.path.join(os.path.dirname(os.path.abspath(__file__)), "claims.db"),
            ssl_cert=env_str("SSL_CERT_FILE", ""),
            ssl_key=env_str("SSL_KEY_FILE", ""),
            trust_proxy=env_bool("TRUST_PROXY", False),
            rate_limit_per_minute=int(env_str("RATE_LIMIT_PER_MINUTE", "10")),
        )


class ChargeError(Exception):
    """An error returned to the page as {"ok": false, "code": ...}."""

    def __init__(self, http_status: int, code: str, message: str):
        super().__init__(message)
        self.http_status = http_status
        self.code = code
        self.message = message


class PanelClient:
    def __init__(self, config: Config):
        self.config = config
        self._token: str | None = None
        self._token_lock = threading.Lock()
        self._ssl_context = ssl.create_default_context() if config.verify_panel_tls else ssl._create_unverified_context()

    def _request(
        self,
        method: str,
        path: str,
        *,
        json_body: Any = None,
        form_body: dict[str, str] | None = None,
        headers: dict[str, str] | None = None,
    ) -> tuple[int, Any]:
        url = f"{self.config.panel_url}{path}"
        data = None
        req_headers = {"Accept": "application/json", **(headers or {})}
        if json_body is not None:
            data = json.dumps(json_body).encode()
            req_headers["Content-Type"] = "application/json"
        elif form_body is not None:
            data = urlparse.urlencode(form_body).encode()
            req_headers["Content-Type"] = "application/x-www-form-urlencoded"

        req = urlrequest.Request(url, data=data, method=method, headers=req_headers)
        try:
            with urlrequest.urlopen(req, timeout=15, context=self._ssl_context) as resp:
                raw = resp.read()
                return resp.status, json.loads(raw) if raw else None
        except urlerror.HTTPError as exc:
            raw = exc.read()
            try:
                body = json.loads(raw) if raw else None
            except ValueError:
                body = raw.decode(errors="replace")
            return exc.code, body
        except (urlerror.URLError, TimeoutError, OSError) as exc:
            log.error("Panel request %s %s failed: %s", method, path, exc)
            raise ChargeError(502, "panel_unreachable", "Panel is not reachable") from exc

    def _login(self) -> str:
        status, body = self._request(
            "POST",
            "/api/admin/token",
            form_body={"username": self.config.admin_username, "password": self.config.admin_password},
        )
        if status != 200 or not isinstance(body, dict) or "access_token" not in body:
            log.error("Admin login failed (%s): %s", status, body)
            raise ChargeError(502, "panel_auth_failed", "Could not authenticate with the panel")
        return body["access_token"]

    def _auth_headers(self, force_login: bool = False) -> dict[str, str]:
        if self.config.api_key:
            return {"X-Api-Key": self.config.api_key}
        with self._token_lock:
            if force_login or not self._token:
                self._token = self._login()
            return {"Authorization": f"Bearer {self._token}"}

    def _admin_request(self, method: str, path: str, json_body: Any = None) -> tuple[int, Any]:
        status, body = self._request(method, path, json_body=json_body, headers=self._auth_headers())
        if status == 401 and not self.config.api_key:
            status, body = self._request(method, path, json_body=json_body, headers=self._auth_headers(True))
        return status, body

    def subscription_info(self, token: str) -> dict[str, Any]:
        path = f"/{self.config.sub_path}/{urlparse.quote(token, safe='')}/info"
        status, body = self._request("GET", path)
        if status == 200 and isinstance(body, dict) and body.get("username"):
            return body
        if status in (400, 403, 404):
            raise ChargeError(404, "invalid_token", "Subscription not found")
        log.error("Unexpected /info response (%s): %s", status, body)
        raise ChargeError(502, "panel_error", "Unexpected panel response")

    def get_user(self, username: str) -> dict[str, Any]:
        status, body = self._admin_request("GET", f"/api/user/{urlparse.quote(username, safe='')}")
        if status == 200 and isinstance(body, dict):
            return body
        log.error("Get user %s failed (%s): %s", username, status, body)
        raise ChargeError(502, "panel_error", "Could not read the user from the panel")

    def set_data_limit(self, username: str, data_limit: int) -> dict[str, Any]:
        status, body = self._admin_request(
            "PUT", f"/api/user/{urlparse.quote(username, safe='')}", {"data_limit": data_limit}
        )
        if status == 200 and isinstance(body, dict):
            return body
        log.error("Modify user %s failed (%s): %s", username, status, body)
        raise ChargeError(502, "panel_error", "Could not update the user on the panel")


class ClaimStore:
    def __init__(self, path: str):
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._lock = threading.Lock()
        with self._lock, self._conn:
            self._conn.execute(
                """
                CREATE TABLE IF NOT EXISTS claims (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL,
                    claimed_at INTEGER NOT NULL,
                    expire TEXT NOT NULL,
                    used_traffic INTEGER NOT NULL,
                    data_limit_before INTEGER NOT NULL,
                    granted_limit INTEGER NOT NULL
                )
                """
            )
            self._conn.execute("CREATE INDEX IF NOT EXISTS claims_username ON claims (username)")

    def last_claim(self, username: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT expire, used_traffic, granted_limit FROM claims WHERE username = ? ORDER BY id DESC LIMIT 1",
                (username,),
            ).fetchone()
        if not row:
            return None
        return {"expire": row[0], "used_traffic": row[1], "granted_limit": row[2]}

    def add_claim(self, username: str, expire: str, used_traffic: int, data_limit_before: int, granted_limit: int):
        with self._lock, self._conn:
            self._conn.execute(
                "INSERT INTO claims (username, claimed_at, expire, used_traffic, data_limit_before, granted_limit)"
                " VALUES (?, ?, ?, ?, ?, ?)",
                (username, int(time.time()), expire, used_traffic, data_limit_before, granted_limit),
            )


def parse_expire(value: Any) -> datetime | None:
    if not value or value == "0":
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


class EmergencyCharger:
    def __init__(self, config: Config, panel: PanelClient, store: ClaimStore):
        self.config = config
        self.panel = panel
        self.store = store
        # One charge at a time, so two quick clicks can't both pass the "already used" check.
        self._lock = threading.Lock()

    def charge(self, token: str) -> dict[str, Any]:
        if not TOKEN_RE.match(token):
            raise ChargeError(400, "invalid_token", "Invalid subscription token")

        username = self.panel.subscription_info(token)["username"]

        with self._lock:
            user = self.panel.get_user(username)
            status = str(user.get("status") or "").lower()
            data_limit = int(user.get("data_limit") or 0)
            used = int(user.get("used_traffic") or 0)
            expire_raw = user.get("expire")
            expire_key = str(expire_raw or "")

            if status not in ("active", "limited"):
                raise ChargeError(403, "not_eligible", f"Status '{status}' is not eligible")
            if data_limit <= 0:
                raise ChargeError(403, "not_eligible", "User has unlimited traffic")
            expire_at = parse_expire(expire_raw)
            if expire_at and expire_at <= datetime.now(timezone.utc):
                raise ChargeError(403, "not_eligible", "Subscription has expired")
            if status == "active" and data_limit - used >= self.config.threshold_bytes:
                raise ChargeError(403, "not_needed", "User still has enough traffic")

            last = self.store.last_claim(username)
            if last and (
                last["expire"] == expire_key
                and last["granted_limit"] == data_limit
                and used >= last["used_traffic"]
            ):
                raise ChargeError(409, "already_used", "Emergency charge already used for this period")

            # Over-limit usage can exceed data_limit slightly; grant the full amount on top of it.
            new_limit = max(data_limit, used) + self.config.charge_bytes
            updated = self.panel.set_data_limit(username, new_limit)
            granted_limit = int(updated.get("data_limit") or new_limit)
            self.store.add_claim(username, expire_key, used, data_limit, granted_limit)

        log.info("Charged %s: %d -> %d bytes", username, data_limit, granted_limit)
        return {
            "ok": True,
            "added_bytes": granted_limit - max(data_limit, used),
            "data_limit": granted_limit,
            "status": updated.get("status"),
        }


class RateLimiter:
    def __init__(self, per_minute: int):
        self.per_minute = per_minute
        self._hits: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        if self.per_minute <= 0:
            return True
        now = time.monotonic()
        with self._lock:
            hits = [t for t in self._hits.get(key, []) if now - t < 60]
            if len(hits) >= self.per_minute:
                self._hits[key] = hits
                return False
            hits.append(now)
            self._hits[key] = hits
            if len(self._hits) > 10000:
                self._hits = {k: v for k, v in self._hits.items() if v and now - v[-1] < 60}
            return True


def make_handler(config: Config, charger: EmergencyCharger, limiter: RateLimiter):
    allow_any_origin = "*" in config.allowed_origins

    class Handler(BaseHTTPRequestHandler):
        server_version = "EmergencyCharge/1.0"

        def log_message(self, fmt: str, *args: Any) -> None:
            log.debug("%s - %s", self.client_ip(), fmt % args)

        def client_ip(self) -> str:
            if config.trust_proxy:
                forwarded = self.headers.get("X-Forwarded-For", "")
                if forwarded:
                    return forwarded.split(",")[0].strip()
                real_ip = self.headers.get("X-Real-IP")
                if real_ip:
                    return real_ip.strip()
            return self.client_address[0]

        def cors_headers(self) -> None:
            origin = (self.headers.get("Origin") or "").rstrip("/")
            if allow_any_origin:
                self.send_header("Access-Control-Allow-Origin", "*")
            elif origin in config.allowed_origins:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Max-Age", "600")

        def send_json(self, status: int, payload: dict[str, Any]) -> None:
            body = json.dumps(payload).encode()
            self.send_response(status)
            self.cors_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def path_matches(self) -> bool:
            path = urlparse.urlsplit(self.path).path.rstrip("/") or "/"
            return path == config.route_path

        def do_OPTIONS(self) -> None:
            self.send_response(204)
            self.cors_headers()
            self.send_header("Content-Length", "0")
            self.end_headers()

        def do_GET(self) -> None:
            path = urlparse.urlsplit(self.path).path.rstrip("/")
            if path in (f"{config.route_path}/health", "/health"):
                self.send_json(200, {"ok": True})
            else:
                self.send_json(404, {"ok": False, "code": "not_found"})

        def do_POST(self) -> None:
            if not self.path_matches():
                self.send_json(404, {"ok": False, "code": "not_found"})
                return

            if not limiter.allow(self.client_ip()):
                self.send_json(429, {"ok": False, "code": "rate_limited", "message": "Too many requests"})
                return

            try:
                length = int(self.headers.get("Content-Length") or 0)
            except ValueError:
                length = 0
            if length <= 0 or length > MAX_BODY_BYTES:
                self.send_json(400, {"ok": False, "code": "bad_request", "message": "Invalid body"})
                return

            try:
                payload = json.loads(self.rfile.read(length))
                token = payload.get("token") if isinstance(payload, dict) else None
                if not isinstance(token, str):
                    raise ValueError("token missing")
            except ValueError:
                self.send_json(400, {"ok": False, "code": "bad_request", "message": "Invalid body"})
                return

            try:
                result = charger.charge(token.strip())
            except ChargeError as exc:
                self.send_json(exc.http_status, {"ok": False, "code": exc.code, "message": exc.message})
                return
            except Exception:  # noqa: BLE001 - never leak internals to the page
                log.exception("Unexpected error while charging")
                self.send_json(500, {"ok": False, "code": "server_error", "message": "Internal error"})
                return

            self.send_json(200, result)

    return Handler


def main() -> None:
    load_env_file(os.environ.get("ENV_FILE", os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")))
    logging.basicConfig(
        level=env_str("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    config = Config.from_env()
    charger = EmergencyCharger(config, PanelClient(config), ClaimStore(config.db_path))
    server = ThreadingHTTPServer(
        (config.listen_host, config.listen_port),
        make_handler(config, charger, RateLimiter(config.rate_limit_per_minute)),
    )

    scheme = "http"
    if config.ssl_cert and config.ssl_key:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(config.ssl_cert, config.ssl_key)
        # Handshake lazily in the worker thread so a slow client can't block accept().
        server.socket = ctx.wrap_socket(server.socket, server_side=True, do_handshake_on_connect=False)
        scheme = "https"

    log.info(
        "Listening on %s://%s:%d%s (charge %d MB, threshold %d MB)",
        scheme,
        config.listen_host,
        config.listen_port,
        config.route_path,
        config.charge_bytes // MB,
        config.threshold_bytes // MB,
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    sys.exit(main())
