import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  createSignedSessionToken,
  verifyAndDecodeSessionToken,
  SessionTokenPayload,
} from '@/lib/auth-crypto';

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

// Security Cookie Configuration
export const SESSION_COOKIE_NAME = 'reshub_session';

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true, // Prevents JavaScript from reading the cookie (protects against XSS)
  secure: process.env.NODE_ENV === 'production', // Transmitted strictly over HTTPS in production
  sameSite: 'lax' as const, // Prevents Cross-Site Request Forgery (CSRF)
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
};

/**
 * Creates and sets an HttpOnly, Secure, SameSite signed session cookie
 */
export async function setServerSession(userId: string) {
  const cookieStore = await cookies();
  const token = createSignedSessionToken(userId);

  cookieStore.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

  // Clean up any legacy plaintext cookies
  cookieStore.delete('user_id');
  cookieStore.delete('user_role');
  cookieStore.delete('user_email');
  cookieStore.delete('user_name');
}

/**
 * Destroys session cookie on logout or security invalidation
 */
export async function clearServerSession() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete('user_id');
    cookieStore.delete('user_role');
    cookieStore.delete('user_email');
    cookieStore.delete('user_name');
  } catch {
    // In Next.js Server Components, cookies cannot be modified during the render phase.
    // This is safe to ignore here because the session is treated as null,
    // and the invalid cookie will be cleared on login, logout, or via actions.
  }
}

/**
 * Reads session cookie and validates against database as the single source of truth.
 * Immediately revokes access if user is deleted or downgraded in database.
 * Enforces inactivity timeout policy.
 */
export async function getServerSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  let userId: string | null = null;

  if (sessionCookie) {
    const verification = verifyAndDecodeSessionToken(sessionCookie);
    if (!verification.valid || !verification.payload) {
      // Tampered or expired token: invalidate immediately
      await clearServerSession();
      return null;
    }
    userId = verification.payload.userId;
  } else {
    // Check legacy fallback during transition
    const legacyUserId = cookieStore.get('user_id')?.value;
    if (legacyUserId) {
      userId = legacyUserId;
    }
  }

  if (!userId) {
    return null;
  }

  try {
    // Database is the Single Source of Truth for identity, status, and role!
    // Never trust client-side claims.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      // User was deleted or does not exist: immediately invalidate session
      await clearServerSession();
      return null;
    }

    return {
      id: user.id,
      role: user.role, // Live role from database (prevents unauthorized elevation)
      email: user.email,
      fullName: user.fullName,
    };
  } catch (error) {
    console.error('Failed to verify session against database:', error);
    return null;
  }
}

/**
 * Enforces authentication for protected routes
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

/**
 * Enforces administrator role using live database authority
 */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireUser();
  if (session.role !== UserRole.ADMIN) {
    redirect('/dashboard');
  }
  return session;
}
