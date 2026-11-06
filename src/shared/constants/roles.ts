export type UserRole = 
  | 'customer' 
  | 'salon_specialist' 
  | 'mobile_specialist' 
  | 'line_manager' 
  | 'salon_admin' 
  | 'super_admin';

export const ROLES = {
  SUPER_ADMIN: 'super_admin' as UserRole,
  SALON_ADMIN: 'salon_admin' as UserRole,
  LINE_MANAGER: 'line_manager' as UserRole,
  SALON_SPECIALIST: 'salon_specialist' as UserRole,
  MOBILE_SPECIALIST: 'mobile_specialist' as UserRole,
  CUSTOMER: 'customer' as UserRole,
};

export const STAFF_ROLES: UserRole[] = [
  ROLES.SUPER_ADMIN,
  ROLES.SALON_ADMIN,
  ROLES.LINE_MANAGER,
  ROLES.SALON_SPECIALIST,
  ROLES.MOBILE_SPECIALIST,
];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'مدیر کل سیستم',
  salon_admin: 'مدیر سالن',
  line_manager: 'مدیر لاین',
  salon_specialist: 'متخصص سالن',
  mobile_specialist: 'متخصص سیار',
  customer: 'مشتری',
};

export const isStaff = (role?: UserRole | null): boolean => 
  !!role && STAFF_ROLES.includes(role);

export const isSuperAdmin = (role?: UserRole | null): boolean => 
  role === ROLES.SUPER_ADMIN;

export const canManageUsers = (role?: UserRole | null): boolean =>
  !!role && [ROLES.SUPER_ADMIN, ROLES.SALON_ADMIN, ROLES.LINE_MANAGER].includes(role);

// Route classification for the role-lock: a logged-in staff member must never
// land on a customer route, and vice versa. Prefix matching covers nested paths.
export const STAFF_ROUTES = ['/salon-admin', '/salon', '/salon-panel', '/admin'];
export const CUSTOMER_ROUTES = ['/', '/salons', '/bookings', '/saved', '/profile'];

export const isStaffRoute = (pathname: string): boolean =>
  STAFF_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

export const isCustomerRoute = (pathname: string): boolean =>
  CUSTOMER_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
