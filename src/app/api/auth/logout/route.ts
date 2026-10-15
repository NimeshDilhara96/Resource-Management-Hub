import { NextResponse } from 'next/server';
import { clearServerSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  await clearServerSession();
  const url = new URL('/login', request.url);
  return NextResponse.redirect(url, { status: 303 });
}

export async function GET(request: Request) {
  await clearServerSession();
  const url = new URL('/login', request.url);
  return NextResponse.redirect(url, { status: 303 });
}
