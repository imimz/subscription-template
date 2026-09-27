# سرویس شارژ اضطراری

وقتی حجم کاربر تمام شده یا کم است، صفحه اشتراک یک کارت **شارژ اضطراری** نشان می‌دهد. با زدن دکمه، این سرویس مقدار مشخصی حجم رایگان (پیش‌فرض ۵۰۰ مگابایت) به سرویس کاربر اضافه می‌کند تا بتواند وارد ربات تلگرام شود و سرویسش را تمدید کند.

صفحه اشتراک فقط یک فایل HTML است و نباید به توکن ادمین پنل دسترسی داشته باشد. برای همین تغییر حجم را این سرویس کوچک انجام می‌دهد که کنار پنل اجرا می‌شود. این سرویس فقط از کتابخانه‌های استاندارد پایتون استفاده می‌کند و نیازی به `pip install` ندارد.

## قوانین

- فقط کاربرانی که وضعیتشان `active` یا `limited` است، حجم نامحدود ندارند و حجم باقی‌مانده‌شان کمتر از `LOW_TRAFFIC_THRESHOLD_MB` است می‌توانند شارژ اضطراری بگیرند.
- هر کاربر در **هر دوره خرید فقط یک بار** می‌تواند از آن استفاده کند. دوره جدید وقتی شروع می‌شود که سرویس کاربر تمدید شود، یعنی تاریخ انقضا یا حجم کل تغییر کند یا حجم مصرفی ریست شود.
- هویت کاربر از روی توکن لینک اشتراکش و از طریق خود پنل بررسی می‌شود. کاربر نمی‌تواند برای شخص دیگری شارژ بگیرد.
- سوابق استفاده در یک فایل SQLite (`claims.db`) نگه داشته می‌شود.

## نصب

```sh
sudo mkdir -p /opt/emergency-charge
sudo cp server.py emergency-charge.service .env.example /opt/emergency-charge/
cd /opt/emergency-charge
sudo cp .env.example .env
sudo nano .env   # مقادیر را تنظیم کنید (پایین را ببینید)

sudo cp emergency-charge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now emergency-charge
sudo journalctl -u emergency-charge -f   # مشاهده لاگ
```

### تنظیمات مهم `.env`

| متغیر | توضیح |
| --- | --- |
| `PANEL_URL` | آدرس پنل، مثلاً `https://panel.example.com:8000` |
| `SUB_PATH` | مسیر لینک اشتراک در پنل (پیش‌فرض `sub`) |
| `PANEL_API_KEY` | کلید API ادمین (از بخش API Keys پنل)، **یا** |
| `PANEL_ADMIN_USERNAME` / `PANEL_ADMIN_PASSWORD` | نام کاربری و رمز یک ادمین که اجازه خواندن و ویرایش کاربران را دارد |
| `CHARGE_MB` | مقدار حجم رایگان (پیش‌فرض `500`) |
| `LOW_TRAFFIC_THRESHOLD_MB` | اگر حجم باقی‌مانده کمتر از این مقدار باشد، شارژ مجاز است (پیش‌فرض `500`) |
| `ALLOWED_ORIGINS` | آدرس صفحه اشتراک (فقط دامنه و پورت)، مثلاً `https://panel.example.com:8000` |

## اتصال صفحه اشتراک به سرویس

صفحه اشتراک روی HTTPS باز می‌شود، پس آدرس سرویس هم باید HTTPS باشد. یکی از این دو روش را انتخاب کنید.

**روش ۱: پشت nginx (اگر nginx دارید)**

در `.env` سرویس مقدار `LISTEN_HOST=127.0.0.1` و `TRUST_PROXY=true` را بگذارید و در بلاک `server` دامنه این را اضافه کنید:

```nginx
location /emergency-charge {
    proxy_pass http://127.0.0.1:8765;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

آدرس سرویس: `https://your-domain/emergency-charge`

**روش ۲: HTTPS مستقیم با همان گواهی پنل**

```dotenv
LISTEN_HOST=0.0.0.0
LISTEN_PORT=8765
SSL_CERT_FILE=/path/to/fullchain.pem
SSL_KEY_FILE=/path/to/privkey.pem
```

به جای `/path/to/...` مسیر همان گواهی SSL پنل را بگذارید و پورت `8765` را در فایروال باز کنید. آدرس سرویس: `https://panel.example.com:8765/emergency-charge`

### Build قالب

در `.env` ریشه پروژه قالب این مقادیر را تنظیم کنید و دوباره build بگیرید (`bun run build`):

```dotenv
VITE_EMERGENCY_CHARGE_URL=https://panel.example.com:8765/emergency-charge
VITE_EMERGENCY_CHARGE_MB=500
VITE_EMERGENCY_CHARGE_THRESHOLD_MB=500
VITE_TELEGRAM_BOT_URL=https://t.me/your_bot
```

اگر `VITE_EMERGENCY_CHARGE_URL` خالی باشد، کارت شارژ اضطراری نمایش داده نمی‌شود.

### تست

```sh
curl https://panel.example.com:8765/emergency-charge/health
# {"ok": true}
```

---

## English summary

A tiny stdlib-only Python service that adds `CHARGE_MB` (default 500 MB) to a user's data limit when they press **Emergency charge** on the subscription page. It verifies the user through the panel's `/<sub-path>/<token>/info` endpoint, only allows `active`/`limited` users that are below `LOW_TRAFFIC_THRESHOLD_MB`, and allows one claim per purchase period (a renewal that changes the expire date or data limit, or resets usage, starts a new period). Configure it with `.env` (see `.env.example`), run it with the included systemd unit behind a reverse proxy or with `SSL_CERT_FILE`/`SSL_KEY_FILE`, and build the template with `VITE_EMERGENCY_CHARGE_URL` pointing to it.

API: `POST <ROUTE_PATH>` with `{"token": "<subscription token>"}` returns `{"ok": true, "added_bytes": ..., "data_limit": ...}` or `{"ok": false, "code": "already_used" | "not_eligible" | "not_needed" | "invalid_token" | "rate_limited" | ...}`.
