function pad2(n: number){ return n.toString().padStart(2,"0"); }
function msToSrtTime(ms: number){
  const h = Math.floor(ms/3600000);
  const m = Math.floor((ms%3600000)/60000);
  const s = Math.floor((ms%60000)/1000);
  const msR = Math.floor(ms%1000);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${msR.toString().padStart(3,"0")}`;
}

export function formatSegmentsToSRT(triSegments: Array<{start:string,end:string,EN:string,FR:string,ES:string}>){
  return triSegments.map((seg, i) => {
    const idx = i+1;
    return [
      `${idx}`,
      `${seg.start} --> ${seg.end}`,
      `EN: ${seg.EN}`,
      `FR: ${seg.FR}`,
      `ES: ${seg.ES}`,
      ""
    ].join("\n");
  }).join("\n");
}

/** Convert numeric seconds to SRT hh:mm:ss,ms */
export function secondsToSrtStamp(startSec: number, endSec: number){
  const startMs = Math.round(startSec*1000);
  const endMs = Math.round(endSec*1000);
  return {
    start: msToSrtTime(startMs),
    end: msToSrtTime(endMs)
  };
}