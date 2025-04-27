/**
 * Interface for AI service adapters
 * This abstraction allows for easy switching between different AI providers
 */
export interface AIServiceAdapter {
  /**
   * Generates text completion based on a prompt
   * @param prompt The prompt to send to the AI service
   * @param options Additional options for the completion
   * @returns The generated text
   */
  generateCompletion(
    prompt: string,
    options?: AICompletionOptions
  ): Promise<string>;
  
  /**
   * Gets the name of the AI provider
   * @returns The provider name (e.g., 'openai', 'anthropic', etc.)
   */
  getProviderName(): string;
}

/**
 * Options for AI completions
 */
export interface AICompletionOptions {
  /**
   * The game ID for logging purposes
   */
  gameId?: string;
  
  /**
   * The announcer style to use
   */
  announcerStyle?: 'classic' | 'modern' | 'enthusiastic' | 'poetic';
  
  /**
   * The number of retry attempts
   */
  retryCount?: number;
  
  /**
   * Maximum number of tokens to generate
   */
  maxTokens?: number;
  
  /**
   * Temperature for controlling randomness (0-1)
   */
  temperature?: number;
}