import { memo, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen, Check, CheckCircle2, Copy, Download, DownloadCloud, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AndroidPlatformIcon,
  ApplePlatformIcon,
  LinuxPlatformIcon,
  WindowsPlatformIcon,
  type PlatformIconProps,
} from '@/components/platform-icons'
import { TUTORIAL_PLATFORMS, type Localized, type TutorialApp, type TutorialPlatformId } from '@/constants/tutorials'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { detectOS } from '@/lib/osDetector'
import { cn } from '@/lib/utils'

const PLATFORM_ICONS: Record<TutorialPlatformId, { icon: ComponentType<PlatformIconProps>; className: string }> = {
  android: { icon: AndroidPlatformIcon, className: 'text-green-500' },
  ios: { icon: ApplePlatformIcon, className: 'text-foreground' },
  windows: { icon: WindowsPlatformIcon, className: 'text-sky-500' },
  linux: { icon: LinuxPlatformIcon, className: 'text-amber-500' },
}

const getDefaultPlatform = (): TutorialPlatformId => {
  switch (detectOS()) {
    case 'ios':
    case 'macos':
    case 'appletv':
      return 'ios'
    case 'windows':
      return 'windows'
    case 'linux':
      return 'linux'
    default:
      return 'android'
  }
}

const getDefaultAppId = (platformId: TutorialPlatformId) => {
  const apps = TUTORIAL_PLATFORMS.find(platform => platform.id === platformId)?.apps ?? []
  return (apps.find(app => app.recommended) ?? apps[0])?.id
}

// Query-string placeholders (`?url={url}`) need an encoded URL; path placeholders take it as is.
const buildImportUrl = (template: string, subscriptionUrl: string) =>
  template.replace(/(=?)\{url\}/g, (_, eq: string) => (eq ? `=${encodeURIComponent(subscriptionUrl)}` : subscriptionUrl))

// Renders `backtick` segments as highlighted app menu/button names.
const renderRichText = (text: string): ReactNode[] =>
  text.split('`').map((part, index) =>
    index % 2 === 1 ? (
      <bdi key={index} className="rounded bg-muted px-1 py-0.5 font-semibold text-foreground">
        {part}
      </bdi>
    ) : (
      part
    ),
  )

