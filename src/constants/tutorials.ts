import type { LucideIcon } from 'lucide-react'
import { Box, Cat, Network, Package, Plane, Rocket, Send, Shield, ShieldCheck, Sparkles } from 'lucide-react'

/**
 * Content of the "apps & tutorials" section.
 *
 * Edit this file to add/remove apps or change the tutorial steps, then rebuild.
 * Text is written in Persian (fa) and English (en); other languages fall back to English.
 * Wrap app menu/button names in backticks (`Update subscription`) to highlight them.
 * The "copy subscription link" step is added automatically as the first step of every tutorial.
 */

export type Localized = { fa: string; en: string }

export type TutorialPlatformId = 'android' | 'ios' | 'windows' | 'linux'

export type DownloadKind = 'apk' | 'appStore' | 'googlePlay' | 'direct'

export interface TutorialStep {
  title: Localized
  body: Localized
}

export interface TutorialApp {
  id: string
  name: string
  icon: LucideIcon
  /** Tailwind text color class for the icon. */
  iconClassName: string
  recommended?: boolean
  description: Localized
  download?: { url: string; kind: DownloadKind }
  githubUrl?: string
  /** Deep link that imports the subscription in one tap; `{url}` is replaced with the subscription URL. */
  importUrl?: string
  steps: TutorialStep[]
}

export interface TutorialPlatform {
  id: TutorialPlatformId
  title: Localized
  subtitle: string
  apps: TutorialApp[]
}

const hiddifySteps: TutorialStep[] = [
  {
    title: { fa: 'افزودن لینک در Hiddify', en: 'Add the link in Hiddify' },
    body: {
      fa: 'برنامه Hiddify را باز کنید (در اولین اجرا زبان و منطقه را انتخاب کنید). روی دکمه `+` (`New Profile`) بزنید و گزینه `Add from clipboard` را انتخاب کنید.',
      en: 'Open Hiddify (pick your language and region on first launch). Tap `+` (`New Profile`) and choose `Add from clipboard`.',
    },
  },
  {
    title: { fa: 'اتصال', en: 'Connect' },
    body: {
      fa: 'روی دکمه بزرگ اتصال وسط صفحه بزنید و درخواست اتصال VPN را تایید کنید. Hiddify به‌صورت خودکار بهترین سرور را انتخاب می‌کند.',
      en: 'Tap the big connect button in the middle of the screen and accept the VPN request. Hiddify picks the best server automatically.',
    },
  },
  {
    title: { fa: 'به‌روزرسانی سرورها', en: 'Update servers' },
    body: {
      fa: 'هر زمان سرورها تغییر کرد، روی آیکون به‌روزرسانی کنار نام پروفایل بزنید تا لیست سرورها تازه شود.',
      en: 'Whenever servers change, tap the refresh icon next to the profile name to reload the server list.',
    },
  },
]

const singBoxSteps: TutorialStep[] = [
  {
    title: { fa: 'افزودن پروفایل در sing-box', en: 'Add a profile in sing-box' },
    body: {
      fa: 'برنامه را باز کنید و به تب `Profiles` بروید. روی `New Profile` بزنید، نوع را `Remote` انتخاب کنید، یک نام دلخواه بنویسید، لینک را در قسمت `URL` قرار دهید و `Create` را بزنید.',
      en: 'Open the app and go to the `Profiles` tab. Tap `New Profile`, set the type to `Remote`, enter any name, paste the link into `URL` and tap `Create`.',
    },
  },
  {
    title: { fa: 'اتصال', en: 'Connect' },
    body: {
      fa: 'به تب `Dashboard` برگردید، پروفایل ساخته‌شده را انتخاب کنید و دکمه `Start` را بزنید. درخواست اتصال VPN را تایید کنید.',
      en: 'Go back to `Dashboard`, select the profile you created and tap `Start`. Accept the VPN request.',
    },
  },
]

