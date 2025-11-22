import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure upload directory exists
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        // Save file
        const filename = file.name;
        const localPath = join(uploadDir, filename);
        await writeFile(localPath, buffer);

        console.log(`Saved local file: ${localPath}`);

        return NextResponse.json({
            success: true,
            localPath,
            publicUrl: `/uploads/${filename}`,
            filename
        });

    } catch (error: any) {
        console.error('Local upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Upload failed' },
            { status: 500 }
        );
    }
}
