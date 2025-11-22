import fetch from "node-fetch";
import * as functions from "firebase-functions";

const cfg = functions.config();
const OPENAI_API_KEY = (cfg?.symphonia?.openai_key || process.env.OPENAI_API_KEY) as string;
const WHISPER_URL = (cfg?.symphonia?.whisper_url || process.env.WHISPER_URL || "").toString();

/**
 * Get timestamped segments from audio URL.
 * If WHISPER_URL is set: call your own microservice (expects JSON {segments:[{start,end,text}]})
 * Else: call OpenAI Whisper endpoint with a remote file URL (server-side).
 */
export async function transcribeWithTimestamps(fileUrl: string) {
  if (WHISPER_URL) {
    const res = await fetch(WHISPER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_url: fileUrl, timestamps: true })
    });
    if (!res.ok) throw new Error(`Whisper svc error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.segments as Array<{ start: number, end: number, text: string }>;
  }

  // OpenAI route: assuming an endpoint that accepts URL (varies by setup).
  // We'll send the URL, ask for JSON with segments.
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: (() => {
      const form = new FormData();
      form.append("model", "whisper-1");
      form.append("response_format", "verbose_json");
      form.append("file_url", fileUrl as any); // Some proxies support this; otherwise fetch bytes in Functions and stream as file.
      return form;
    })() as any
  });

  if (!res.ok) throw new Error(`OpenAI Whisper error: ${res.status} ${await res.text()}`);
  const json = await res.json();
  // Expecting json.segments [{start,end,text}]
  return (json.segments || []).map((s: any) => ({
    start: Number(s.start),
    end: Number(s.end),
    text: String(s.text || "").trim()
  })) as Array<{ start: number, end: number, text: string }>;
}