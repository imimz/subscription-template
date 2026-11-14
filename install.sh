#!/usr/bin/env bash
#
# Installs the subscription template on a PasarGuard server and, optionally,
# sets up the emergency charge service. Nothing is built on the server: the
# released index.html is downloaded and its settings are written into it.
#
#   curl -fsSL https://raw.githubusercontent.com/imimz/subscription-template/main/install.sh | sudo bash -s -- --lang fa
#
# Re-run the same command to update; previous answers are remembered.
set -euo pipefail

LANG_CODE="fa"
VERSION="latest"
REPO="imimz/subscription-template"
DEST_DIR="/var/lib/pasarguard/templates/subscription"
DEST_FILE="${DEST_DIR}/index.html"
SETTINGS_FILE="${DEST_DIR}/install-settings.env"
ENV_FILE="/opt/pasarguard/.env"
CHARGE_DIR="/opt/emergency-charge"

# Answers can also come from flags or environment variables (for non-interactive installs).
EMERGENCY_CHARGE="${EMERGENCY_CHARGE:-}"   # yes | no
RELAY="${RELAY:-}"                         # yes | no: users open subscription links through a relay/CDN domain
THEME="${THEME:-}"                         # blue | gold
TELEGRAM_BOT_URL="${TELEGRAM_BOT_URL:-}"
CHARGE_PORT="${CHARGE_PORT:-}"
CHARGE_MB="${CHARGE_MB:-500}"
EXTEND_HOURS="${EXTEND_HOURS:-24}"
NEW_API_KEY="${PANEL_API_KEY:-}"
TELEGRAM_ASKED=0

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1m'; N='\033[0m'
say()  { echo -e "${G}==>${N} $*"; }
warn() { echo -e "${Y}warning:${N} $*" >&2; }
die()  { echo -e "${R}error:${N} $*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: install.sh [options]

  --lang en|fa|zh|ru          default language of the page (default: fa)
  --version latest|<tag>      release to install (default: latest)
  --repo <owner>/<repo>       install from another repository
  --emergency-charge yes|no   set up the emergency charge service (asked if omitted)
  --relay yes|no              users open subscription links through a relay/CDN domain
  --telegram-bot <url>        Telegram bot link shown on the emergency charge card
  --theme blue|gold           main color of the page
  --charge-port <port>        port of the emergency charge service (default: 8765)

The panel API key can be passed as PANEL_API_KEY=... in the environment instead of typing it.
TEMPLATE_URL=... installs the page from another URL (a mirror, or file:///path/to/index.html).

Examples:
  install.sh
  install.sh --lang en --emergency-charge no
  install.sh --repo PasarGuard/subscription-template   # original template
EOF
}

need_value() { [[ $# -ge 2 && -n "$2" ]] || die "$1 needs a value."; }
while [[ $# -gt 0 ]]; do
  case "$1" in
    --lang) need_value "$@"; LANG_CODE="$2"; shift 2 ;;
    --version) need_value "$@"; VERSION="$2"; shift 2 ;;
    --repo) need_value "$@"; REPO="$2"; shift 2 ;;
    --emergency-charge) need_value "$@"; EMERGENCY_CHARGE="$2"; shift 2 ;;
    --relay) need_value "$@"; RELAY="$2"; shift 2 ;;
    --telegram-bot) need_value "$@"; TELEGRAM_BOT_URL="$2"; shift 2 ;;
    --theme) need_value "$@"; THEME="$2"; shift 2 ;;
    --charge-port) need_value "$@"; CHARGE_PORT="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) usage; die "unknown argument: $1" ;;
  esac
done

case "${LANG_CODE}" in en|fa|zh|ru) ;; *) die "invalid language '${LANG_CODE}'. Use one of: en, fa, zh, ru." ;; esac
[[ "$(id -u)" == "0" ]] || die "run as root (sudo)."

# ── prompts: read from the terminal even when the script itself is piped in ──
HAS_TTY=0
if [[ -r /dev/tty ]] && (exec </dev/tty) 2>/dev/null; then HAS_TTY=1; fi

