import type { TemplateConfig } from '@/types/global'

const config: TemplateConfig = (typeof window !== 'undefined' && window.__TEMPLATE_CONFIG__) || {}

// A value set by install.sh wins over the build-time VITE_* value.
export const templateSetting = <K extends keyof TemplateConfig>(key: K, buildValue: string | undefined) => {
  const value = config[key]
  if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim()
  return (buildValue ?? '').trim()
}
