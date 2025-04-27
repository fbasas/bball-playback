import { AIServiceAdapter } from './AIServiceAdapter';
import { OpenAIAdapter } from './OpenAIAdapter';

/**
 * Factory for creating AI service adapters
 */
export class AIAdapterFactory {
  private static instance: AIAdapterFactory;
  private adapters: Map<string, AIServiceAdapter>;
  private defaultAdapter: string = 'openai';

  /**
   * Creates a new instance of the AIAdapterFactory
   */
  private constructor() {
    this.adapters = new Map<string, AIServiceAdapter>();
    this.registerDefaultAdapters();
  }

  /**
   * Gets the singleton instance
   * @returns The singleton instance
   */
  public static getInstance(): AIAdapterFactory {
    if (!AIAdapterFactory.instance) {
      AIAdapterFactory.instance = new AIAdapterFactory();
    }
    return AIAdapterFactory.instance;
  }

  /**
   * Registers the default adapters
   */
  private registerDefaultAdapters(): void {
    this.adapters.set('openai', new OpenAIAdapter());
  }

  /**
   * Gets an adapter by name
   * @param name The name of the adapter
   * @returns The adapter
   */
  public getAdapter(name?: string): AIServiceAdapter {
    const adapterName = name || this.defaultAdapter;
    const adapter = this.adapters.get(adapterName);
    
    if (!adapter) {
      throw new Error(`AI adapter '${adapterName}' not found`);
    }
    
    return adapter;
  }

  /**
   * Sets the default adapter
   * @param name The name of the adapter
   */
  public setDefaultAdapter(name: string): void {
    if (!this.adapters.has(name)) {
      throw new Error(`Cannot set default adapter: '${name}' not found`);
    }
    this.defaultAdapter = name;
  }

  /**
   * Registers a new adapter
   * @param name The name of the adapter
   * @param adapter The adapter instance
   */
  public registerAdapter(name: string, adapter: AIServiceAdapter): void {
    this.adapters.set(name, adapter);
  }
}

/**
 * Convenience function to get an adapter
 * @param name The name of the adapter (optional)
 * @returns The adapter
 */
export function getAIAdapter(name?: string): AIServiceAdapter {
  return AIAdapterFactory.getInstance().getAdapter(name);
}