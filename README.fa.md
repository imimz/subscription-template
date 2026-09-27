# قالب اشتراک PasarGuard با شارژ اضطراری و آموزش اتصال

این قالب، صفحه‌ی اشتراک واکنش‌گرا برای پنل [PasarGuard](https://github.com/PasarGuard/panel) است. بر پایه‌ی قالب رسمی [PasarGuard/subscription-template](https://github.com/PasarGuard/subscription-template) ساخته شده و این امکانات را اضافه می‌کند:

- **شارژ اضطراری:** کاربری که حجمش تمام شده، در هر دوره‌ی خرید یک بار حجم رایگان (پیش‌فرض ۵۰۰ مگابایت) دریافت می‌کند تا بتواند وارد ربات تلگرام شود و سرویسش را تمدید کند.
- **آموزش اتصال:** کاربر سیستم‌عامل خود (اندروید، آی‌اواس، ویندوز، لینوکس) را انتخاب می‌کند. برای هر برنامه یک کارت با لینک دانلود و گیت‌هاب و آموزش مرحله‌به‌مرحله نمایش داده می‌شود.

<p align="center">
  <img src="screenshots/emergency-charge-fa.png" alt="شارژ اضطراری" width="70%">
</p>
<p align="center">
  <img src="screenshots/tutorials-fa.png" alt="آموزش اتصال" width="70%">
  <img src="screenshots/mobile-fa.png" alt="نمای موبایل" width="22%">
</p>

**پیش‌نمایش تعاملی:** فایل [`preview/index.html`](preview/index.html) را دانلود کنید و در مرورگر باز کنید. اطلاعات آن نمونه است و سرویس شارژ در آن شبیه‌سازی شده است.

## فهرست

- [امکانات](#features)
- [سازگاری](#compatibility)
- [نصب](#install)
- [مهاجرت از قالب اصلی PasarGuard](#migrating)
- [شارژ اضطراری](#emergency-charge)
- [شخصی‌سازی](#customization)
- [به‌روزرسانی](#updating)
- [انتشار نسخه (برای صاحب مخزن)](#publishing)

<a id="features"></a>

## امکانات

- زبان‌های `fa`، `en`، `ru` و `zh`، با امکان تغییر زبان توسط کاربر
- طراحی واکنش‌گرا و حالت تاریک
- کد QR برای لینک‌های اتصال
- کپی لینک و کانفیگ با یک کلیک. کپی Base64 فقط در مودال QR هست.
- لینک‌های WireGuard هم به صورت کانفیگ اصلی کپی می‌شوند و هم با فرمت `.conf` دانلود
- آموزش اتصال با دکمه‌ی «افزودن خودکار» برای برنامه‌هایی که از آن پشتیبانی می‌کنند (v2rayNG، Hiddify، Streisand، sing-box، Clash)
- کارت شارژ اضطراری و دکمه‌ی «خرید از ربات تلگرام» (اختیاری)
- رنگ و گردی گوشه‌های قابل تنظیم

<a id="compatibility"></a>

## سازگاری

| نسخه‌ی قالب | نسخه‌ی پنل PasarGuard |
| --- | --- |
| `v2.x` (این مخزن) | `v3` |

<a id="install"></a>

## نصب

دو روش نصب وجود دارد:

| | نصب سریع (Release) | ساخت از سورس |
| --- | --- | --- |
| آموزش اتصال | ✅ | ✅ |
| شارژ اضطراری و دکمه‌ی تلگرام | فقط اگر صاحب مخزن قبل از انتشار نسخه آن‌ها را در [متغیرهای مخزن](#publishing) تنظیم کرده باشد | ✅ از طریق `.env` خودتان |
| رنگ دلخواه | مثل ردیف بالا | ✅ |
| نیاز به Bun روی سرور | ندارد | دارد |

### روش ۱: نصب سریع (Release)

```sh
curl -fsSL https://raw.githubusercontent.com/imimz/subscription-template/main/install.sh | sudo bash -s -- --lang fa
```

این اسکریپت:
- قالب را از آخرین Release این مخزن دانلود می‌کند
- از قالب فعلی نسخه‌ی پشتیبان `index.html.bak` می‌سازد
- `CUSTOM_TEMPLATES_DIRECTORY` و `SUBSCRIPTION_PAGE_TEMPLATE` را در `/opt/pasarguard/.env` تنظیم می‌کند
- پنل را ری‌استارت می‌کند

گزینه‌ها:
- `--lang en|fa|zh|ru`: زبان پیش‌فرض صفحه
- `--version <tag>`: نصب یک نسخه‌ی مشخص، مثلاً `v2.3.0` (پیش‌فرض `latest`)
- `--repo <owner>/<repo>`: نصب از یک مخزن دیگر

> نصب سریع فقط وقتی کار می‌کند که در این مخزن یک Release منتشر شده باشد. اگر اسکریپت خطای دانلود داد، از روش ۲ استفاده کنید.

### روش ۲: ساخت از سورس (پیشنهادی برای استفاده از شارژ اضطراری)

```sh
# Bun برای نصب به unzip نیاز دارد
sudo apt update && sudo apt install -y unzip git
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"

git clone https://github.com/imimz/subscription-template.git
cd subscription-template
cp .env.example .env
nano .env        # زبان، رنگ، ربات تلگرام و شارژ اضطراری را تنظیم کنید (پایین را ببینید)

bun install
bun run build

sudo mkdir -p /var/lib/pasarguard/templates/subscription
sudo cp dist/index.html /var/lib/pasarguard/templates/subscription/index.html
```

سپس این دو خط را به `/opt/pasarguard/.env` اضافه کنید (اگر قبلاً اضافه شده‌اند، لازم نیست) و پنل را ری‌استارت کنید:

```dotenv
CUSTOM_TEMPLATES_DIRECTORY="/var/lib/pasarguard/templates/"
SUBSCRIPTION_PAGE_TEMPLATE="subscription/index.html"
```

```sh
pasarguard restart
```

حالا لینک اشتراک یکی از کاربران را در مرورگر باز کنید تا صفحه‌ی جدید را ببینید.

<a id="migrating"></a>

## مهاجرت از قالب اصلی PasarGuard

اگر الان از قالب رسمی PasarGuard استفاده می‌کنید، پنل شما از قبل تنظیم شده است. مسیر فایل و خطوط `.env` تغییری نمی‌کنند و فقط فایل `index.html` عوض می‌شود.

۱. از قالب فعلی نسخه‌ی پشتیبان بگیرید:

```sh
sudo cp /var/lib/pasarguard/templates/subscription/index.html \
        /var/lib/pasarguard/templates/subscription/index.html.bak
```

۲. قالب جدید را با [روش ۱ یا روش ۲](#install) نصب کنید. اسکریپت نصب سریع نسخه‌ی پشتیبان را خودش می‌سازد.

۳. پنل را ری‌استارت کنید:

```sh
pasarguard restart
```

۴. (اختیاری) [شارژ اضطراری](#emergency-charge) را راه‌اندازی کنید.

**برای کاربران چه چیزی تغییر می‌کند؟**
- بخش «اپلیکیشن‌ها» جای خود را به «برنامه‌ها و آموزش اتصال» می‌دهد.
- لیست برنامه‌ها حالا داخل خود قالب (`src/constants/tutorials.ts`) تعریف می‌شود. برنامه‌هایی که در تنظیمات پنل (Subscription → Applications) وارد کرده‌اید دیگر در صفحه نمایش داده نمی‌شوند.
- بقیه‌ی بخش‌ها مثل قبل است: حجم، تاریخ انقضا، لینک کانفیگ‌ها، QR، نمودار مصرف و اعلان‌ها.

**بازگشت به قالب اصلی:**

```sh
sudo cp /var/lib/pasarguard/templates/subscription/index.html.bak \
        /var/lib/pasarguard/templates/subscription/index.html
pasarguard restart
```

یا قالب اصلی را دوباره با `--repo PasarGuard/subscription-template` نصب کنید.

<a id="emergency-charge"></a>

## شارژ اضطراری

وقتی وضعیت کاربر `limited` باشد یا حجم باقی‌مانده‌اش کمتر از حد تعیین‌شده باشد، کارت شارژ اضطراری نمایش داده می‌شود. کاربر با زدن دکمه، در هر دوره‌ی خرید یک بار حجم رایگان می‌گیرد. دوره‌ی جدید وقتی شروع می‌شود که سرویس تمدید شود، یعنی تاریخ انقضا یا حجم کل تغییر کند یا حجم مصرفی ریست شود.

صفحه‌ی اشتراک خودش نمی‌تواند حجم کاربر را تغییر دهد، چون این کار دسترسی ادمین لازم دارد. این کار را یک سرویس کوچک در پوشه‌ی [`emergency-charge/`](emergency-charge/README.md) انجام می‌دهد. این سرویس کنار پنل اجرا می‌شود، کاربر را از روی توکن لینک اشتراکش شناسایی می‌کند و اطلاعات ادمین فقط روی سرور می‌ماند.

۱. سرویس را طبق [emergency-charge/README.md](emergency-charge/README.md) نصب و تنظیم کنید. این سرویس یک فایل پایتون بدون نیاز به نصب پکیج است و فایل systemd آماده دارد.

۲. این مقادیر را در `.env` قالب قرار دهید و دوباره build بگیرید (روش ۲):

```dotenv
VITE_EMERGENCY_CHARGE_URL=https://panel.example.com:8765/emergency-charge
VITE_EMERGENCY_CHARGE_MB=500
VITE_EMERGENCY_CHARGE_THRESHOLD_MB=500
VITE_TELEGRAM_BOT_URL=https://t.me/your_bot
```

- `VITE_EMERGENCY_CHARGE_MB` و `VITE_EMERGENCY_CHARGE_THRESHOLD_MB` را برابر با `CHARGE_MB` و `LOW_TRAFFIC_THRESHOLD_MB` سرویس بگذارید.
- اگر `VITE_EMERGENCY_CHARGE_URL` خالی باشد، کارت شارژ نمایش داده نمی‌شود.
- `VITE_TELEGRAM_BOT_URL` دکمه‌ی «خرید از ربات تلگرام» را اضافه می‌کند.

<a id="customization"></a>

## شخصی‌سازی

همه‌ی تنظیمات در فایل `.env` قرار می‌گیرند و بعد از `bun run build` اعمال می‌شوند. نمونه‌ی کامل در [`.env.example`](.env.example) است.

| متغیر | توضیح |
| --- | --- |
| `VITE_FALLBACK_LANGUAGE` | زبان پیش‌فرض: `fa`، `en`، `ru` یا `zh` |
| `VITE_PRIMARY_COLOR_LIGHT` / `VITE_PRIMARY_COLOR_DARK` | رنگ اصلی در تم روشن و تیره. رنگ طلایی تصاویر بالا `oklch(0.62 0.13 75)` / `oklch(0.80 0.14 85)` است. |
| `VITE_BORDER_RADIUS` | گردی گوشه‌ها، مثلاً `0.65rem` |
| `VITE_TELEGRAM_BOT_URL` | لینک ربات تلگرام روی کارت شارژ اضطراری |
| `VITE_EMERGENCY_CHARGE_*` | بخش [شارژ اضطراری](#emergency-charge) را ببینید |

**برنامه‌ها و آموزش‌ها:** برای اضافه یا حذف کردن برنامه، تغییر لینک دانلود یا ویرایش مراحل آموزش، فایل [`src/constants/tutorials.ts`](src/constants/tutorials.ts) را ویرایش کنید. متن‌ها به فارسی و انگلیسی هستند و زبان‌های دیگر از متن انگلیسی استفاده می‌کنند. اسم دکمه‌ها و منوها را داخل backtick بنویسید (مثلاً `` `Update subscription` ``) تا برجسته نمایش داده شوند.

<a id="updating"></a>

## به‌روزرسانی

**نصب سریع:** همان دستور `install.sh` را دوباره اجرا کنید.

**ساخت از سورس:**

```sh
cd subscription-template
git pull
export PATH="$HOME/.bun/bin:$PATH"
bun install && bun run build
sudo cp dist/index.html /var/lib/pasarguard/templates/subscription/index.html
```

فایل `.env` شما در گیت ذخیره نمی‌شود، پس با `git pull` پاک نمی‌شود.

<a id="publishing"></a>

## انتشار نسخه (برای صاحب مخزن)

با انتشار هر Release، یک GitHub Actions برای هر زبان یک فایل می‌سازد و آن‌ها را به Release اضافه می‌کند. `install.sh` همین فایل‌ها را دانلود می‌کند.

۱. (اختیاری) برای اینکه شارژ اضطراری، دکمه‌ی تلگرام یا رنگ دلخواه در نسخه‌ی Release هم باشد، متغیرها را به مخزن اضافه کنید. مسیر: **Settings → Secrets and variables → Actions → Variables**. هر کدام از این متغیرها را که لازم دارید اضافه کنید: `VITE_EMERGENCY_CHARGE_URL`، `VITE_EMERGENCY_CHARGE_MB`، `VITE_EMERGENCY_CHARGE_THRESHOLD_MB`، `VITE_TELEGRAM_BOT_URL`، `VITE_PRIMARY_COLOR_LIGHT`، `VITE_PRIMARY_COLOR_DARK`، `VITE_BORDER_RADIUS`.

۲. به **Releases → Draft a new release** بروید، یک تگ مثل `v2.3.0` بسازید و **Publish release** را بزنید.

۳. صبر کنید تا workflow با نام **Release** تمام شود. بعد از آن، Release شامل `index.html` (پیش‌فرض فارسی) و `en.html`، `fa.html`، `ru.html` و `zh.html` است.

## زبان‌های دیگر

- [English](README.md)
- [Русский (Russian)](README.ru.md)
- [中文 (Chinese)](README.zh.md)

## منبع

بر پایه‌ی [PasarGuard/subscription-template](https://github.com/PasarGuard/subscription-template) از تیم PasarGuard.