# Helpers write the answer into the variable named by $1; their own locals use a prefix that
# callers never use, so `printf -v` can't land on a helper's local by mistake.
ask() { # ask <var> <question> <default>
  local _ask_q="$2" _ask_def="${3:-}" _ask_in=""
  if [[ "$HAS_TTY" == "1" ]]; then
    read -r -p "$(echo -e "${B}?${N} ${_ask_q}${_ask_def:+ [${_ask_def}]}: ")" _ask_in </dev/tty || true
  fi
  printf -v "$1" '%s' "${_ask_in:-$_ask_def}"
}
ask_yes_no() { # ask_yes_no <var> <question> <default yes|no>
  local _yn_in
  while true; do
    ask _yn_in "$2 (yes/no)" "$3"
    case "${_yn_in,,}" in y|yes) printf -v "$1" yes; return ;; n|no) printf -v "$1" no; return ;; esac
    [[ "$HAS_TTY" == "1" ]] || { printf -v "$1" '%s' "$3"; return; }
  done
}
ask_secret() { # ask_secret <var> <question>
  local _sec_in=""
  if [[ "$HAS_TTY" == "1" ]]; then
    read -r -s -p "$(echo -e "${B}?${N} $2: ")" _sec_in </dev/tty || true
    echo >/dev/tty
  fi
  printf -v "$1" '%s' "$_sec_in"
}

# Reads KEY from a dotenv-style file (PasarGuard writes `KEY = "value"`); comments are ignored.
env_value() {
  [[ -f "$2" ]] || return 0
  { grep -E "^[[:space:]]*$1[[:space:]]*=" "$2" || true; } | tail -n 1 | cut -d= -f2- | sed -E 's/^[[:space:]]+|[[:space:]]+$//g; s/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'
}

download() { # download <url> <file>
  if command -v curl >/dev/null 2>&1; then curl -fsSL "$1" -o "$2"
  elif command -v wget >/dev/null 2>&1; then wget -q -O "$2" "$1"
  else die "neither curl nor wget is installed."; fi
}

# ── previous answers (re-running the script updates in place) ──
if [[ -f "$SETTINGS_FILE" ]]; then
  # shellcheck disable=SC1090
  . "$SETTINGS_FILE"
  EMERGENCY_CHARGE="${EMERGENCY_CHARGE:-${SAVED_EMERGENCY_CHARGE:-}}"
  RELAY="${RELAY:-${SAVED_RELAY:-}}"
  THEME="${THEME:-${SAVED_THEME:-}}"
  TELEGRAM_BOT_URL="${TELEGRAM_BOT_URL:-${SAVED_TELEGRAM_BOT_URL:-}}"
  [[ -n "${SAVED_TELEGRAM_BOT_URL+x}" ]] && TELEGRAM_ASKED=1
  CHARGE_PORT="${CHARGE_PORT:-${SAVED_CHARGE_PORT:-}}"
  say "Using the settings from the previous install (${SETTINGS_FILE})."
fi
CHARGE_PORT="${CHARGE_PORT:-8765}"

# ── 1. download the template ──
if [[ "${VERSION}" == "latest" ]]; then RELEASE_PATH="latest/download"; else RELEASE_PATH="download/${VERSION}"; fi
ASSET="${LANG_CODE}.html"; [[ "${LANG_CODE}" == "fa" ]] && ASSET="index.html"
URL="${TEMPLATE_URL:-https://github.com/${REPO}/releases/${RELEASE_PATH}/${ASSET}}"

mkdir -p "${DEST_DIR}"
TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT
say "Downloading the template (${LANG_CODE}, ${VERSION})…"
download "$URL" "$TMP_FILE" || die "could not download ${URL}
Check that ${REPO} has a published release with the template files. The current template was left unchanged."

HAS_CONFIG_SLOT=0
grep -q 'window.__TEMPLATE_CONFIG__ = {[^<]*};' "$TMP_FILE" && HAS_CONFIG_SLOT=1

# ── 2. questions ──
if [[ "$HAS_CONFIG_SLOT" == "1" ]]; then
  if [[ -z "$THEME" ]]; then ask THEME "Page color: blue or gold" "blue"; fi
  case "${THEME,,}" in gold|blue) THEME="${THEME,,}" ;; *) warn "unknown theme '${THEME}', using blue."; THEME=blue ;; esac

  if [[ -z "$EMERGENCY_CHARGE" ]]; then
    echo
    echo "Emergency charge: users who ran out of traffic (or expired) can claim ${CHARGE_MB} MB once per"
    echo "purchase period from the subscription page, so they can reach your bot and renew."
    ask_yes_no EMERGENCY_CHARGE "Set up emergency charge?" "yes"
  fi
else
  warn "this release has no settings slot; installing the template only."
  EMERGENCY_CHARGE=no
fi
EMERGENCY_CHARGE="${EMERGENCY_CHARGE,,}"; [[ "$EMERGENCY_CHARGE" == "y" ]] && EMERGENCY_CHARGE=yes
# Only an explicit "no" stops a running service; skipping for other reasons (no certificate, bad key) leaves it alone.
CHARGE_DECLINED=0
[[ "$HAS_CONFIG_SLOT" == "1" && "$EMERGENCY_CHARGE" != "yes" ]] && CHARGE_DECLINED=1

