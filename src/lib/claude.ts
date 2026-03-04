import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDb } from '@/lib/db';

export async function getGemini() {
  let apiKey = process.env.GEMINI_API_KEY || '';

  try {
    const db = getDb();
    const rows = await db`SELECT value FROM settings WHERE key = 'api_key'`;
    if (rows.length > 0 && typeof rows[0].value === 'string') {
      apiKey = rows[0].value;
    }
  } catch (e) {
    // Ignore DB errors
  }

  // User explicitly asked to use this key in chat
  if (!apiKey) {
    apiKey = 'AIzaSyCxu2uwfFmLQpcHamfx6p8302l4mK6M4nQ';
  }

  return new GoogleGenerativeAI(apiKey);
}

export const MODELS = {
  smart: 'gemini-2.5-flash',       // scoring, cover letters
  fast: 'gemini-2.5-flash', // company research, resume tailor
} as const;
