'use server';

import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { hashPassword, verifyPassword } from '@/lib/auth-crypto';
import { setServerSession, clearServerSession } from '@/lib/session';
import {
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  getClientIp,
} from '@/lib/rate-limiter';

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

// Security Policies:
// Login Rate Limit: Max 5 failed attempts per 15-minute window
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

// Signup Rate Limit: Max 5 accounts created per IP per hour
const SIGNUP_MAX_ATTEMPTS = 5;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;

/**
 * Log in with email and password
 * Rate-limited to defend against credential-stuffing and brute-force attacks.
 * Uses constant-time password verification and sets HttpOnly, Secure, SameSite cookies.
 */
export async function loginAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = (formData.get('password') as string)?.trim();

  if (!email || !password) {
    return {
      success: false,
      error: 'Please enter both your email address and password.',
    };
  }

  // 1. Rate-Limit Check to stop brute-force attacks
  const clientIp = await getClientIp();
  const rateLimitKey = `login:${email}:${clientIp}`;
  const rateStatus = checkRateLimit(rateLimitKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);

  if (!rateStatus.allowed) {
    const minutesLeft = Math.ceil(rateStatus.retryAfterSeconds / 60);
    return {
      success: false,
      error: `Too many failed attempts. To prevent brute-force attacks, your account is temporarily locked. Please try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`,
    };
  }

  try {
    // 2. Fetch user from database (Single Source of Truth)
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      // Record failed attempt against rate limiter
      recordFailedAttempt(rateLimitKey, LOGIN_WINDOW_MS);
      // Generic error message to prevent user enumeration attacks
      return {
        success: false,
        error: 'Invalid email address or password.',
      };
    }

    // 3. Constant-time password verification
    const isPasswordValid = verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      recordFailedAttempt(rateLimitKey, LOGIN_WINDOW_MS);
      return {
        success: false,
        error: 'Invalid email address or password.',
      };
    }

    // 4. Successful login: Clear failed attempt record
    resetRateLimit(rateLimitKey);

    // 5. Establish session via HttpOnly, Secure, SameSite=Lax cookie
    await setServerSession(user.id);

    // 6. Role-based redirection using verified database state
    if (user.role === UserRole.ADMIN) {
      redirect('/admin');
    } else {
      redirect('/dashboard');
    }
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT') {
      throw err;
    }
    return {
      success: false,
      error: err?.message || 'Authentication error. Please try again.',
    };
  }
}

/**
 * Register / Create a new user account
 * Rate-limited per IP to prevent automated bot account creation.
 * Hashes passwords with memory-hard scrypt. Never stores or logs plaintext passwords.
 */
export async function registerAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const fullName = (formData.get('fullName') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = (formData.get('password') as string)?.trim();

  // 1. Rate-Limit Check for Signup
  const clientIp = await getClientIp();
  const signupRateKey = `signup:${clientIp}`;
  const signupRate = checkRateLimit(signupRateKey, SIGNUP_MAX_ATTEMPTS, SIGNUP_WINDOW_MS);

  if (!signupRate.allowed) {
    const minutesLeft = Math.ceil(signupRate.retryAfterSeconds / 60);
    return {
      success: false,
      error: `Too many signups from this network. Please try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`,
    };
  }

  // 2. Input Validation
  if (!fullName || fullName.length < 2) {
    return { success: false, error: 'Please enter your full name (at least 2 characters).' };
  }

  if (!email || !email.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long for security.' };
  }

  try {
    // 3. Check for existing email in database
    const existing = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      return {
        success: false,
        error: 'An account with this email already exists. Please log in instead.',
      };
    }

    // 4. Memory-hard password hashing (never store plaintext)
    const passwordHash = hashPassword(password);

    // 5. Create new user with default EMPLOYEE role (admin elevation from signup prevented)
    const newUser = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        role: UserRole.EMPLOYEE,
      },
    });

    // Record signup attempt against rate limiter
    recordFailedAttempt(signupRateKey, SIGNUP_WINDOW_MS);

    // 6. Establish session via HttpOnly, Secure, SameSite cookie
    await setServerSession(newUser.id);

    redirect('/dashboard');
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT') {
      throw err;
    }
    return {
      success: false,
      error: err?.message || 'Failed to create account. Please try again.',
    };
  }
}

/**
 * Log out and destroy session token
 * Invalidates the HttpOnly cookie immediately on the client and server.
 */
export async function logout() {
  await clearServerSession();
  redirect('/login');
}