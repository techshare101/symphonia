'use client';



import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { MusicalNoteIcon } from '@heroicons/react/24/outline';

export default function LoginPage() {
    const { user, signIn, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user && !loading) {
            router.push('/tracks');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    {/* @ts-ignore */}
                    <MusicalNoteIcon className="h-10 w-10 text-white" />
                    <h2 className="text-3xl font-bold text-white mb-2">Welcome to Symphonia</h2>
                    <p className="text-slate-400">Sign in to start creating your narrative journeys.</p>
                </div>
                <div className="mt-8 space-y-6">
                    <button
                        onClick={() => signIn()}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 border-slate-700 transition-all"
                    >
                        <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                                alt="Google"
                                className="h-5 w-5"
                            />
                        </span>
                        Sign in with Google
                    </button>
                </div>
            </div>
        </div>
    );
}
