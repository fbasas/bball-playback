import { OpenAI } from 'openai';
import { config } from '../config/config';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Generate a completion using OpenAI's API
 * @param prompt The prompt to send to OpenAI
 * @returns The generated text
 * @throws Error if the OpenAI model is not configured
 */
export async function generateCompletion(prompt: string): Promise<string> {
  // Check if the model is configured
  if (!config.openai.model) {
    throw new Error('OpenAI model is not configured');
  }

  try {
    // Use chat completions API for gpt-4o
    if (config.openai.model.startsWith('gpt-4') || config.openai.model.startsWith('gpt-3.5-turbo')) {
      const response = await openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are a baseball announcer describing plays in the style of Vin Scully.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return response.choices[0].message.content || '';
    } else {
      // Fallback to completions API for older models
      const response = await openai.completions.create({
        model: config.openai.model,
        prompt,
        max_tokens: 500,
        temperature: 0.7,
      });

      return response.choices[0].text || '';
    }
  } catch (error) {
    console.error('Error generating completion:', error);
    throw new Error('Failed to generate completion');
  }
}
