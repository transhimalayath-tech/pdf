import { GoogleGenAI } from "@google/genai";
import { AiAction } from '../types';

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCompletion = async (
  prompt: string, 
  context?: string,
  systemInstruction: string = "You are a helpful AI writing assistant."
): Promise<string> => {
  const ai = getAi();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: context 
        ? `Context:\n${context}\n\nRequest:\n${prompt}`
        : prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`;
  }
};

export const performActionOnText = async (text: string, action: AiAction): Promise<string> => {
  let prompt = "";
  switch (action) {
    case AiAction.SUMMARIZE:
      prompt = "Summarize the following text concisely, capturing the key points.";
      break;
    case AiAction.FIX_GRAMMAR:
      prompt = "Proofread the following text for grammar, spelling, and punctuation errors. Output only the corrected text.";
      break;
    case AiAction.PROFESSIONAL:
      prompt = "Rewrite the following text to sound more professional, formal, and authoritative. Output only the rewritten text.";
      break;
    case AiAction.SIMPLIFY:
      prompt = "Simplify the following text to make it easier to understand for a general audience. Output only the simplified text.";
      break;
    case AiAction.EXPAND:
      prompt = "Expand on the ideas in the following text, adding relevant details and improving flow. Output only the expanded text.";
      break;
    case AiAction.TRANSLATE_ES:
      prompt = "Translate the following text into Spanish.";
      break;
    case AiAction.TRANSLATE_FR:
      prompt = "Translate the following text into French.";
      break;
    default:
      prompt = "Improve the following text.";
  }

  return generateCompletion(prompt, text);
};

export const chatWithDocument = async (
  message: string, 
  documentText: string,
  history: { role: string; parts: { text: string }[] }[]
): Promise<string> => {
  const ai = getAi();
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `You are an expert document analyst. You have access to the content of a document provided below. Answer the user's questions based strictly on this document. If the answer is not in the document, say so.
      
      DOCUMENT CONTENT:
      ${documentText.substring(0, 30000)} ... [Truncated if too long]
      `
    },
    history: history as any,
  });

  const result = await chat.sendMessage({ message });
  return result.text || "I couldn't generate a response.";
};
