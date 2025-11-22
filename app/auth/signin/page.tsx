'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import SignIn from '@/components/SignIn';

export default function SignInPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      // If there's a stored redirect path, use it
      const redirectPath = sessionStorage.getItem('redirectPath') || '/';
      sessionStorage.removeItem('redirectPath'); // Clear it
      router.push(redirectPath);
    }
  }, [user, router]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="text-3xl font-bold">Welcome to Symphonia</h2>
          <p className="mt-2 text-gray-400">
            Sign in to upload tracks, create setlists, and more
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <SignIn />
        </div>

        <div className="mt-8 space-y-4 text-sm text-gray-400">
          <p>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
          <p>
            Need help? Contact support@symphonia.ai
          </p>
        </div>
      </div>
    </div>
  );
}