import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;

        if (!file || !userId) {
            return NextResponse.json({ error: 'File and userId are required' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure public/uploads exists
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        // Save file locally
        const filename = file.name.replace(/\s+/g, '_'); // Sanitize filename
        const filepath = join(uploadDir, filename);
        await writeFile(filepath, buffer);

        // Create Firestore record
        const trackRef = await db.collection('tracks').add({
            filename: file.name,
            uploadedBy: userId,
            status: 'complete', // Mark as complete immediately
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            storagePath: `public/uploads/${filename}`, // Local path for simulation
            downloadURL: `/uploads/${filename}`,
            size: file.size,
            type: file.type,
            // Mock analysis data
            bpm: Math.floor(Math.random() * (130 - 80) + 80),
            key: ['Cm', 'Gm', 'Dm', 'Am', 'Em', 'Bm', 'F#m', 'C#m'][Math.floor(Math.random() * 8)],
            energy: Math.random() * (1 - 0.4) + 0.4,
            duration: 180 + Math.floor(Math.random() * 120), // 3-5 minutes
            artist: 'Unknown Artist',
            title: file.name.replace(/\.[^/.]+$/, "")
        });

        return NextResponse.json({
            success: true,
            trackId: trackRef.id,
            filename: filename
        });

    } catch (error: any) {
        console.error('Upload simulation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
