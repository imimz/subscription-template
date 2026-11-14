import type { UserInfo, ConfigData, ChartData, AppClient } from "./user";

export interface InitialData {
  user?: UserInfo; // User data as structured object from template
  links?: string[];
  apps?: AppClient[];
}

// Settings written into index.html by install.sh; each one overrides the matching VITE_* build value.
export interface TemplateConfig {
  emergencyChargeUrl?: string;
  emergencyChargeMb?: number;
  emergencyChargeThresholdMb?: number;
  emergencyChargeExtendHours?: number;
  telegramBotUrl?: string;
  primaryColorLight?: string;
  primaryColorDark?: string;
  borderRadius?: string;
}

declare global {
  interface Window {
    __INITIAL_DATA__?: InitialData;
    __TEMPLATE_CONFIG__?: TemplateConfig;
  }
}

export {};
