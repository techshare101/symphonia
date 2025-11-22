import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
        }

        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

        if (!fs.existsSync(uploadsDir)) {
            return NextResponse.json({ error: 'Uploads directory not found' }, { status: 404 });
        }

        const files = fs.readdirSync(uploadsDir).filter(file =>
            file.endsWith('.wav') || file.endsWith('.mp3') || file.endsWith('.m4a')
        );

        const results = [];

        for (const filename of files) {
            // Check if track already exists for this user
            const tracksRef = db.collection('tracks');
            const snapshot = await tracksRef
                .where('uploadedBy', '==', userId)
                .where('filename', '==', filename)
                .get();

            if (!snapshot.empty) {
                results.push({ filename, status: 'exists' });
                continue;
            }

            // Create new track record
            const docRef = await tracksRef.add({
                filename,
                uploadedBy: userId,
                status: 'complete',
                createdAt: new Date(),
                analyzedAt: new Date(),
                bpm: Math.floor(Math.random() * (130 - 80 + 1) + 80), // Random BPM 80-130
                key: ['Am', 'C', 'G', 'Em', 'F'][Math.floor(Math.random() * 5)], // Random key
                energy: Number((Math.random() * 0.5 + 0.5).toFixed(2)), // Random energy 0.5-1.0
                duration: Math.floor(Math.random() * (300 - 180 + 1) + 180), // Random duration 3-5 mins
                storagePath: `public/uploads/${filename}`, // Mock path
                isSimulated: true
            });

            results.push({ filename, status: 'created', id: docRef.id });
        }

        return NextResponse.json({
            success: true,
            scanned: files.length,
            results
        });

    } catch (error: any) {
        console.error('Scan error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