CHARGE_URL=""
if [[ "$EMERGENCY_CHARGE" == "yes" ]]; then
  [[ -f "$ENV_FILE" ]] || die "${ENV_FILE} not found. Is PasarGuard installed on this server?"

  if [[ -z "$TELEGRAM_BOT_URL" && "$TELEGRAM_ASKED" == "0" ]]; then ask TELEGRAM_BOT_URL "Telegram bot link for the 'buy' button (e.g. https://t.me/your_bot, empty = no button)" ""; fi
  if [[ -n "$TELEGRAM_BOT_URL" && ! "$TELEGRAM_BOT_URL" =~ ^https?://[^[:space:]\"\'\<\>{}\\]+$ ]]; then
    warn "'${TELEGRAM_BOT_URL}' is not a valid link; skipping the Telegram button."
    TELEGRAM_BOT_URL=""
  fi
  if [[ -z "$RELAY" ]]; then
    ask_yes_no RELAY "Do users open subscription links through a relay or CDN on another domain (e.g. an Iran server)?" "no"
  fi
  RELAY="${RELAY,,}"; [[ "$RELAY" == "y" ]] && RELAY=yes
  [[ "$CHARGE_PORT" =~ ^[0-9]+$ ]] || die "invalid --charge-port '${CHARGE_PORT}'."

  # ── 3. emergency charge service ──
  PANEL_PORT="$(env_value UVICORN_PORT "$ENV_FILE")"; PANEL_PORT="${PANEL_PORT:-8000}"
  CERT="$(env_value UVICORN_SSL_CERTFILE "$ENV_FILE")"
  KEYFILE="$(env_value UVICORN_SSL_KEYFILE "$ENV_FILE")"
  SUB_PATH="$(env_value XRAY_SUBSCRIPTION_PATH "$ENV_FILE")"
  SUB_PATH="${SUB_PATH:-$(env_value SUBSCRIPTION_PATH "$ENV_FILE")}"; SUB_PATH="${SUB_PATH:-sub}"; SUB_PATH="${SUB_PATH#/}"; SUB_PATH="${SUB_PATH%/}"

  if [[ -z "$CERT" || -z "$KEYFILE" || ! -f "$CERT" || ! -f "$KEYFILE" ]]; then
    warn "the panel's SSL certificate was not found in ${ENV_FILE} (UVICORN_SSL_CERTFILE/KEYFILE)."
    ask CERT "Path to the SSL certificate (fullchain.pem) for the service, empty = skip emergency charge" ""
    [[ -n "$CERT" ]] && ask KEYFILE "Path to its private key (privkey.pem)" ""
    if [[ -z "$CERT" || ! -f "$CERT" || -z "$KEYFILE" || ! -f "$KEYFILE" ]]; then
      warn "no usable certificate; skipping emergency charge. See emergency-charge/README.md to set it up manually."
      EMERGENCY_CHARGE=no
    fi
  fi
fi

if [[ "$EMERGENCY_CHARGE" == "yes" ]]; then
  # The service talks to the panel on this machine; going out through the public domain and back can fail.
  PANEL_SCHEME="http"; [[ -n "$(env_value UVICORN_SSL_CERTFILE "$ENV_FILE")" ]] && PANEL_SCHEME="https"
  PANEL_URL="${PANEL_SCHEME}://127.0.0.1:${PANEL_PORT}"

  OLD_API_KEY="$(env_value PANEL_API_KEY "${CHARGE_DIR}/.env")"
  check_key() { [[ -n "$1" ]] && [[ "$(curl -sk -m 10 -o /dev/null -w '%{http_code}' -H "X-Api-Key: $1" "${PANEL_URL}/api/admin")" == "200" ]]; }
  command -v curl >/dev/null 2>&1 || { say "Installing curl…"; apt-get update -qq && apt-get install -y -qq curl >/dev/null; }

  API_KEY=""
  if [[ -n "$NEW_API_KEY" ]] && check_key "$NEW_API_KEY"; then API_KEY="$NEW_API_KEY"
  elif [[ -z "$NEW_API_KEY" ]] && check_key "$OLD_API_KEY"; then API_KEY="$OLD_API_KEY"; say "Keeping the existing panel API key."
  else
    [[ -n "$NEW_API_KEY" ]] && warn "the PANEL_API_KEY you passed was not accepted by the panel."
    echo
    echo "The service needs a panel API key that can read and update users."
    echo "Create one in the panel: API Keys → add. It is stored only on this server (${CHARGE_DIR}/.env)."
    for _ in 1 2 3; do
      ask_secret API_KEY "Panel API key (input is hidden)"
      if check_key "$API_KEY"; then break; fi
      API_KEY=""
      warn "the panel did not accept that key (${PANEL_URL}/api/admin)."
      [[ "$HAS_TTY" == "1" ]] || break
    done
  fi

  if [[ -z "$API_KEY" ]]; then
    warn "no working API key; skipping emergency charge. Run the installer again to retry."
    EMERGENCY_CHARGE=no
  fi
fi

if [[ "$EMERGENCY_CHARGE" == "yes" ]]; then
  if ! command -v python3 >/dev/null 2>&1; then
    say "Installing python3…"
    apt-get update -qq && apt-get install -y -qq python3 >/dev/null || die "could not install python3."
  fi

  # Use the service from the same release as the template.
  REF="main"
  if [[ "$VERSION" != "latest" ]]; then REF="$VERSION"
  else
    LATEST_TAG="$(curl -fsSI "https://github.com/${REPO}/releases/latest" 2>/dev/null | tr -d '\r' | awk -F/ 'tolower($1) ~ /^location:/ {print $NF}' | tail -n 1 || true)"
    [[ -n "$LATEST_TAG" ]] && REF="$LATEST_TAG"
  fi
  say "Installing the emergency charge service (${REF})…"
  mkdir -p "$CHARGE_DIR"
  download "https://raw.githubusercontent.com/${REPO}/${REF}/emergency-charge/server.py" "${CHARGE_DIR}/server.py.new" \
    || download "https://raw.githubusercontent.com/${REPO}/main/emergency-charge/server.py" "${CHARGE_DIR}/server.py.new" \
    || die "could not download the emergency charge service."
  mv "${CHARGE_DIR}/server.py.new" "${CHARGE_DIR}/server.py"

  # Requests arrive from users directly, or all from one relay/SOCKS address: allow enough per minute.
  RATE=30; [[ "$RELAY" == "yes" ]] && RATE=120
  umask 077
  cat > "${CHARGE_DIR}/.env" <<EOF
# Written by install.sh — re-run it to change these settings.
PANEL_URL=${PANEL_URL}
PANEL_VERIFY_TLS=false
SUB_PATH=${SUB_PATH}
PANEL_API_KEY=${API_KEY}
CHARGE_MB=${CHARGE_MB}
LOW_TRAFFIC_THRESHOLD_MB=${CHARGE_MB}
EXPIRED_EXTEND_HOURS=${EXTEND_HOURS}
LISTEN_HOST=0.0.0.0
LISTEN_PORT=${CHARGE_PORT}
SSL_CERT_FILE=${CERT}
SSL_KEY_FILE=${KEYFILE}
ALLOWED_ORIGINS=*
RATE_LIMIT_PER_MINUTE=${RATE}
EOF
  umask 022

  cat > /etc/systemd/system/emergency-charge.service <<EOF
[Unit]
Description=PasarGuard subscription emergency charge
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${CHARGE_DIR}
ExecStart=$(command -v python3) ${CHARGE_DIR}/server.py
Environment=ENV_FILE=${CHARGE_DIR}/.env
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable emergency-charge >/dev/null 2>&1
  systemctl restart emergency-charge

  if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
    ufw allow "${CHARGE_PORT}/tcp" >/dev/null && say "Opened port ${CHARGE_PORT} in ufw."
  fi
  # The panel's certificate is renewed automatically; restart daily so the service picks it up.
  if ! crontab -l 2>/dev/null | grep -q "systemctl restart emergency-charge"; then
    (crontab -l 2>/dev/null; echo "0 4 * * * systemctl restart emergency-charge") | crontab -
  fi

  sleep 2
  if curl -sk -m 10 "https://127.0.0.1:${CHARGE_PORT}/emergency-charge/health" | grep -q '"ok": true'; then
    say "Emergency charge service is running on port ${CHARGE_PORT}."
  else
    warn "the service did not answer its health check. Logs: journalctl -u emergency-charge -n 30"
  fi

  if [[ "$RELAY" == "yes" ]]; then CHARGE_URL="/emergency-charge"; else CHARGE_URL=":${CHARGE_PORT}/emergency-charge"; fi
elif [[ "$CHARGE_DECLINED" == "1" ]] && systemctl is-enabled emergency-charge >/dev/null 2>&1; then
  say "Emergency charge disabled: stopping the service."
  systemctl disable --now emergency-charge >/dev/null 2>&1 || true
fi

# ── 4. write the settings into the page ──
if [[ "$HAS_CONFIG_SLOT" == "1" ]]; then
  parts=()
  if [[ "$THEME" == "gold" ]]; then
    parts+=("\"primaryColorLight\":\"oklch(0.62 0.13 75)\"" "\"primaryColorDark\":\"oklch(0.80 0.14 85)\"")
  fi
  if [[ "$EMERGENCY_CHARGE" == "yes" ]]; then
    parts+=("\"emergencyChargeUrl\":\"${CHARGE_URL}\"" "\"emergencyChargeMb\":${CHARGE_MB}"
            "\"emergencyChargeThresholdMb\":${CHARGE_MB}" "\"emergencyChargeExtendHours\":${EXTEND_HOURS}")
    [[ -n "$TELEGRAM_BOT_URL" ]] && parts+=("\"telegramBotUrl\":\"${TELEGRAM_BOT_URL}\"")
  fi
  CONFIG="{$(IFS=,; echo "${parts[*]:-}")}"
  # Escape for the sed replacement (&, \ and the | delimiter).
  ESCAPED="$(printf '%s' "$CONFIG" | sed -e 's/[\\&|]/\\&/g')"
  sed -i "s|window.__TEMPLATE_CONFIG__ = {[^<]*};|window.__TEMPLATE_CONFIG__ = ${ESCAPED};|" "$TMP_FILE"
  grep -qF "window.__TEMPLATE_CONFIG__ = ${CONFIG};" "$TMP_FILE" || die "could not write the settings into the template."

  cat > "$SETTINGS_FILE" <<EOF
# Answers from the last install.sh run (used as defaults when it runs again).
SAVED_EMERGENCY_CHARGE='${EMERGENCY_CHARGE}'
SAVED_RELAY='${RELAY}'
SAVED_THEME='${THEME}'
SAVED_TELEGRAM_BOT_URL='${TELEGRAM_BOT_URL}'
SAVED_CHARGE_PORT='${CHARGE_PORT}'
EOF
fi

# ── 5. install the template and point the panel at it ──
if [[ -f "${DEST_FILE}" ]]; then
  cp "${DEST_FILE}" "${DEST_FILE}.bak"
  say "Backed up the current template to ${DEST_FILE}.bak"
fi
cp "$TMP_FILE" "${DEST_FILE}"
chmod 644 "${DEST_FILE}"

mkdir -p "$(dirname "${ENV_FILE}")"
touch "${ENV_FILE}"
if grep -q '^CUSTOM_TEMPLATES_DIRECTORY=' "${ENV_FILE}"; then
  sed -i 's|^CUSTOM_TEMPLATES_DIRECTORY=.*|CUSTOM_TEMPLATES_DIRECTORY="/var/lib/pasarguard/templates/"|' "${ENV_FILE}"
else
  echo 'CUSTOM_TEMPLATES_DIRECTORY="/var/lib/pasarguard/templates/"' >> "${ENV_FILE}"
fi
if grep -q '^SUBSCRIPTION_PAGE_TEMPLATE=' "${ENV_FILE}"; then
  sed -i 's|^SUBSCRIPTION_PAGE_TEMPLATE=.*|SUBSCRIPTION_PAGE_TEMPLATE="subscription/index.html"|' "${ENV_FILE}"
else
  echo 'SUBSCRIPTION_PAGE_TEMPLATE="subscription/index.html"' >> "${ENV_FILE}"
fi

if command -v pasarguard >/dev/null 2>&1; then
  say "Restarting PasarGuard…"
  pasarguard restart >/dev/null 2>&1 || pasarguard restart
fi

echo
say "Installed the template from ${REPO} (${LANG_CODE}, ${VERSION})."
command -v pasarguard >/dev/null 2>&1 || warn "pasarguard command not found; restart the panel manually."
if [[ "$EMERGENCY_CHARGE" == "yes" ]]; then
  say "Emergency charge is on (${CHARGE_MB} MB; expired users also get ${EXTEND_HOURS} hours)."
  if [[ "$RELAY" == "yes" ]]; then
    PUBLIC_IP="$(curl -fs4 -m 10 https://api.ipify.org 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || true)"
    PUBLIC_IP="${PUBLIC_IP:-<this-server-ip>}"
    echo
    echo -e "${B}One more step on your relay server:${N} send /emergency-charge to this server."
    echo "For sub-forward-proxy, add this to /opt/rh-subproxy/config.php, then run: systemctl restart rh-subproxy"
    echo
    echo "    'routes' => ['#^/emergency-charge/?\$#' => 'https://${PUBLIC_IP}:${CHARGE_PORT}'],"
    echo
    echo "Other relays/CDNs: forward the path /emergency-charge to https://${PUBLIC_IP}:${CHARGE_PORT}"
  fi
fi
