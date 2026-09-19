/**
 * Categories where price / price_type fields make sense.
 * Any admin-created category (e.g. "Matrimony in Canada") is automatically
 * excluded because its slug won't be in this set.
 */
export const PRICE_ENABLED_SLUGS = new Set([
  'real_estate',
  'vehicles',
  'buy_sell',
  'jobs',
  'services',
  'community',
]);
