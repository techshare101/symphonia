'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';

export default function SignIn() {
  const { user, signIn, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      await signIn();
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything until client-side hydration is complete
  if (!mounted) {
    return null;
  }

  return (
    user ? (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          {user.photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt={user.displayName || 'User'}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="text-sm font-medium" suppressHydrationWarning>
            {user.displayName || user.email}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          disabled={loading}
          className={`
            px-4 py-2 text-sm font-medium text-white
            bg-red-600 rounded-lg hover:bg-red-700
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
          `}
        >
          {loading ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    ) : (
      <button
        onClick={handleSignIn}
        disabled={loading}
        className={`
          flex items-center space-x-2 px-4 py-2
          text-sm font-medium text-white
          bg-blue-600 rounded-lg hover:bg-blue-700
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
        `}
      >
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12.545,12.151L12.545,12.151c0,1.054,0.855,1.909,1.909,1.909h3.536c2.159,0,3.909-1.75,3.909-3.909v-0.727c0-0.748-0.607-1.355-1.355-1.355h-5.818c-2.159,0-3.909,1.75-3.909,3.909v0.727C10.818,13.453,11.425,14.06,12.545,14.06z M12,2C6.477,2,2,6.477,2,12c0,5.523,4.477,10,10,10s10-4.477,10-10C22,6.477,17.523,2,12,2z M12,20c-4.418,0-8-3.582-8-8s3.582-8,8-8s8,3.582,8,8S16.418,20,12,20z" />
        </svg>
        <span>{loading ? 'Signing in...' : 'Sign in with Google'}</span>
      </button>
    )
  );
}
