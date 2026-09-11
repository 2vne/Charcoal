import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;

export const openai = apiKey && !apiKey.includes('your_openai')
  ? new OpenAI({ apiKey })
  : null;

export function isOpenAIConfigured(): boolean {
  return !!openai;
}
