import { UserRole } from '@prisma/client';
import { SessionUser } from '@/lib/session';

/**
 * Granular application permissions
 */
export type Permission =
  | 'resource:view'
  | 'resource:create'
  | 'resource:update'
  | 'resource:toggle_status'
  | 'reservation:create'
  | 'reservation:view_own'
  | 'reservation:view_all'
  | 'reservation:cancel_own'
  | 'reservation:cancel_any'
  | 'reservation:update_status'
  | 'analytics:view';

/**
 * Permission Matrix: Maps user roles to explicit allowed permissions (Principle of Least Privilege)
 */
export const ROLE_PERMISSION_MATRIX: Record<UserRole, readonly Permission[]> = {
  ADMIN: [
    'resource:view',
    'resource:create',
    'resource:update',
    'resource:toggle_status',
    'reservation:create',
    'reservation:view_own',
    'reservation:view_all',
    'reservation:cancel_own',
    'reservation:cancel_any',
    'reservation:update_status',
    'analytics:view',
  ],
  EMPLOYEE: [
    'resource:view',
    'reservation:create',
    'reservation:view_own',
    'reservation:cancel_own',
  ],
} as const;

/**
 * Checks whether a given role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowed = ROLE_PERMISSION_MATRIX[role] || [];
  return allowed.includes(permission);
}

/**
 * Asserts that the authenticated user possesses the required permission.
 * Throws 403_FORBIDDEN if unauthorized.
 */
export function assertPermission(user: SessionUser, permission: Permission): void {
  if (!user || !user.role) {
    throw new Error('401_UNAUTHORIZED: Authentication session required.');
  }

  if (!hasPermission(user.role, permission)) {
    throw new Error(
      `403_FORBIDDEN: User with role '${user.role}' lacks required permission '${permission}'.`
    );
  }
}

/**
 * Object-Level Authorization:
 * Validates whether the user is authorized to modify/cancel a specific reservation.
 * Admins can cancel any reservation; Employees can ONLY cancel their own reservations.
 */
export function assertCanManageReservation(
  user: SessionUser,
  reservationOwnerId: string
): void {
  if (!user) {
    throw new Error('401_UNAUTHORIZED');
  }

  // Admins have organization-wide override privileges
  if (user.role === UserRole.ADMIN) {
    return;
  }

  // Horizontal Privilege Escalation Protection (BOLA / IDOR):
  // Employees cannot modify or cancel someone else's booking!
  if (user.id !== reservationOwnerId) {
    throw new Error(
      '403_FORBIDDEN: Unauthorized object access. You can only modify your own reservations.'
    );
  }
}
