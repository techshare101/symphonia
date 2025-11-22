import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { tracks, type } = await request.json();

        if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
            return NextResponse.json({ error: 'No tracks provided' }, { status: 400 });
        }

        if (type === 'm3u') {
            let content = '#EXTM3U\n';
            tracks.forEach((track: any) => {
                content += `#EXTINF:${track.duration || 0},${track.artist || 'Unknown'} - ${track.title}\n`;
                // Use absolute URL for local simulation so external players can find it
                // URL encode the filename to handle spaces and special characters
                // Note: In simulation, we assume the file is in public/uploads and served via Next.js public folder
                // Also assuming port 3000 for default Next.js dev server
                content += `http://localhost:3000/uploads/${encodeURIComponent(track.title)}\n`;
            });

            return new NextResponse(content, {
                headers: {
                    'Content-Type': 'audio/x-mpegurl',
                    'Content-Disposition': 'attachment; filename="setlist.m3u"',
                },
            });
        } else if (type === 'srt') {
            let content = '';
            let counter = 1;

            tracks.forEach((track: any, index: number) => {
                // Create a dummy subtitle entry for each track
                const startTime = new Date(index * 60 * 1000).toISOString().substr(11, 12).replace('.', ',');
                const endTime = new Date((index * 60 * 1000) + 5000).toISOString().substr(11, 12).replace('.', ',');

                content += `${counter}\n`;
                content += `${startTime} --> ${endTime}\n`;
                content += `Now playing: ${track.title} by ${track.artist || 'Unknown'}\n\n`;
                counter++;
            });

            return new NextResponse(content, {
                headers: {
                    'Content-Type': 'application/x-subrip',
                    'Content-Disposition': 'attachment; filename="setlist.srt"',
                },
            });
        }

        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });

    } catch (error: any) {
        console.error('Export error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