const karingSteps: TutorialStep[] = [
  {
    title: { fa: 'افزودن لینک در Karing', en: 'Add the link in Karing' },
    body: {
      fa: 'Karing را باز کنید و مراحل راه‌اندازی اولیه را طی کنید. روی `+` بالای صفحه بزنید، گزینه `Import from clipboard` را انتخاب کنید و یک نام دلخواه برای پروفایل بنویسید.',
      en: 'Open Karing and finish the first-run setup. Tap `+` at the top, choose `Import from clipboard` and give the profile a name.',
    },
  },
  {
    title: { fa: 'اتصال', en: 'Connect' },
    body: {
      fa: 'در صفحه اصلی روی دکمه اتصال بزنید و درخواست VPN را تایید کنید. Karing به‌صورت خودکار سریع‌ترین سرور را انتخاب می‌کند؛ برای انتخاب دستی روی نام سرور بزنید.',
      en: 'Tap the connect button on the home screen and accept the VPN request. Karing picks the fastest server automatically; tap the server name to choose one yourself.',
    },
  },
]

const v2rayNSteps: TutorialStep[] = [
  {
    title: { fa: 'نصب و اجرا', en: 'Install and run' },
    body: {
      fa: 'از صفحه دانلود، فایل مناسب سیستم خود را دریافت کنید، از حالت فشرده خارج کنید و برنامه `v2rayN` را اجرا کنید.',
      en: 'From the download page get the file for your system, extract it and run `v2rayN`.',
    },
  },
  {
    title: { fa: 'افزودن لینک اشتراک', en: 'Add the subscription' },
    body: {
      fa: 'از منوی `Subscription group` گزینه `Subscription group setting` را باز کنید، روی `Add` بزنید، لینک را در قسمت `URL` قرار دهید و ذخیره کنید. سپس از همان منو `Update subscription without proxy` را بزنید.',
      en: 'Open `Subscription group` → `Subscription group setting`, click `Add`, paste the link into `URL` and save. Then click `Update subscription without proxy` from the same menu.',
    },
  },
  {
    title: { fa: 'تست تاخیر و اتصال', en: 'Test latency and connect' },
    body: {
      fa: 'همه سرورها را با `Ctrl+A` انتخاب و با `Ctrl+R` تست کنید. سرور با کمترین تاخیر را انتخاب و `Enter` بزنید، سپس در پایین برنامه `System proxy` را روی `Set system proxy` قرار دهید.',
      en: 'Select all servers with `Ctrl+A` and test them with `Ctrl+R`. Pick the one with the lowest delay and press `Enter`, then set `System proxy` at the bottom to `Set system proxy`.',
    },
  },
]

const clashVergeSteps: TutorialStep[] = [
  {
    title: { fa: 'افزودن پروفایل', en: 'Add a profile' },
    body: {
      fa: 'برنامه را نصب و اجرا کنید. به بخش `Profiles` بروید، لینک را در کادر بالای صفحه قرار دهید و `Import` را بزنید.',
      en: 'Install and open the app. Go to `Profiles`, paste the link into the box at the top and click `Import`.',
    },
  },
  {
    title: { fa: 'فعال‌سازی و اتصال', en: 'Activate and connect' },
    body: {
      fa: 'روی پروفایل اضافه‌شده کلیک کنید تا فعال شود. سپس در بخش `Settings` گزینه `System Proxy` را روشن کنید (یا برای همه برنامه‌ها `TUN Mode` را فعال کنید).',
      en: 'Click the imported profile to activate it. Then turn on `System Proxy` in `Settings` (or enable `TUN Mode` to cover every app).',
    },
  },
  {
    title: { fa: 'انتخاب سرور', en: 'Choose a server' },
    body: {
      fa: 'در بخش `Proxies` می‌توانید تاخیر سرورها را تست کنید و سرور دلخواه را انتخاب کنید.',
      en: 'In `Proxies` you can test server latency and pick the one you want.',
    },
  },
]

