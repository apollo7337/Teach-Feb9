
import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please ensure process.env.API_KEY is configured.");
  }
  return new GoogleGenAI({ apiKey });
};

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          { text: "Transcribe this audio bio accurately. Output ONLY the raw text. No labels or metadata." },
        ],
      },
    });
    
    return response.text?.trim() || "";
  } catch (error: any) {
    console.error("Transcription Error:", error);
    throw new Error(`Transcription failed: ${error.message || "Unknown error"}`);
  }
};

export const generateTeacherScript = async (bio: string, instruction: string = ""): Promise<string> => {
  try {
    const ai = getClient();
    const systemInstruction = `You are a world-class scriptwriter for visionary educators. 
Draft a high-impact intro script meant for a professional 16:9 landscape video intro.

STRICT SCRIPT STRUCTURE:
1. Introduction: Who they are and their background.
2. Expertise: What they teach.
3. Value Prop: What a student will learn (approach + outcomes).

CRITICAL OUTPUT RULES:
1. Output ONLY the conversational text meant to be read aloud. 
2. DO NOT include any labels like "Subject:", "Speaker:", "Estimated Time:", or "Intro:".
3. DO NOT include any stage directions or camera instructions.
4. No formatting other than standard punctuation and paragraph breaks.
5. Target length: 20-30 seconds (roughly 60-80 words).
6. Tone: Professional, warm, high-energy.`;

    const prompt = instruction 
      ? `Refinement request: "${instruction}". Original Bio Context: "${bio}"`
      : `Draft a visionary teacher intro script based on this bio: "${bio}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        temperature: 0.8,
        systemInstruction: systemInstruction,
      }
    });
    
    return response.text || '';
  } catch (error: any) {
    console.error("Generation Error:", error);
    throw new Error(`Generation failed: ${error.message || "Unknown error"}`);
  }
};
