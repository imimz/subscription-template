import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CheckCircle2, Send, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  EMERGENCY_CHARGE_MB,
  TELEGRAM_BOT_URL,
  isEmergencyChargeAvailable,
  requestEmergencyCharge,
} from '@/lib/emergencyCharge'

interface EmergencyChargeProps {
  status: string
  dataLimit: number
  usedTraffic: number
  onCharged: () => void | Promise<void>
}

export function EmergencyCharge({ status, dataLimit, usedTraffic, onCharged }: EmergencyChargeProps) {
  const { t, i18n } = useTranslation()
  const [isCharging, setIsCharging] = useState(false)
  const [charged, setCharged] = useState(false)
  const [alreadyUsed, setAlreadyUsed] = useState(false)

  // Keep the success card on screen after the charge lifts the user above the threshold.
  if (!charged && !isEmergencyChargeAvailable({ status, dataLimit, usedTraffic })) return null

  const locale = i18n.language === 'fa' ? 'fa-IR' : i18n.language
  const amount = t('emergencyCharge.amount', { value: new Intl.NumberFormat(locale).format(EMERGENCY_CHARGE_MB) })

  const handleCharge = async () => {
    setIsCharging(true)
    const result = await requestEmergencyCharge()
    setIsCharging(false)

    if (result.ok) {
      setCharged(true)
      toast.success(t('emergencyCharge.success', { amount }))
      await onCharged()
      return
    }

    if (result.code === 'already_used') setAlreadyUsed(true)
    toast.error(t(`emergencyCharge.errors.${result.code}`))
  }

  const botButton = TELEGRAM_BOT_URL && (
    <Button asChild variant={charged ? 'default' : 'outline'}>
      <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer">
        <Send />
        {t('emergencyCharge.goToBot')}
      </a>
    </Button>
  )

  return (
    <div className="mb-6 sm:mb-8 animate-fadeIn">
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4 sm:p-6 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
              {charged ? <CheckCircle2 className="size-6" /> : <Zap className="size-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="page-section-title mb-1">
                {charged ? t('emergencyCharge.chargedTitle') : t('emergencyCharge.title')}
              </h2>
              <p className="page-meta">
                {charged
                  ? t('emergencyCharge.chargedDescription', { amount })
                  : alreadyUsed
                    ? t('emergencyCharge.errors.already_used')
                    : t('emergencyCharge.description', { amount })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:shrink-0">
            {!charged && (
              <Button onClick={handleCharge} disabled={isCharging || alreadyUsed}>
                {isCharging ? <Spinner className="border-2" /> : <Zap />}
                {t('emergencyCharge.button', { amount })}
              </Button>
            )}
            {botButton}
          </div>
        </div>
      </div>
    </div>
  )
}
