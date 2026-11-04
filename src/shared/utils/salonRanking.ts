/**
 * BOYA Salon Search Ranking & VIP Ordering Engine
 * Ensures VIP salons are prioritized at the top of customer search results
 * with configurable display priorities and badge distinctions.
 */

import { Salon } from '../data/marketplaceData';

export type SalonSortOption = 'distance' | 'vip' | 'rating' | 'popular' | 'cheapest' | 'expensive';

/**
 * Sorts salons for customer search results and marketplace views:
 * 1. Approved active VIP salons are displayed first, ordered by displayPriority (1, 2, 3...)
 * 2. Secondary sort among VIP salons by rating (descending)
 * 3. Followed by regular approved active salons, ordered by displayPriority and rating (descending)
 */
export function sortSalonsForSearchResults(
  salonsWithMeta: { salon: Salon; distanceKm?: number }[],
  sortBy: SalonSortOption = 'vip'
): { salon: Salon; distanceKm?: number }[] {
  return [...salonsWithMeta].sort((a, b) => {
    const sA = a.salon;
    const sB = b.salon;

    // 1. VIP Status Check (VIP always placed first if sortBy is not specifically distance)
    if (sortBy !== 'distance') {
      const aVip = sA.isVip ? 1 : 0;
      const bVip = sB.isVip ? 1 : 0;

      if (aVip !== bVip) {
        return bVip - aVip; // VIP comes first (1 before 0)
      }
    }

    // 2. Primary sort logic based on option
    if (sortBy === 'distance') {
      const distA = a.distanceKm ?? 999999;
      const distB = b.distanceKm ?? 999999;
      if (distA !== distB) return distA - distB;
    } else if (sortBy === 'rating') {
      const ratA = sA.rating || 0;
      const ratB = sB.rating || 0;
      if (ratA !== ratB) return ratB - ratA;
    } else if (sortBy === 'popular') {
      const revA = sA.reviewsCount || 0;
      const revB = sB.reviewsCount || 0;
      if (revA !== revB) return revB - revA;
    } else if (sortBy === 'cheapest' || sortBy === 'expensive') {
      // P0: order salons by the price of their cheapest (cheapest) or most
      // expensive service, so customers can find affordable options first.
      const priceFor = (s: Salon) =>
        sortBy === 'cheapest'
          ? Math.min(...(s.services?.map((sv: any) => Number(sv.price) || 0) || [0]))
          : Math.max(...(s.services?.map((sv: any) => Number(sv.price) || 0) || [0]));
      const prA = priceFor(sA);
      const prB = priceFor(sB);
      if (prA !== prB) return sortBy === 'cheapest' ? prA - prB : prB - prA;
    }

    // 3. Fallback: compare displayPriority
    const prioA = typeof sA.displayPriority === 'number' && sA.displayPriority > 0 ? sA.displayPriority : 9999;
    const prioB = typeof sB.displayPriority === 'number' && sB.displayPriority > 0 ? sB.displayPriority : 9999;

    if (prioA !== prioB) {
      return prioA - prioB;
    }

    // 4. Final tie-breaker: Star rating (descending)
    return (sB.rating || 0) - (sA.rating || 0);
  });
}

/**
 * Counts currently active VIP salons in a list
 */
export function countVipSalons(salons: Salon[]): number {
  return salons.filter((s) => s.isVip).length;
}

/**
 * Computes the next available priority index for a newly promoted VIP salon
 */
export function getNextVipPriority(salons: Salon[]): number {
  const vipPriorities = salons
    .filter((s) => s.isVip && typeof s.displayPriority === 'number')
    .map((s) => s.displayPriority as number);

  if (vipPriorities.length === 0) return 1;
  return Math.max(...vipPriorities) + 1;
}
