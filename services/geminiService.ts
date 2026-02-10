import { GoogleGenAI } from "@google/genai";

/**
 * Creates a fresh instance of the GenAI client using Vite environment variables.
 */
const getClient = () => {
  // Use a type cast to bypass the TypeScript 'ImportMeta' error
  const env = (import.meta as any).env;
  const apiKey = env.VITE_GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("API Key not found. Please ensure VITE_GOOGLE_AI_API_KEY is configured in Vercel.");
  }

  return new GoogleGenAI({ apiKey });
};

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001', // Updated to supported Gemini 2.0 model
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          { text: "Transcribe this audio bio accurately. Only return the text of the transcription." },
        ],
      },
    });

    return response.text?.trim() || "";
  } catch (error: any) {
    console.error("Transcription Error:", error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
};

export const generateTeacherScript = async (bio: string, instruction: string = ""): Promise<string> => {
  try {
    const ai = getClient();
    const systemPrompt = `You are an expert visionary scriptwriter for elite educators. Transform biographies into a conversational, warm, and tactical 20-30 second video script. Approx 60-75 words.`;
    const prompt = instruction ? `Apply refinement: "${instruction}". Context: "${bio}"` : `Transform this bio: "${bio}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001', // Updated to supported Gemini 2.0 model
      contents: prompt,
      config: {
        temperature: 0.8,
        systemInstruction: systemPrompt,
      }
    });

    return response.text || '';
  } catch (error: any) {
    console.error("Script Generation Error:", error);
    throw new Error(`Generation failed: ${error.message}`);
  }
};
