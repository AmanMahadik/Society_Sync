/**
 * Enterprise Utilities & Business Logic Helpers
 */

/**
 * Formats a currency amount to Indian Rupee (INR) representation
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Validates official SocietySync RTO code pattern (e.g. SS-MH-14-AA-0001)
 */
export function isValidSocietyCode(code: string): boolean {
  const pattern = /^SS-[A-Z]{2}-\d{2}-[A-Z]{2}-\d{4}$/;
  return pattern.test(code.trim().toUpperCase());
}

/**
 * Computes the unified Building Health Score (0-100)
 */
export function calculateBuildingHealthScore(params: {
  waterUptimePct: number;
  liftUptimePct: number;
  collectionRatePct: number;
  openTicketCount: number;
  sosCount: number;
}): number {
  const { waterUptimePct, liftUptimePct, collectionRatePct, openTicketCount, sosCount } = params;

  // Weightings: Water (30%), Lift (25%), Collection (25%), Ticket penalties (10%), SOS penalties (10%)
  let score = (waterUptimePct * 0.3) + (liftUptimePct * 0.25) + (collectionRatePct * 0.25);

  // Penalties
  const ticketPenalty = Math.min(openTicketCount * 2, 10);
  const sosPenalty = Math.min(sosCount * 5, 10);

  score = Math.max(0, Math.min(100, Math.round(score + (10 - ticketPenalty) + (10 - sosPenalty))));
  return score;
}

/**
 * Formats timestamps into readable Indian Standard Time strings
 */
export function formatIST(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
