/**
 * Commission resolution rule (single source of truth).
 *
 * Priority: per-service override → specialist's default commissionPercent → null
 * ("not set"). The old SpecialistFinancialsView hardcoded 85%; this replaces
 * that fiction with real configured values while keeping an explicit unset state.
 */
export interface CommissionContext {
  commissionPercent?: number | null;
  serviceCommissions?: Array<{ serviceId: number; commissionPercent: number }> | null;
}

/** Effective percent for one (specialist, service) pair, or null when unset. */
export function resolveCommissionPercent(
  specialist: CommissionContext | null | undefined,
  serviceId?: number | null,
): number | null {
  if (!specialist) return null;
  const overrides = Array.isArray(specialist.serviceCommissions) ? specialist.serviceCommissions : [];
  if (serviceId != null) {
    const hit = overrides.find((o) => Number(o.serviceId) === Number(serviceId));
    if (hit != null) return Number(hit.commissionPercent);
  }
  const base = specialist.commissionPercent;
  return typeof base === 'number' && !Number.isNaN(base) ? base : null;
}
