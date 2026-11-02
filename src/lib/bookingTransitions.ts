const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'rescheduled'],
  rescheduled: ['confirmed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function isAllowedBookingTransition(current: string, next: string): boolean {
  return ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
}
