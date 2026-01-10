// Maldivian Rufiyaa currency formatter
export const formatMVR = (amount: number): string => {
  return `MVR ${amount.toFixed(2)}`;
};

export const formatMVRCompact = (amount: number): string => {
  if (amount >= 1000000) {
    return `MVR ${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `MVR ${(amount / 1000).toFixed(1)}K`;
  }
  return formatMVR(amount);
};

export const CURRENCY_SYMBOL = "MVR";
export const CURRENCY_CODE = "MVR";
