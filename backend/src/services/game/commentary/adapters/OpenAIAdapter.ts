import { OpenAI } from 'openai';
import { config, getSecret } from '../../../../config/config';
import { db } from '../../../../config/database';
import { performance } from 'perf_hooks';
import { AIServiceAdapter, AICompletionOptions } from './AIServiceAdapter';
import { logger } from '../../../../core/logging';

/**
 * OpenAI implementation of the AIServiceAdapter
 */
export class OpenAIAdapter implements AIServiceAdapter {
  private openai: OpenAI;

  /**
   * Creates a new instance of the OpenAIAdapter
   */
  constructor() {
    // Initialize OpenAI with API key from config
    // The API key will be validated at startup by the config validation
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
    
    logger.debug('OpenAI adapter initialized', {
      model: config.openai.model
    });
  }

  /**
   * Generates text completion using OpenAI's API
   * @param prompt The prompt to send to OpenAI
   * @param options Options for the completion
   * @returns The generated text
   * @throws Error if the OpenAI model is not configured
   */
  public async generateCompletion(
    prompt: string,
    options: AICompletionOptions = {}
  ): Promise<string> {
    const {
      gameId = "-1",
      announcerStyle = 'poetic',
      retryCount = 0,
      maxTokens = config.openai.maxTokens,
      temperature = config.openai.temperature
    } = options;

    // Check if the model is configured
    if (!config.openai.model) {
      logger.error('OpenAI model is not configured');
      throw new Error('OpenAI model is not configured');
    }

    // Track retry attempts
    const startTime = performance.now();
    let response;

    try {
      // Use chat completions API for gpt-4o
      if (config.openai.model.startsWith('gpt-4') || config.openai.model.startsWith('gpt-3.5-turbo')) {
        response = await this.openai.chat.completions.create({
          model: config.openai.model,
          messages: [
            {
              role: 'system',
              content: this.getSystemMessageForAnnouncer(announcerStyle)
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature: temperature,
        });

        const latencyMs = Math.round(performance.now() - startTime);
        
        // Save completion to database
        await this.saveCompletionToDb(
          prompt,
          response,
          gameId,
          latencyMs,
          retryCount
        );

        return response.choices[0].message.content || '';
      } else {
        // Fallback to completions API for older models
        response = await this.openai.completions.create({
          model: config.openai.model,
          prompt,
          max_tokens: maxTokens,
          temperature: temperature,
        });

        const latencyMs = Math.round(performance.now() - startTime);
        
        // Save completion to database
        await this.saveCompletionToDb(
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
  
  /**
   * Gets the name of the AI provider
   * @returns The provider name
   */
  public getProviderName(): string {
    return 'openai';
  }

  /**
   * Helper function to get the system message for an announcer
   */
  private getSystemMessageForAnnouncer(announcerStyle: 'classic' | 'modern' | 'enthusiastic' | 'poetic' = 'poetic'): string {
    const announcers = {
      'classic': 'Bob Costas',
      'modern': 'Joe Buck',
      'enthusiastic': 'Harry Caray',
      'poetic': 'Vin Scully'
    };
    
    const announcer = announcers[announcerStyle];
    return `You are a baseball announcer describing plays in the style of ${announcer}.`;
  }

  /**
   * Save OpenAI completion data to the database
   */
  private async saveCompletionToDb(
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
}