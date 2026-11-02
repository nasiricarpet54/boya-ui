/**
 * Removes sensitive PII (Personally Identifiable Information) from user objects
 * based on the requesting user's role and context.
 */
export function redactUserPII(user: any, requester: any) {
  if (!user || !requester) return user;

  const { role: requesterRole, salonId: requesterSalonId, id: requesterId } = requester;
  const isSuperAdmin = requesterRole === 'super_admin';
  const isTargetSalonAdmin = requesterRole === 'salon_admin' && requesterSalonId && user.salonId === requesterSalonId;
  const isSelf = user.id === requesterId;

  // If super admin, salon admin of the member, or self: keep all
  if (isSuperAdmin || isTargetSalonAdmin || isSelf) {
    return user;
  }

  // Otherwise redact phone and email
  const { phone, email, ...safeUser } = user;
  return safeUser;
}

/**
 * Specifically for bookings, we often need the phone for specialists but not email.
 */
export function processBookingData(booking: any, requester: any) {
  if (!booking || !requester) return booking;

  const { role, salonId, id: requesterId } = requester;
  const isSuper = role === 'super_admin';
  const isSalonAdmin = role === 'salon_admin' && (Number(salonId) === Number(booking.salonId));
  const isAssignedSpecialist = (role === 'salon_specialist' || role === 'mobile_specialist') && booking.specialist?.userId === requesterId;
  const isOwner = role === 'customer' && booking.customerId === requesterId;

  const processed = { ...booking };

  if (processed.customer) {
    const { email: cEmail, phone: cPhone, ...cRest } = processed.customer;
    // Specialists need phone to contact, but not email.
    // Salon admins need everything.
    // Customers see their own info anyway.
    if (isSuper || isSalonAdmin || isOwner) {
      processed.customer = { email: cEmail, phone: cPhone, ...cRest };
    } else if (isAssignedSpecialist) {
      processed.customer = { phone: cPhone, ...cRest }; // Redact email
    } else {
      processed.customer = { ...cRest }; // Redact all PII
    }
  }

  return processed;
}
