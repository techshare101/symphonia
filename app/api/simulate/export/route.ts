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

                // Dual-Mode Export Logic:
                // 1. Priority: Firebase Storage URL (Universal access) - Standardized field 'storageUrl'
                // 2. Fallback: downloadURL (Backward compatibility)
                // 3. Fallback: Local Path (if available and no cloud URL)
                // 4. Last Resort: Simulated Localhost URL

                let fileUrl = track.storageUrl || track.downloadURL;

                if (!fileUrl && track.localPath) {
                    // If no cloud URL, use local path
                    fileUrl = track.localPath;
                }

                // Ensure absolute URL for relative paths
                if (fileUrl && fileUrl.startsWith('/')) {
                    const host = request.headers.get('host') || 'localhost:3000';
                    const protocol = host.includes('localhost') ? 'http' : 'https';
                    fileUrl = `${protocol}://${host}${fileUrl}`;
                }

                if (!fileUrl) {
                    // Fallback for simulation/legacy
                    const host = request.headers.get('host') || 'localhost:3000';
                    const protocol = host.includes('localhost') ? 'http' : 'https';
                    fileUrl = `${protocol}://${host}/uploads/${encodeURIComponent(track.title)}.mp3`;
                }

                content += `${fileUrl}\n`;
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