export const AppTutorials = memo(function AppTutorials() {
  const { t, i18n } = useTranslation()
  const lang: keyof Localized = i18n.language?.startsWith('fa') ? 'fa' : 'en'
  const numberFormat = useMemo(() => new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en'), [lang])

  const [platformId, setPlatformId] = useState<TutorialPlatformId>(getDefaultPlatform)
  const [selectedAppId, setSelectedAppId] = useState(() => getDefaultAppId(platformId))
  const tutorialRef = useRef<HTMLDivElement>(null)

  const platform = TUTORIAL_PLATFORMS.find(item => item.id === platformId) ?? TUTORIAL_PLATFORMS[0]
  const selectedApp = platform.apps.find(app => app.id === selectedAppId) ?? platform.apps[0]
  const PlatformIcon = PLATFORM_ICONS[platform.id].icon

  const selectPlatform = (id: TutorialPlatformId) => {
    setPlatformId(id)
    setSelectedAppId(getDefaultAppId(id))
  }

  const showTutorial = (appId: string) => {
    setSelectedAppId(appId)
    // Wait for the tutorial to re-render with the new app before scrolling to it.
    requestAnimationFrame(() => tutorialRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn">
      {/* Platform picker */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4" role="tablist">
        {TUTORIAL_PLATFORMS.map(item => {
          const { icon: Icon, className } = PLATFORM_ICONS[item.id]
          const isActive = item.id === platform.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => selectPlatform(item.id)}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border bg-card p-4 text-center transition-all duration-200 sm:p-6',
                'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5',
                isActive && 'border-primary bg-primary/10 shadow-lg shadow-primary/10',
              )}
            >
              <Icon className={cn('size-9 sm:size-11', className)} />
              <span className="page-section-title">{item.title[lang]}</span>
              <span className="page-badge text-muted-foreground" dir="ltr">
                {item.subtitle}
              </span>
              <CheckCircle2 className={cn('size-4 text-primary', !isActive && 'invisible')} />
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:rounded-3xl sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 border-b pb-4">
          <PlatformIcon className={cn('size-9 shrink-0', PLATFORM_ICONS[platform.id].className)} />
          <div className="min-w-0">
            <h3 className="page-section-title text-primary">
              {t('tutorials.appsFor', { platform: platform.title[lang] })}
            </h3>
            <p className="page-meta">{t('tutorials.appsHint')}</p>
          </div>
        </div>

        {/* Apps grid */}
        <div className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {platform.apps.map(app => (
            <AppCard
              key={app.id}
              app={app}
              lang={lang}
              isSelected={app.id === selectedApp.id}
              onSelect={() => setSelectedAppId(app.id)}
              onShowTutorial={() => showTutorial(app.id)}
            />
          ))}
        </div>

        {/* Tutorial */}
        <div ref={tutorialRef} className="scroll-mt-4 space-y-3 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/60 p-3 sm:p-4">
            <div className="flex min-w-0 items-center gap-2">
              <selectedApp.icon className={cn('size-5 shrink-0', selectedApp.iconClassName)} />
              <h4 className="page-item-title">{t('tutorials.tutorialFor', { app: selectedApp.name })}</h4>
            </div>
            {selectedApp.download && <DownloadButton app={selectedApp} size="sm" highlighted />}
          </div>

          <ol className="space-y-3">
            <TutorialStepItem number={numberFormat.format(1)} title={t('tutorials.copyStep.title')}>
              <CopyStepBody app={selectedApp} />
            </TutorialStepItem>
            {selectedApp.steps.map((step, index) => (
              <TutorialStepItem key={index} number={numberFormat.format(index + 2)} title={step.title[lang]}>
                <p className="page-meta leading-7">{renderRichText(step.body[lang])}</p>
              </TutorialStepItem>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
})

function AppCard({
  app,
  lang,
  isSelected,
  onSelect,
  onShowTutorial,
}: {
  app: TutorialApp
  lang: keyof Localized
  isSelected: boolean
  onSelect: () => void
  onShowTutorial: () => void
}) {
  const { t } = useTranslation()
  const Icon = app.icon

  return (
    <div
      onClick={onSelect}
      className={cn(
        'relative flex cursor-pointer flex-col gap-2 rounded-xl border bg-background/60 p-3 transition-all duration-200 sm:p-4',
        'hover:border-primary/40 hover:shadow-md hover:shadow-primary/5',
        isSelected && 'border-primary ring-1 ring-primary/40 bg-primary/5',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={cn('size-6 shrink-0', app.iconClassName)} />
          <h4 className="page-item-title">
            {app.name}
            {app.recommended && <span className="text-primary"> ({t('tutorials.recommended')})</span>}
          </h4>
        </div>
        {isSelected && (
          <span className="page-badge inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
            <Check className="size-3" />
            {t('tutorials.viewing')}
          </span>
        )}
      </div>

      <p className="page-meta line-clamp-2">{app.description[lang]}</p>

      <div className="mt-auto flex flex-col gap-2 pt-1">
        <div className="flex gap-2">
          {app.download && <DownloadButton app={app} highlighted={isSelected} className="flex-1" />}
          {app.githubUrl && (
            <Button asChild variant="outline" size="sm" onClick={event => event.stopPropagation()}>
              <a href={app.githubUrl} target="_blank" rel="noopener noreferrer">
                <Github />
                {t('tutorials.github')}
              </a>
            </Button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
          onClick={event => {
            event.stopPropagation()
            onShowTutorial()
          }}
        >
          <BookOpen />
          {t('tutorials.viewTutorial')}
        </Button>
      </div>
    </div>
  )
}

function DownloadButton({
  app,
  highlighted,
  size = 'sm',
  className,
}: {
  app: TutorialApp
  highlighted?: boolean
  size?: 'sm' | 'default'
  className?: string
}) {
  const { t } = useTranslation()
  if (!app.download) return null

  return (
    <Button
      asChild
      size={size}
      variant={highlighted ? 'default' : 'outline'}
      className={className}
      onClick={event => event.stopPropagation()}
    >
      <a href={app.download.url} target="_blank" rel="noopener noreferrer">
        <Download />
        {t(`tutorials.download.${app.download.kind}`)}
      </a>
    </Button>
  )
}

function TutorialStepItem({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3 rounded-xl border border-s-4 border-s-primary bg-background/60 p-3 sm:gap-4 sm:p-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-md shadow-primary/30">
        {number}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <h5 className="page-item-title">{title}</h5>
        {children}
      </div>
    </li>
  )
}

function CopyStepBody({ app }: { app: TutorialApp }) {
  const { t } = useTranslation()
  const { copyToClipboard, isCopied } = useCopyToClipboard()
  const subscriptionUrl = `${window.location.origin}${window.location.pathname.replace(/\/info$/, '')}`
  const copied = isCopied('tutorial-subscription')

  return (
    <div className="space-y-2">
      <p className="page-meta leading-7">
        {app.importUrl ? t('tutorials.copyStep.bodyWithImport', { app: app.name }) : t('tutorials.copyStep.body')}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={copied ? 'default' : 'outline'}
          onClick={() => copyToClipboard(subscriptionUrl, 'tutorial-subscription')}
        >
          {copied ? <Check /> : <Copy />}
          {t('tutorials.copyStep.copy')}
        </Button>
        {app.importUrl && (
          <Button asChild size="sm">
            <a href={buildImportUrl(app.importUrl, subscriptionUrl)}>
              <DownloadCloud />
              {t('tutorials.copyStep.import', { app: app.name })}
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}
