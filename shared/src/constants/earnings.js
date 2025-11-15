/**
 * Earnings and Penalty Constants
 * These values are used to calculate photographer earnings across web and mobile apps
 */

// Amount earned per successfully delivered order
export const EARNING_PER_ORDER = 300;

// Penalty amount deducted per unaccepted order
export const PENALTY_PER_UNACCEPTED = 100;

// Order statuses
export const ORDER_STATUS = {
  PENDING: 'pending',
  PRINTING: 'printing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  UNACCEPTED: 'unaccepted',
  REJECTED: 'rejected',
};

// Redeem request statuses
export const REDEEM_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  REJECTED: 'rejected',
};

// Order statuses that count as "in progress"
export const IN_PROGRESS_STATUSES = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.PRINTING,
  ORDER_STATUS.SHIPPED,
];
