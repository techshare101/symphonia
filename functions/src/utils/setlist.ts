export function toM3U(tracks: Array<{title:string, path:string, durationSec?:number}>) {
  const lines = ["#EXTM3U"];
  for (const t of tracks) {
    const dur = Math.round(t.durationSec ?? 0);
    lines.push(`#EXTINF:${dur},${t.title}`);
    lines.push(t.path);
  }
  return lines.join("\n");
}