// RevenueCat setup for Kajota Coach (Shipaton 2026).
//
// The Coach app monetizes a single tier — `coach_premium` — sold as a
// monthly or annual auto-renewable subscription. Anything premium in the
// app checks `hasCoachPremium(customerInfo)` before unlocking.
//
// Configure RC dashboard for this app:
//   - Bundle: io.kajota.coach
//   - Products:
//       io.kajota.coach.premium.monthly   ($9.99/mo)
//       io.kajota.coach.premium.annual    ($99.99/yr)
//   - Entitlement:  coach_premium  ← both products attached
//   - Offering:     default with $rc_monthly + $rc_annual packages

import { Platform } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL, PurchasesOffering } from 'react-native-purchases';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as
  | { revenueCatIosKey?: string; revenueCatAndroidKey?: string }
  | undefined;

export const COACH_PREMIUM_ENTITLEMENT = 'coach_premium';

export const COACH_PRODUCT_IDS = {
  MONTHLY: 'io.kajota.coach.premium.monthly',
  ANNUAL: 'io.kajota.coach.premium.annual',
} as const;

let configured = false;

export async function initializeRevenueCat(appUserId?: string): Promise<void> {
  if (configured) {
    if (appUserId) {
      await Purchases.logIn(appUserId);
    }
    return;
  }

  const apiKey = Platform.OS === 'ios' ? extra?.revenueCatIosKey : extra?.revenueCatAndroidKey;
  if (!apiKey) {
    // No key means the operator hasn't wired RC yet. Fail soft so dev builds
    // and non-monetized flows still work — every entitlement check will just
    // return false.
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        `[revenueCat] No API key configured for ${Platform.OS}. Skipping SDK init. ` +
          'Set revenueCatIosKey / revenueCatAndroidKey in app.json extra.',
      );
    }
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({ apiKey, appUserID: appUserId });
  configured = true;
}

export function hasCoachPremium(customerInfo: CustomerInfo | null | undefined): boolean {
  if (!customerInfo) return false;
  return customerInfo.entitlements.active[COACH_PREMIUM_ENTITLEMENT]?.isActive === true;
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch {
    return null;
  }
}
