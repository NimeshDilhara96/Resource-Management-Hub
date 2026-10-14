import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/me
 * Single backend source of truth for client queries.
 * Validates the caller's HttpOnly session cookie against the database.
 * Never trusts client-side storage for permissions or role checks.
 */
export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json(
      {
        authenticated: false,
        error: 'Unauthorized — no active or valid session found.',
      },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: session.id,
        fullName: session.fullName,
        email: session.email,
        role: session.role,
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
