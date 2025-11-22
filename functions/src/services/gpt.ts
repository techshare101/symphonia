import fetch from "node-fetch";
import * as functions from "firebase-functions";

const cfg = functions.config();
const OPENAI_API_KEY = (cfg?.symphonia?.openai_key || process.env.OPENAI_API_KEY) as string;

/**
 * Translate an array of lyric segments EN -> FR/ES in one shot.
 * Each segment: { start: string, end: string, text: string }
 */
export async function translateSegmentsENtoFRES(segments: Array<{start:string,end:string,text:string}>) {
  const prompt = [
    "You are a concert-grade subtitle translator. Translate each English segment into French and Spanish, preserving meaning and tone. Return JSON array of objects with {start,end,EN,FR,ES}.",
    "Input segments:",
    JSON.stringify(segments)
  ].join("\n\n");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-5.1", // keep configurable if you prefer
      input: prompt,
      max_output_tokens: 4000
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GPT translate error: ${res.status} ${text}`);
  }
  const data = await res.json();
  // Responses API returns text in data.output_text (or in output[]); normalize:
  const text = data.output_text ?? data.output?.[0]?.content?.[0]?.text ?? "";
  const jsonStart = text.indexOf("[");
  const jsonEnd = text.lastIndexOf("]");
  const payload = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  return payload as Array<{start:string,end:string,EN:string,FR:string,ES:string}>;
}

/**
 * Arrange a set of tracks into a narrative arc.
 * tracks: [{id,bpm,key,energyRms,durationSec,lyricThemes?:string[]}]
 * arcTemplate: e.g. "Heartbreak -> Reflection -> Rising Hope -> Climax -> Afterglow"
 */
export async function arrangeSetlistArc(tracks: any[], arcTemplate: string) {
  const prompt = [
    "You are an expert DJ/music director. Arrange tracks into an emotional narrative arc.",
    "Use musical properties (BPM, key compatibility, energy), and lyric themes to support the arc.",
    "Return strictly JSON: { order: [trackId...], rationale: string }",
    "Arc template:",
    arcTemplate,
    "Tracks:",
    JSON.stringify(tracks)
  ].join("\n\n");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-5.1",
      input: prompt,
      max_output_tokens: 2000
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GPT setlist error: ${res.status} ${text}`);
  }
  const data = await res.json();
  const text = data.output_text ?? data.output?.[0]?.content?.[0]?.text ?? "{}";
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as { order: string[], rationale: string };
}