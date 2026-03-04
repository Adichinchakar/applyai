import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export const MODELS = {
  smart: 'claude-sonnet-4-5',       // scoring (tool_use), cover letters — quality + structured output
  fast:  'claude-3-haiku-20240307', // company research, resume tailor — speed + cost
} as const;
