import { OpenAI } from 'openai';
import { config } from '../config/config';
import { db } from '../config/database';
import { performance } from 'perf_hooks';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Save OpenAI completion data to the database
 */
async function saveCompletionToDb(
  prompt: string,
  response: any,
  gameId: string,
  latencyMs?: number,
  retryCount: number = 0
) {
  try {
    // Determine if this is a chat completion or regular completion
    const isChatCompletion = response.choices?.[0]?.message !== undefined;
    
    await db('openai_completions_log').insert({
      prompt,
      model: response.model,
      temperature: config.openai.temperature,
      max_tokens: config.openai.maxTokens,
      
      completion_id: response.id,
      content: isChatCompletion ? response.choices[0].message.content : response.choices[0].text,
      finish_reason: response.choices[0].finish_reason,
      
      prompt_tokens: response.usage?.prompt_tokens,
      completion_tokens: response.usage?.completion_tokens,
      total_tokens: response.usage?.total_tokens,
      
      game_id: gameId,

      
      latency_ms: latencyMs,
      retry_count: retryCount,
      
      openai_created_at: response.created
    });
  } catch (error) {
    console.error('Error saving completion to database:', error);
    // Don't throw here - we don't want to fail the main operation if DB save fails
  }
}

/**
 * Generate a completion using OpenAI's API
 * @param prompt The prompt to send to OpenAI
 * @param gameId The ID of the game
 * @returns The generated text
 * @throws Error if the OpenAI model is not configured
 */
export async function generateCompletion(
  prompt: string, 
  gameId: string = "-1"
): Promise<string> {
  // Check if the model is configured
  if (!config.openai.model) {
    throw new Error('OpenAI model is not configured');
  }

  let retryCount = 0;
  const startTime = performance.now();
  let response;

  try {
    // Use chat completions API for gpt-4o
    if (config.openai.model.startsWith('gpt-4') || config.openai.model.startsWith('gpt-3.5-turbo')) {
      response = await openai.chat.completions.create({
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
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature,
      });

      const latencyMs = Math.round(performance.now() - startTime);
      
      // Save completion to database
      await saveCompletionToDb(
        prompt,
        response,
        gameId,
        latencyMs,
        retryCount
      );

      return response.choices[0].message.content || '';
    } else {
      // Fallback to completions API for older models
      response = await openai.completions.create({
        model: config.openai.model,
        prompt,
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature,
      });

      const latencyMs = Math.round(performance.now() - startTime);
      
      // Save completion to database
      await saveCompletionToDb(
        prompt,
        response,
        gameId,
        latencyMs,
        retryCount
      );

      return response.choices[0].text || '';
    }
  } catch (error) {
    console.error('Error generating completion:', error);
    throw new Error('Failed to generate completion');
  }
}
