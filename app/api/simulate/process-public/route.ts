import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        // Read files from public/uploads
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        const files = await readdir(uploadDir);

        // Return the list of files - the client will create the Firestore records
        return NextResponse.json({
            success: true,
            files: files.filter(f => f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.m4a') || f.endsWith('.flac'))
        });

    } catch (error: any) {
        console.error('Scan public files error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
