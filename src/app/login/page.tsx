import { getServerSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { Building2 } from 'lucide-react';
import LoginForm from '@/components/LoginForm';

export const metadata = {
  title: 'Sign In — ResHub Resource Reservation System',
  description: 'Log in to manage and reserve meeting rooms, company fleet vehicles, and shared equipment.',
};

export default async function LoginPage() {
  const session = await getServerSession();

  // If already authenticated, redirect to the appropriate dashboard
  if (session) {
    redirect(session.role === 'ADMIN' ? '/admin' : '/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-slate-800 flex flex-col justify-between selection:bg-orange-200 selection:text-orange-900 font-sans p-4 sm:p-6">
      {/* Brand Header */}
      <header className="w-full max-w-md mx-auto pt-8 sm:pt-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#ff6b35] shadow-md shadow-orange-500/20 mb-3">
          <Building2 size={24} className="text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          ResHub
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
          Resource Reservation Management System
        </p>
      </header>

      {/* Main Form Area */}
      <main className="w-full my-auto py-6">
        <LoginForm />
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-xs text-slate-400">
        ResHub • Enterprise Shared Resource Management System
      </footer>
    </div>
  );
}
