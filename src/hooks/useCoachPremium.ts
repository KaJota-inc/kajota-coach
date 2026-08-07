// useCoachPremium — subscribes to RC customerInfo updates so any premium
// gate in the app re-renders the instant a purchase or restore succeeds.

import { useEffect, useState } from 'react';
import Purchases, { CustomerInfo } from 'react-native-purchases';

import { COACH_PREMIUM_ENTITLEMENT, hasCoachPremium } from '@/lib/revenueCat';

type UseCoachPremium = {
  isPremium: boolean;
  loading: boolean;
  customerInfo: CustomerInfo | null;
};

export function useCoachPremium(): UseCoachPremium {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const info = await Purchases.getCustomerInfo();
        if (mounted) setCustomerInfo(info);
      } catch {
        // SDK not configured yet (missing key) or offline — leave nulls,
        // the entitlement check downgrades to `isPremium: false`.
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const listener = (info: CustomerInfo) => {
      if (mounted) setCustomerInfo(info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      mounted = false;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  return {
    isPremium: hasCoachPremium(customerInfo),
    loading,
    customerInfo,
  };
}

export { COACH_PREMIUM_ENTITLEMENT };
