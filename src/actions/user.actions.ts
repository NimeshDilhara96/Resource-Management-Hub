'use server';

import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { requireAdmin } from '@/lib/session';
import { logSecurityAudit } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const emailSchema = z.string().trim().email('Please enter a valid email address.');

export interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt: string;
  reservationsCount: number;
}

/**
 * Fetch all registered users in the system (Admins & Employees).
 * Restricted strictly to verified Administrators.
 */
export async function getSystemUsersAction(): Promise<{
  success: boolean;
  users?: UserSummary[];
  error?: string;
}> {
  try {
    await requireAdmin();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: { reservations: true },
        },
      },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    });

    const formatted: UserSummary[] = users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
      reservationsCount: u._count.reservations,
    }));

    return {
      success: true,
      users: formatted,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch users.',
    };
  }
}

/**
 * Promote an Employee to Administrator by typing their email.
 * Validates existence, prevents redundant promotions, updates DB role,
 * and records an immutable audit log.
 */
export async function promoteUserToAdminAction(rawEmail: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  user?: UserSummary;
}> {
  try {
    const session = await requireAdmin();

    const parsed = emailSchema.safeParse(rawEmail);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Please enter a valid email address.',
      };
    }

    const email = parsed.data.toLowerCase();

    // 1. Find target user
    const targetUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      include: {
        _count: {
          select: { reservations: true },
        },
      },
    });

    if (!targetUser) {
      return {
        success: false,
        error: `No registered account found with email "${email}".`,
      };
    }

    // 2. Check if already an admin
    if (targetUser.role === UserRole.ADMIN) {
      return {
        success: false,
        error: `"${targetUser.fullName}" (${targetUser.email}) is already an Administrator.`,
      };
    }

    // 3. Elevate role in database (Single Source of Truth)
    const updated = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        role: UserRole.ADMIN,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // 4. Record tamper-evident security audit log
    logSecurityAudit({
      event: 'USER_ROLE_PROMOTED',
      actorId: session.id,
      actorEmail: session.email,
      actorRole: session.role,
      targetId: updated.id,
      targetType: 'User',
      details: {
        promotedUserEmail: updated.email,
        promotedUserName: updated.fullName,
        previousRole: targetUser.role,
        newRole: UserRole.ADMIN,
      },
      severity: 'INFO',
    });

    // 5. Revalidate cache
    revalidatePath('/admin');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: `Successfully promoted "${updated.fullName}" (${updated.email}) to Administrator!`,
      user: {
        id: updated.id,
        fullName: updated.fullName,
        email: updated.email,
        role: updated.role,
        createdAt: updated.createdAt.toISOString(),
        reservationsCount: targetUser._count.reservations,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to promote user.',
    };
  }
}

/**
 * Demote an Administrator back to Employee.
 * Protects against self-demotion to avoid accidental administrative lockout.
 */
export async function demoteAdminToEmployeeAction(rawEmail: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  user?: UserSummary;
}> {
  try {
    const session = await requireAdmin();

    const parsed = emailSchema.safeParse(rawEmail);
    if (!parsed.success) {
      return {
        success: false,
        error: 'Please enter a valid email address.',
      };
    }

    const email = parsed.data.toLowerCase();

    const targetUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      include: {
        _count: {
          select: { reservations: true },
        },
      },
    });

    if (!targetUser) {
      return {
        success: false,
        error: `User "${email}" not found.`,
      };
    }

    // Safety Hard-Stop: Never allow self-demotion
    if (targetUser.id === session.id) {
      return {
        success: false,
        error: 'You cannot revoke your own Administrator privileges for safety reasons.',
      };
    }

    if (targetUser.role !== UserRole.ADMIN) {
      return {
        success: false,
        error: `User "${targetUser.fullName}" is not an Administrator.`,
      };
    }

    const updated = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        role: UserRole.EMPLOYEE,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    logSecurityAudit({
      event: 'USER_ROLE_DEMOTED',
      actorId: session.id,
      actorEmail: session.email,
      actorRole: session.role,
      targetId: updated.id,
      targetType: 'User',
      details: {
        demotedUserEmail: updated.email,
        demotedUserName: updated.fullName,
        previousRole: UserRole.ADMIN,
        newRole: UserRole.EMPLOYEE,
      },
      severity: 'WARN',
    });

    revalidatePath('/admin');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: `Administrator access revoked for "${updated.fullName}". Role reverted to Employee.`,
      user: {
        id: updated.id,
        fullName: updated.fullName,
        email: updated.email,
        role: updated.role,
        createdAt: updated.createdAt.toISOString(),
        reservationsCount: targetUser._count.reservations,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update user role.',
    };
  }
}
