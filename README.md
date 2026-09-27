# Subscription Template (PasarGuard) with Emergency Charge & Setup Guide

A responsive subscription page for the [PasarGuard](https://github.com/PasarGuard/panel) panel. It is based on the official [PasarGuard/subscription-template](https://github.com/PasarGuard/subscription-template) and adds:

- **Emergency charge**: a user who is out of traffic can claim free traffic (500 MB by default) once per purchase period, so they can reach your Telegram bot and renew.
- **Setup guide**: pick a platform (Android, iOS, Windows, Linux) and get app cards with download and GitHub links, plus step-by-step setup tutorials.

<p align="center">
  <img src="screenshots/emergency-charge-fa.png" alt="Emergency charge" width="70%">
</p>
<p align="center">
  <img src="screenshots/tutorials-fa.png" alt="Setup guide" width="70%">
  <img src="screenshots/mobile-fa.png" alt="Mobile" width="22%">
</p>

**Interactive demo:** download [`preview/index.html`](preview/index.html) and open it in a browser. It uses sample data and a simulated charge service.

## Contents

- [Features](#features)
- [Compatibility](#compatibility)
- [Install](#install)
- [Migrating from the original PasarGuard template](#migrating)
- [Emergency charge](#emergency-charge)
- [Customization](#customization)
- [Updating](#updating)
- [Publishing a release (repository owner)](#publishing)

## Features

- Languages: `en`, `fa`, `zh`, `ru`, which users can switch in the UI
- Responsive layout and dark mode
- QR code for connection links
- One-click copy for links and configs; Base64 copy is only in the QR modal
- WireGuard links can be copied as a native config or downloaded as `.conf`
- Setup guide with one-tap import buttons for apps that support deep links (v2rayNG, Hiddify, Streisand, sing-box, Clash)
- Emergency charge card with a "buy from Telegram bot" button (optional)
- Custom colors and border radius

## Compatibility

| Subscription Template | PasarGuard Panel |
| --- | --- |
| `v2.x` (this repository) | `v3` |

<a id="install"></a>

## Install

There are two ways to install:

| | Quick install (release) | Build from source |
| --- | --- | --- |
| Setup guide | ✅ | ✅ |
| Emergency charge and Telegram button | Only if the repository owner set them in [repository variables](#publishing) before the release | ✅ Set in your `.env` |
| Custom colors | Same as above | ✅ |
| Needs Bun on the server | No | Yes |

### Option 1: Quick install (release)

```sh
curl -fsSL https://raw.githubusercontent.com/imimz/subscription-template/main/install.sh | sudo bash -s -- --lang fa
```

The script:
- downloads the template from the latest release of this repository
- backs up the current template to `index.html.bak`
- sets `CUSTOM_TEMPLATES_DIRECTORY` and `SUBSCRIPTION_PAGE_TEMPLATE` in `/opt/pasarguard/.env`
- restarts the panel

Options:
- `--lang en|fa|zh|ru`: the default language of the page
- `--version <tag>`: installs a specific release, for example `v2.3.0` (default: `latest`)
- `--repo <owner>/<repo>`: installs from another repository

> The quick install needs a published release in this repository. If it reports that it could not download the file, use option 2.

### Option 2: Build from source (recommended when you use emergency charge)

```sh
# Bun needs unzip to install
sudo apt update && sudo apt install -y unzip git
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"

git clone https://github.com/imimz/subscription-template.git
cd subscription-template
cp .env.example .env
nano .env        # set language, colors, Telegram bot and emergency charge (see below)

bun install
bun run build

sudo mkdir -p /var/lib/pasarguard/templates/subscription
sudo cp dist/index.html /var/lib/pasarguard/templates/subscription/index.html
```

Then add these lines to `/opt/pasarguard/.env` (skip if they are already there) and restart:

```dotenv
CUSTOM_TEMPLATES_DIRECTORY="/var/lib/pasarguard/templates/"
SUBSCRIPTION_PAGE_TEMPLATE="subscription/index.html"
```

```sh
pasarguard restart
```

Open any user's subscription link in a browser to see the new page.

<a id="migrating"></a>

## Migrating from the original PasarGuard template

If you already use the official template, your panel is already configured. The file path and the `.env` lines stay the same; you only replace `index.html`.

1. Back up the current template:

   ```sh
   sudo cp /var/lib/pasarguard/templates/subscription/index.html \
           /var/lib/pasarguard/templates/subscription/index.html.bak
   ```

2. Install the new template with [option 1 or option 2](#install). The quick install script makes the backup for you.

3. Restart the panel:

   ```sh
   pasarguard restart
   ```

4. Optional: set up [emergency charge](#emergency-charge).

What changes for your users:
- The **Apps** section is replaced by the **Apps & setup guide** section. Apps are now defined in the template (`src/constants/tutorials.ts`) instead of the panel's *Subscription → Applications* settings. Those panel settings are no longer shown on the page.
- Everything else stays the same: usage, expiry, config links, QR codes, the chart and announcements.

**Going back to the original template:**

```sh
sudo cp /var/lib/pasarguard/templates/subscription/index.html.bak \
        /var/lib/pasarguard/templates/subscription/index.html
pasarguard restart
```

Or install the original again with `--repo PasarGuard/subscription-template`.

<a id="emergency-charge"></a>

## Emergency Charge

When a user is `limited` or has less than the threshold left, the page shows an emergency charge card. The button adds free traffic once per purchase period. A new period starts when the subscription is renewed: the expire date or data limit changes, or usage is reset.

The page cannot change a data limit by itself, because that needs admin access. A small service in [`emergency-charge/`](emergency-charge/README.md) does it. The service runs next to the panel, checks the user through their subscription token, and keeps the admin credential on the server.

1. Install and configure the service by following [emergency-charge/README.md](emergency-charge/README.md). It is a single Python file with no dependencies, and comes with a systemd unit.
2. Set these in the template's `.env` and build again (option 2):

   ```dotenv
   VITE_EMERGENCY_CHARGE_URL=https://panel.example.com:8765/emergency-charge
   VITE_EMERGENCY_CHARGE_MB=500
   VITE_EMERGENCY_CHARGE_THRESHOLD_MB=500
   VITE_TELEGRAM_BOT_URL=https://t.me/your_bot
   ```

   Keep `VITE_EMERGENCY_CHARGE_MB` and `VITE_EMERGENCY_CHARGE_THRESHOLD_MB` equal to the service's `CHARGE_MB` and `LOW_TRAFFIC_THRESHOLD_MB`. If `VITE_EMERGENCY_CHARGE_URL` is empty, the card is hidden. `VITE_TELEGRAM_BOT_URL` adds the "buy from Telegram bot" button.

<a id="customization"></a>

## Customization

All settings go in `.env` and take effect after `bun run build`. See [`.env.example`](.env.example).

| Variable | Description |
| --- | --- |
| `VITE_FALLBACK_LANGUAGE` | Default language: `en`, `fa`, `zh`, `ru` |
| `VITE_PRIMARY_COLOR_LIGHT` / `VITE_PRIMARY_COLOR_DARK` | Main color for the light and dark themes. The gold theme in the screenshots is `oklch(0.62 0.13 75)` / `oklch(0.80 0.14 85)` |
| `VITE_BORDER_RADIUS` | Corner radius, for example `0.65rem` |
| `VITE_TELEGRAM_BOT_URL` | Telegram bot link shown on the emergency charge card |
| `VITE_EMERGENCY_CHARGE_*` | See [Emergency charge](#emergency-charge) |

**Apps and tutorials:** edit [`src/constants/tutorials.ts`](src/constants/tutorials.ts) to add or remove apps, change download links, or rewrite the steps. Text is written in Persian and English; other languages fall back to English. Wrap button and menu names in backticks (`` `Update subscription` ``) to highlight them.

<a id="updating"></a>

## Updating

- **Quick install:** run the same `install.sh` command again.
- **Build from source:**

  ```sh
  cd subscription-template
  git pull
  export PATH="$HOME/.bun/bin:$PATH"
  bun install && bun run build
  sudo cp dist/index.html /var/lib/pasarguard/templates/subscription/index.html
  ```

  Your `.env` is not tracked by git, so it survives updates.

<a id="publishing"></a>

## Publishing a release (repository owner)

A GitHub Actions workflow builds one file per language and attaches them to every published release. `install.sh` downloads those files.

1. Optional: to include emergency charge, the Telegram button or custom colors in release builds, add repository variables. Go to **Settings → Secrets and variables → Actions → Variables** and set any of: `VITE_EMERGENCY_CHARGE_URL`, `VITE_EMERGENCY_CHARGE_MB`, `VITE_EMERGENCY_CHARGE_THRESHOLD_MB`, `VITE_TELEGRAM_BOT_URL`, `VITE_PRIMARY_COLOR_LIGHT`, `VITE_PRIMARY_COLOR_DARK`, `VITE_BORDER_RADIUS`.
2. Go to **Releases → Draft a new release**, create a tag such as `v2.3.0`, and click **Publish release**.
3. Wait for the **Release** workflow to finish. The release then contains `index.html` (Persian default) and `en.html`, `fa.html`, `ru.html`, `zh.html`.

## Other Languages

- [فارسی (Persian)](README.fa.md)
- [Русский (Russian)](README.ru.md)
- [中文 (Chinese)](README.zh.md)

## Credits

Based on [PasarGuard/subscription-template](https://github.com/PasarGuard/subscription-template) by the PasarGuard team.
