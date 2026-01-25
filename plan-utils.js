export function getMonthlyLimit(role, plan){
  const LIMITS = {
    OWNER: { BASIC: 1, STANDARD: 4, PREMIUM: 10 },
    BROKER:{ BASIC: 2, STANDARD: 25, PREMIUM: 999999 } // unlimited
  };
  return LIMITS?.[role]?.[plan] ?? 0;
}

export function isMonthResetNeeded(monthlyResetAt){
  if(!monthlyResetAt) return true;
  const last = monthlyResetAt.toDate ? monthlyResetAt.toDate() : new Date(monthlyResetAt);
  const now = new Date();
  return (last.getMonth() !== now.getMonth()) || (last.getFullYear() !== now.getFullYear());
}
