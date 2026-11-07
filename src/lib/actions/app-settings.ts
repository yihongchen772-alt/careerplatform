"use server";

import type { AppSettings } from "@/lib/app-settings-shared";
import { DEFAULT_APP_SETTINGS } from "@/lib/app-settings-shared";

/** Tray, launch-at-login and proxy settings only exist in the desktop shell. */
export async function getAppSettings(): Promise<AppSettings> {
  return DEFAULT_APP_SETTINGS;
}
