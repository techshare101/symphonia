'use client';

import { AuthProvider } from '@/providers/AuthProvider';

export default function DJModeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthProvider>
            {children}
        </AuthProvider>
    );
}
