'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // List of protected routes
  const protectedPaths = ['/tracks', '/monitor', '/stats'];

  // Check if current path is protected
  const isProtectedPath = protectedPaths.some(path => pathname?.startsWith(path));

  useEffect(() => {
    if (!loading && !user && isProtectedPath) {
      // Store the attempted URL to redirect back after login
      sessionStorage.setItem('redirectPath', pathname || '');
      router.push('/auth/signin');
    }
  }, [user, loading, isProtectedPath, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user && isProtectedPath) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}