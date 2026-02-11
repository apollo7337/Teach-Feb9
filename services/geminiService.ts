import { GoogleGenAI } from "@google/genai";

/**
 * Creates a fresh instance of the GenAI client using Vite environment variables.
 */
const getClient = () => {
  // Use a type cast to bypass the TypeScript 'ImportMeta' error
  const env = (import.meta as any).env;
  const apiKey = env.VITE_GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "API Key not found. Please ensure VITE_GOOGLE_AI_API_KEY is configured in Vercel."
    );
  }

  return new GoogleGenAI({ apiKey });
};

export const transcribeAudio = async (
  base64Data: string,
  mimeType: string
): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-001", // Updated to supported Gemini 2.0 model
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: "Transcribe this audio bio accurately. Only return the text of the transcription.",
          },
        ],
      },
    });

    return response.text?.trim() || "";
  } catch (error: any) {
    console.error("Transcription Error:", error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
};

export const generateTeacherScript = async (
  bio: string,
  instruction: string = ""
): Promise<string> => {
  try {
    const ai = getClient();

    // Updated system prompt: Craft Music teacher intro script rules + strict formatting
    const systemPrompt = `
You are Craft Music Intro Video Assistant. Your job is to write a 20–30 second spoken introduction video script for a music teacher profile.

Core requirements:
- Output ONLY the script text the teacher will say (dialogue). No stage directions, camera notes, background music, scene headings, bullets, or brackets.
- Keep it under 100 words (ideal: 60–85 words).
- Sound warm, human, confident, and welcoming.
- Reflect Craft Music values: artistry, care, clarity, creativity, professionalism.
- Avoid sales language, hype, or generic filler phrases (e.g., “passionate about music,” “unlock your potential,” “world-class,” “I’m excited to…” unless truly specific).
- Use simple, natural spoken phrasing. One short paragraph (2–5 sentences).

Content to include when available:
- Teacher name
- Instrument(s) taught
- Who they enjoy teaching (ages/levels/goals)
- A quick credibility detail (training/degree/years/performing/recording) if present
- Teaching vibe/philosophy + what students can expect (clear, supportive, structured, creative, confidence-building, etc.)
- Optional: one personal/unique detail (genre, language, interests) if provided

If the bio is missing key details, still produce the best possible script using what’s provided. Do not ask questions.

Return ONLY the final script text.`;

    const prompt = instruction?.trim()
      ? `
Refine the teacher intro script using this instruction:
"${instruction}"

Bio/context (use only if needed to stay accurate):
"${bio}"

Rules: Under 100 words (ideal 60–85), dialogue-only, no stage directions, no bullets, no brackets. Return ONLY the final refined script text.
`
      : `
Write a 20–30 second teacher introduction video script based on this bio:
"${bio}"

Rules: Under 100 words (ideal 60–85), dialogue-only, no stage directions, no bullets, no brackets. Return ONLY the script text.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      // Keep everything else the same; we embed the "system prompt" into the user content
      // to avoid changing request structure (no systemInstruction field used).
      contents: {
        parts: [
          { text: systemPrompt.trim() },
          { text: prompt.trim() },
        ],
      },
    });

    return response.text?.trim() || "";
  } catch (error: any) {
    console.error("Script Generation Error:", error);
    throw new Error(`Script generation failed: ${error.message}`);
  }
};
