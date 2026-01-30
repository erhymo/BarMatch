export type AdminRole = 'superadmin' | 'bar_owner';

export interface AdminMe {
  uid: string;
  email: string | null;
  role: AdminRole;
  barId?: string;
}

export type BillingStatus = 'active' | 'payment_failed' | 'canceled' | 'unknown';

export interface BarDoc {
  name: string;
  email: string;
  isVisible: boolean;
  billingEnabled: boolean;
  billingStatus: BillingStatus;
  stripe?: {
    customerId?: string;
    subscriptionId?: string;
    priceId?: string;
  };
}
