/**
 * BOYA Salon Search Ranking & VIP Ordering Engine
 * Ensures VIP salons are prioritized at the top of customer search results
 * with configurable display priorities and badge distinctions.
 */

import { Salon } from '../data/marketplaceData';

/**
 * Sorts salons for customer search results and marketplace views:
 * 1. Approved active VIP salons are displayed first, ordered by displayPriority (1, 2, 3...)
 * 2. Secondary sort among VIP salons by rating (descending)
 * 3. Followed by regular approved active salons, ordered by displayPriority and rating (descending)
 */
export function sortSalonsForSearchResults(salons: Salon[]): Salon[] {
  return [...salons].sort((a, b) => {
    // 1. VIP Status Check (VIP always placed first)
    const aVip = a.isVip ? 1 : 0;
    const bVip = b.isVip ? 1 : 0;

    if (aVip !== bVip) {
      return bVip - aVip; // VIP comes first (1 before 0)
    }

    // 2. If both have the same VIP status, compare displayPriority
    // Lower number = higher placement (e.g. priority 1 is top, priority 2 is second)
    const prioA = typeof a.displayPriority === 'number' && a.displayPriority > 0 ? a.displayPriority : 9999;
    const prioB = typeof b.displayPriority === 'number' && b.displayPriority > 0 ? b.displayPriority : 9999;

    if (prioA !== prioB) {
      return prioA - prioB;
    }

    // 3. Tie-breaker: Star rating (descending)
    const ratingA = a.rating || 0;
    const ratingB = b.rating || 0;
    if (ratingB !== ratingA) {
      return ratingB - ratingA;
    }

    // 4. Final tie-breaker: Reviews count
    return (b.reviewsCount || 0) - (a.reviewsCount || 0);
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
