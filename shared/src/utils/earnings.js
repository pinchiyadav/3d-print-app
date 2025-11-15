import { EARNING_PER_ORDER, PENALTY_PER_UNACCEPTED, ORDER_STATUS, IN_PROGRESS_STATUSES } from '../constants/earnings';

/**
 * Calculate earnings based on order counts
 * @param {number} deliveredCount - Number of delivered orders
 * @param {number} unacceptedCount - Number of unaccepted orders
 * @returns {number} Total earnings from orders
 */
export const calculateOrderEarnings = (deliveredCount, unacceptedCount) => {
  return (deliveredCount * EARNING_PER_ORDER) - (unacceptedCount * PENALTY_PER_UNACCEPTED);
};

/**
 * Calculate order statistics from an array of orders
 * @param {Array} orders - Array of order objects
 * @returns {Object} Statistics object
 */
export const calculateOrderStats = (orders) => {
  const total = orders.length;
  const progress = orders.filter(o => IN_PROGRESS_STATUSES.includes(o.status)).length;
  const delivered = orders.filter(o => o.status === ORDER_STATUS.DELIVERED).length;
  const unaccepted = orders.filter(o => o.status === ORDER_STATUS.UNACCEPTED).length;
  const rejected = orders.filter(o => o.status === ORDER_STATUS.REJECTED).length;

  return {
    total,
    progress,
    delivered,
    unaccepted,
    rejected,
  };
};

/**
 * Calculate total earnings including adjustments
 * @param {Array} orders - Array of order objects
 * @param {Array} adjustments - Array of manual adjustment objects
 * @returns {number} Total gross earnings
 */
export const calculateGrossEarnings = (orders, adjustments = []) => {
  const stats = calculateOrderStats(orders);
  const orderEarnings = calculateOrderEarnings(stats.delivered, stats.unaccepted);
  const adjustmentEarnings = adjustments.reduce((sum, adj) => sum + adj.amount, 0);

  return orderEarnings + adjustmentEarnings;
};

/**
 * Calculate redeemable earnings
 * @param {number} grossEarnings - Total gross earnings
 * @param {Array} redeemRequests - Array of redeem request objects
 * @returns {number} Redeemable amount
 */
export const calculateRedeemableEarnings = (grossEarnings, redeemRequests = []) => {
  const totalRedeemed = redeemRequests
    .filter(r => r.status === 'paid' && r.amountPaid)
    .reduce((sum, r) => sum + r.amountPaid, 0);

  return grossEarnings - totalRedeemed;
};

/**
 * Calculate complete earnings summary
 * @param {Array} orders - Array of order objects
 * @param {Array} adjustments - Array of manual adjustment objects
 * @param {Array} redeemRequests - Array of redeem request objects
 * @returns {Object} Complete earnings summary
 */
export const calculateEarningsSummary = (orders, adjustments = [], redeemRequests = []) => {
  const stats = calculateOrderStats(orders);
  const orderEarnings = calculateOrderEarnings(stats.delivered, stats.unaccepted);
  const adjustmentEarnings = adjustments.reduce((sum, adj) => sum + adj.amount, 0);
  const grossEarnings = orderEarnings + adjustmentEarnings;
  const totalRedeemed = redeemRequests
    .filter(r => r.status === 'paid' && r.amountPaid)
    .reduce((sum, r) => sum + r.amountPaid, 0);
  const redeemableEarnings = grossEarnings - totalRedeemed;

  return {
    ...stats,
    orderEarnings,
    adjustmentEarnings,
    grossEarnings,
    totalRedeemed,
    redeemableEarnings,
  };
};
