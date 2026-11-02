/**
 * Removes sensitive PII (Personally Identifiable Information) from user objects
 * based on the requesting user's role and context.
 */
const without = <T extends Record<string, any>>(value: T, keys: string[]) => {
  const safe = { ...value };
  for (const key of keys) delete safe[key];
  return safe;
};

const SENSITIVE_LOG_KEY = /(phone|email|otp|token|password|secret|license|authorization|cookie|base64|address)/i;
export function redactLogValue(value: any, depth = 0): any {
  if (depth > 5) return '[TRUNCATED]';
  if (value instanceof Error) return { name: value.name, message: String(value.message).replace(/09\d{9}/g, '[PHONE]').replace(/\b\d{5}\b/g, '[CODE]') };
  if (Array.isArray(value)) return value.slice(0, 50).map((entry) => redactLogValue(entry, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, SENSITIVE_LOG_KEY.test(key) ? '[REDACTED]' : redactLogValue(entry, depth + 1)]));
  }
  if (typeof value === 'string') return value.replace(/09\d{9}/g, '[PHONE]').replace(/\b\d{5}\b/g, '[CODE]');
  return value;
}

export function redactUserPII(user: any, requester: any) {
  if (!user) return user;
  const isSuperAdmin = requester?.role === 'super_admin';
  const isTargetSalonAdmin = requester?.role === 'salon_admin' && Number(requester.salonId) > 0 && Number(user.salonId) === Number(requester.salonId);
  const isSelf = Number(user.id) === Number(requester?.id);
  if (isSuperAdmin || isTargetSalonAdmin || isSelf) return without(user, ['password', 'otp', 'token', 'uid']);
  return without(user, ['phone', 'email', 'password', 'otp', 'token', 'uid']);
}

/**
 * Specifically for bookings, we often need the phone for specialists but not email.
 */
export function processBookingData(booking: any, requester: any) {
  if (!booking || !requester) return booking;
  const isSuper = requester.role === 'super_admin';
  const isSalonAdmin = requester.role === 'salon_admin' && Number(requester.salonId) === Number(booking.salonId);
  const isAssignedSpecialist = ['salon_specialist', 'mobile_specialist'].includes(requester.role) && Number(booking.specialist?.userId ?? booking.specialist?.user?.id) === Number(requester.id);
  const isOwner = requester.role === 'customer' && Number(booking.customerId) === Number(requester.id);
  const processed = { ...booking };
  if (processed.salon) processed.salon = without(processed.salon, ['licenseDocUrl', 'license_doc_url']);
  if (processed.customer) {
    const customer = without(processed.customer, ['password', 'uid', 'token', 'otp']);
    if (isAssignedSpecialist) delete customer.email;
    else if (!(isSuper || isSalonAdmin || isOwner)) { delete customer.phone; delete customer.email; }
    processed.customer = customer;
  }
  if (processed.specialist?.user) {
    const user = without(processed.specialist.user, ['password', 'uid', 'token', 'otp', 'email']);
    if (!(isSuper || isSalonAdmin || isAssignedSpecialist)) delete user.phone;
    processed.specialist = { ...processed.specialist, user };
  }
  delete processed.licenseDocUrl;
  return processed;
}