export const TUTORIAL_PLATFORMS: TutorialPlatform[] = [
  {
    id: 'android',
    title: { fa: 'اندروید', en: 'Android' },
    subtitle: 'Android',
    apps: [
      {
        id: 'v2rayng',
        name: 'v2rayNG',
        icon: Shield,
        iconClassName: 'text-yellow-500',
        recommended: true,
        description: {
          fa: 'پایدارترین و محبوب‌ترین نرم‌افزار اندروید با آپدیت مرتب',
          en: 'The most stable and popular Android client, regularly updated',
        },
        download: { url: 'https://github.com/2dust/v2rayNG/releases/latest', kind: 'apk' },
        githubUrl: 'https://github.com/2dust/v2rayNG',
        importUrl: 'v2rayng://install-config?url={url}',
        steps: [
          {
            title: { fa: 'افزودن لینک در v2rayNG', en: 'Add the link in v2rayNG' },
            body: {
              fa: 'نرم‌افزار v2rayNG را باز کنید. روی علامت `+` بالای صفحه بزنید و گزینه `Import config from Clipboard` را انتخاب کنید. (یا از منوی ☰ وارد `Subscription group setting` شوید، روی `+` بزنید و لینک را در قسمت `URL` قرار دهید.)',
              en: 'Open v2rayNG. Tap `+` at the top and choose `Import config from Clipboard`. (Or open ☰ → `Subscription group setting`, tap `+` and paste the link into `URL`.)',
            },
          },
          {
            title: { fa: 'به‌روزرسانی سرورها (Update Subscription)', en: 'Update servers (Update Subscription)' },
            body: {
              fa: 'در صفحه اصلی، منوی ⋮ بالا را باز کنید و گزینه `Update subscription` را بزنید تا همه سرورها بارگذاری شوند.',
              en: 'On the main screen open the ⋮ menu and tap `Update subscription` to load all servers.',
            },
          },
          {
            title: { fa: 'تست تاخیر (Real Delay) و اتصال', en: 'Test delay (Real Delay) and connect' },
            body: {
              fa: 'از منوی ⋮ گزینه `Real delay all configuration` را بزنید. یکی از سرورهایی که تاخیر کمتری دارد را انتخاب کنید، دکمه دایره‌ای `V` پایین صفحه را بزنید و درخواست اتصال را `OK` کنید.',
              en: 'From the ⋮ menu tap `Real delay all configuration`. Select a server with low delay, tap the round `V` button at the bottom and press `OK` on the connection request.',
            },
          },
        ],
      },
      {
        id: 'hiddify-android',
        name: 'Hiddify Next',
        icon: Rocket,
        iconClassName: 'text-sky-500',
        description: {
          fa: 'محیط فارسی مدرن، اتصال خودکار هوشمند به بهترین سرور',
          en: 'Modern UI with Persian support, auto-connects to the best server',
        },
        download: { url: 'https://github.com/hiddify/hiddify-app/releases/latest', kind: 'apk' },
        githubUrl: 'https://github.com/hiddify/hiddify-app',
        importUrl: 'hiddify://import/{url}',
        steps: hiddifySteps,
      },
      {
        id: 'nekobox',
        name: 'NekoBox',
        icon: Box,
        iconClassName: 'text-amber-500',
        description: {
          fa: 'مبتنی بر هسته قدرتمند Sing-Box با تنظیمات حرفه‌ای',
          en: 'Built on the powerful sing-box core with advanced settings',
        },
        download: { url: 'https://github.com/MatsuriDayo/NekoBoxForAndroid/releases/latest', kind: 'apk' },
        githubUrl: 'https://github.com/MatsuriDayo/NekoBoxForAndroid',
        steps: [
          {
            title: { fa: 'افزودن گروه اشتراک', en: 'Add a subscription group' },
            body: {
              fa: 'NekoBox را باز کنید. از منوی ☰ وارد `Groups` شوید، روی `+` بزنید، `Type` را روی `Subscription` بگذارید، لینک را در قسمت `URL` قرار دهید و ذخیره کنید.',
              en: 'Open NekoBox. Go to ☰ → `Groups`, tap `+`, set `Type` to `Subscription`, paste the link into `URL` and save.',
            },
          },
          {
            title: { fa: 'به‌روزرسانی و تست سرورها', en: 'Update and test servers' },
            body: {
              fa: 'در صفحه اصلی تب گروه اشتراک را باز کنید، از منوی ⋮ گزینه `Update subscription` و سپس `URL Test` را بزنید.',
              en: 'On the main screen open the subscription tab, then from ⋮ tap `Update subscription` followed by `URL Test`.',
            },
          },
          {
            title: { fa: 'اتصال', en: 'Connect' },
            body: {
              fa: 'یک سرور با تاخیر کم انتخاب کنید و دکمه اتصال پایین صفحه را بزنید.',
              en: 'Pick a server with low delay and tap the connect button at the bottom.',
            },
          },
        ],
      },
      {
        id: 'karing-android',
        name: 'Karing',
        icon: Send,
        iconClassName: 'text-blue-500',
        description: {
          fa: 'کلاینت نسل جدید و ساده با اتصال خودکار و TUN Mode',
          en: 'Simple next-gen client with auto-connect and TUN mode',
        },
        download: { url: 'https://github.com/KaringX/karing/releases/latest', kind: 'apk' },
        githubUrl: 'https://github.com/KaringX/karing',
        steps: karingSteps,
      },
      {
        id: 'cmfa',
        name: 'Clash Meta (CMFA)',
        icon: Cat,
        iconClassName: 'text-cyan-500',
        description: {
          fa: 'پشتیبانی هوشمند از رول‌های تفکیک ترافیک داخلی و خارجی',
          en: 'Smart rule-based routing for domestic and foreign traffic',
        },
        download: { url: 'https://github.com/MetaCubeX/ClashMetaForAndroid/releases/latest', kind: 'apk' },
        githubUrl: 'https://github.com/MetaCubeX/ClashMetaForAndroid',
        importUrl: 'clash://install-config?url={url}',
        steps: [
          {
            title: { fa: 'افزودن پروفایل', en: 'Add a profile' },
            body: {
              fa: 'برنامه را باز کنید و وارد `Profiles` شوید. روی `+` بزنید، `URL` را انتخاب کنید، لینک را در قسمت `URL` قرار دهید و ذخیره کنید.',
              en: 'Open the app and go to `Profiles`. Tap `+`, choose `URL`, paste the link into `URL` and save.',
            },
          },
          {
            title: { fa: 'فعال‌سازی و اتصال', en: 'Activate and connect' },
            body: {
              fa: 'پروفایل را انتخاب کنید، به صفحه اصلی برگردید و روی `Stopped` بزنید تا به `Running` تغییر کند. در بخش `Proxy` می‌توانید سرور را انتخاب کنید.',
              en: 'Select the profile, go back to the home screen and tap `Stopped` so it turns into `Running`. Choose a server under `Proxy`.',
            },
          },
        ],
      },
      {
        id: 'sfa',
        name: 'Sing-box (SFA)',
        icon: Network,
        iconClassName: 'text-green-500',
        description: {
          fa: 'کلاینت رسمی هسته سریع Sing-Box با حداقل مصرف باتری',
          en: 'Official sing-box client, fast with low battery usage',
        },
        download: { url: 'https://play.google.com/store/apps/details?id=io.nekohasekai.sfa', kind: 'googlePlay' },
        githubUrl: 'https://github.com/SagerNet/sing-box',
        importUrl: 'sing-box://import-remote-profile?url={url}',
        steps: singBoxSteps,
      },
    ],
  },
  {
    id: 'ios',
    title: { fa: 'آی‌اواس', en: 'iOS' },
    subtitle: 'iPhone & iPad',
    apps: [
      {
        id: 'streisand',
        name: 'Streisand',
        icon: Sparkles,
        iconClassName: 'text-violet-500',
        recommended: true,
        description: {
          fa: 'رایگان، سبک و پرطرفدار با پشتیبانی از همه پروتکل‌ها',
          en: 'Free, lightweight and popular, supports every protocol',
        },
        download: { url: 'https://apps.apple.com/app/streisand/id6450534064', kind: 'appStore' },
        importUrl: 'streisand://import/{url}',
        steps: [
          {
            title: { fa: 'افزودن لینک در Streisand', en: 'Add the link in Streisand' },
            body: {
              fa: 'Streisand را باز کنید، روی `+` بالای صفحه بزنید و گزینه `Add from clipboard` را انتخاب کنید.',
              en: 'Open Streisand, tap `+` at the top and choose `Add from clipboard`.',
            },
          },
          {
            title: { fa: 'اتصال', en: 'Connect' },
            body: {
              fa: 'یک سرور را انتخاب کنید و کلید اتصال بالای صفحه را روشن کنید. در اولین اتصال، درخواست افزودن VPN را `Allow` کنید.',
              en: 'Select a server and turn on the switch at the top. On first connection, `Allow` adding the VPN configuration.',
            },
          },
          {
            title: { fa: 'به‌روزرسانی سرورها', en: 'Update servers' },
            body: {
              fa: 'برای دریافت جدیدترین سرورها، لیست را به پایین بکشید تا به‌روزرسانی شود.',
              en: 'Pull the list down to refresh and get the latest servers.',
            },
          },
        ],
      },
      {
        id: 'v2box',
        name: 'V2Box',
        icon: Package,
        iconClassName: 'text-orange-500',
        description: {
          fa: 'رابط کاربری ساده با امکان تست سرعت سرورها',
          en: 'Simple interface with built-in server speed tests',
        },
        download: { url: 'https://apps.apple.com/app/v2box-v2ray-client/id6446814690', kind: 'appStore' },
        steps: [
          {
            title: { fa: 'افزودن اشتراک', en: 'Add the subscription' },
            body: {
              fa: 'V2Box را باز کنید، به تب `Configs` بروید، روی `+` بزنید و `Add Subscription` را انتخاب کنید. یک نام دلخواه بنویسید، لینک را در قسمت `URL` قرار دهید و `Add` را بزنید.',
              en: 'Open V2Box, go to `Configs`, tap `+` and choose `Add Subscription`. Enter any name, paste the link into `URL` and tap `Add`.',
            },
          },
          {
            title: { fa: 'اتصال', en: 'Connect' },
            body: {
              fa: 'یک سرور را انتخاب کنید، به تب `Home` بروید و روی `Connect` بزنید. درخواست افزودن VPN را `Allow` کنید.',
              en: 'Select a server, go to `Home` and tap `Connect`. `Allow` the VPN configuration request.',
            },
          },
        ],
      },
      {
        id: 'hiddify-ios',
        name: 'Hiddify',
        icon: Rocket,
        iconClassName: 'text-sky-500',
        description: {
          fa: 'محیط فارسی مدرن، اتصال خودکار هوشمند به بهترین سرور',
          en: 'Modern UI with Persian support, auto-connects to the best server',
        },
        download: { url: 'https://apps.apple.com/app/hiddify-proxy-vpn/id6596777532', kind: 'appStore' },
        githubUrl: 'https://github.com/hiddify/hiddify-app',
        importUrl: 'hiddify://import/{url}',
        steps: hiddifySteps,
      },
      {
        id: 'karing-ios',
        name: 'Karing',
        icon: Send,
        iconClassName: 'text-blue-500',
        description: {
          fa: 'کلاینت نسل جدید و ساده با اتصال خودکار',
          en: 'Simple next-gen client with auto-connect',
        },
        download: { url: 'https://apps.apple.com/app/karing/id6472431552', kind: 'appStore' },
        githubUrl: 'https://github.com/KaringX/karing',
        steps: karingSteps,
      },
      {
        id: 'sfi',
        name: 'Sing-box VT',
        icon: Network,
        iconClassName: 'text-green-500',
        description: {
          fa: 'کلاینت رسمی هسته سریع Sing-Box',
          en: 'Official sing-box client',
        },
        download: { url: 'https://apps.apple.com/app/sing-box-vt/id6673731168', kind: 'appStore' },
        githubUrl: 'https://github.com/SagerNet/sing-box',
        importUrl: 'sing-box://import-remote-profile?url={url}',
        steps: singBoxSteps,
      },
      {
        id: 'shadowrocket',
        name: 'Shadowrocket',
        icon: Plane,
        iconClassName: 'text-rose-500',
        description: {
          fa: 'کلاینت حرفه‌ای و پولی با امکانات کامل مسیریابی',
          en: 'Paid, full-featured client with advanced routing',
        },
        download: { url: 'https://apps.apple.com/app/shadowrocket/id932747118', kind: 'appStore' },
        steps: [
          {
            title: { fa: 'افزودن اشتراک', en: 'Add the subscription' },
            body: {
              fa: 'Shadowrocket را باز کنید؛ معمولاً لینک کپی‌شده را خودکار تشخیص می‌دهد و پیشنهاد افزودن می‌دهد (`Add`). در غیر این صورت روی `+` بزنید، `Type` را روی `Subscribe` بگذارید و لینک را در قسمت `URL` قرار دهید.',
              en: 'Open Shadowrocket; it usually detects the copied link and offers to `Add` it. Otherwise tap `+`, set `Type` to `Subscribe` and paste the link into `URL`.',
            },
          },
          {
            title: { fa: 'اتصال', en: 'Connect' },
            body: {
              fa: 'یک سرور را انتخاب کنید و کلید `Not Connected` بالای صفحه را روشن کنید.',
              en: 'Select a server and turn on the `Not Connected` switch at the top.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'windows',
    title: { fa: 'ویندوز', en: 'Windows' },
    subtitle: 'Windows PC',
    apps: [
      {
        id: 'v2rayn-windows',
        name: 'v2rayN',
        icon: ShieldCheck,
        iconClassName: 'text-yellow-500',
        recommended: true,
        description: {
          fa: 'محبوب‌ترین کلاینت ویندوز با امکانات کامل',
          en: 'The most popular full-featured Windows client',
        },
        download: { url: 'https://github.com/2dust/v2rayN/releases/latest', kind: 'direct' },
        githubUrl: 'https://github.com/2dust/v2rayN',
        steps: v2rayNSteps,
      },
      {
        id: 'hiddify-windows',
        name: 'Hiddify',
        icon: Rocket,
        iconClassName: 'text-sky-500',
        description: {
          fa: 'نصب ساده و اتصال با یک کلیک',
          en: 'Easy install and one-click connection',
        },
        download: { url: 'https://github.com/hiddify/hiddify-app/releases/latest', kind: 'direct' },
        githubUrl: 'https://github.com/hiddify/hiddify-app',
        importUrl: 'hiddify://import/{url}',
        steps: hiddifySteps,
      },
      {
        id: 'clash-verge-windows',
        name: 'Clash Verge Rev',
        icon: Cat,
        iconClassName: 'text-cyan-500',
        description: {
          fa: 'رابط کاربری زیبا با TUN Mode و رول‌های هوشمند',
          en: 'Polished UI with TUN mode and smart rules',
        },
        download: { url: 'https://github.com/clash-verge-rev/clash-verge-rev/releases/latest', kind: 'direct' },
        githubUrl: 'https://github.com/clash-verge-rev/clash-verge-rev',
        importUrl: 'clash://install-config?url={url}',
        steps: clashVergeSteps,
      },
      {
        id: 'karing-windows',
        name: 'Karing',
        icon: Send,
        iconClassName: 'text-blue-500',
        description: {
          fa: 'کلاینت نسل جدید و ساده با اتصال خودکار',
          en: 'Simple next-gen client with auto-connect',
        },
        download: { url: 'https://github.com/KaringX/karing/releases/latest', kind: 'direct' },
        githubUrl: 'https://github.com/KaringX/karing',
        steps: karingSteps,
      },
    ],
  },
  {
    id: 'linux',
    title: { fa: 'لینوکس', en: 'Linux' },
    subtitle: 'Linux OS',
    apps: [
      {
        id: 'hiddify-linux',
        name: 'Hiddify',
        icon: Rocket,
        iconClassName: 'text-sky-500',
        recommended: true,
        description: {
          fa: 'نسخه AppImage بدون نیاز به نصب',
          en: 'AppImage build, no installation needed',
        },
        download: { url: 'https://github.com/hiddify/hiddify-app/releases/latest', kind: 'direct' },
        githubUrl: 'https://github.com/hiddify/hiddify-app',
        importUrl: 'hiddify://import/{url}',
        steps: hiddifySteps,
      },
      {
        id: 'v2rayn-linux',
        name: 'v2rayN',
        icon: ShieldCheck,
        iconClassName: 'text-yellow-500',
        description: {
          fa: 'نسخه لینوکس کلاینت محبوب v2rayN',
          en: 'Linux build of the popular v2rayN client',
        },
        download: { url: 'https://github.com/2dust/v2rayN/releases/latest', kind: 'direct' },
        githubUrl: 'https://github.com/2dust/v2rayN',
        steps: v2rayNSteps,
      },
      {
        id: 'clash-verge-linux',
        name: 'Clash Verge Rev',
        icon: Cat,
        iconClassName: 'text-cyan-500',
        description: {
          fa: 'رابط کاربری زیبا با TUN Mode و رول‌های هوشمند',
          en: 'Polished UI with TUN mode and smart rules',
        },
        download: { url: 'https://github.com/clash-verge-rev/clash-verge-rev/releases/latest', kind: 'direct' },
        githubUrl: 'https://github.com/clash-verge-rev/clash-verge-rev',
        importUrl: 'clash://install-config?url={url}',
        steps: clashVergeSteps,
      },
    ],
  },
]
