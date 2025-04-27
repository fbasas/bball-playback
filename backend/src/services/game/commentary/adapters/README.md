# AI Service Adapters

This directory contains the implementation of the Adapter Pattern for AI services used in the commentary system.

## Overview

The adapter pattern is used to abstract the AI service provider implementation from the CommentaryService. This makes it easier to:

1. Switch between different AI providers
2. Implement fallback mechanisms
3. Mock AI services for testing
4. Add new AI providers without changing the CommentaryService

## Components

### AIServiceAdapter

The `AIServiceAdapter` interface defines the contract that all AI service adapters must implement:

```typescript
export interface AIServiceAdapter {
  generateCompletion(prompt: string, options?: AICompletionOptions): Promise<string>;
}
```

### OpenAIAdapter

The `OpenAIAdapter` class implements the `AIServiceAdapter` interface for OpenAI's API:

```typescript
export class OpenAIAdapter implements AIServiceAdapter {
  // Implementation for OpenAI
}
```

### AIAdapterFactory

The `AIAdapterFactory` class provides a factory method for creating AI service adapters:

```typescript
export class AIAdapterFactory {
  public getAdapter(name?: string): AIServiceAdapter;
  public setDefaultAdapter(name: string): void;
  public registerAdapter(name: string, adapter: AIServiceAdapter): void;
}
```

## Usage

### Getting an Adapter

```typescript
import { getAIAdapter } from './adapters';

// Get the default adapter
const adapter = getAIAdapter();

// Get a specific adapter
const openaiAdapter = getAIAdapter('openai');
```

### Using an Adapter

```typescript
const completion = await adapter.generateCompletion(prompt, {
  gameId: 'game-123',
  announcerStyle: 'classic'
});
```

### Registering a New Adapter

```typescript
import { AIAdapterFactory } from './adapters';

// Create a new adapter
class MyCustomAdapter implements AIServiceAdapter {
  // Implementation
}

// Register the adapter
AIAdapterFactory.getInstance().registerAdapter('custom', new MyCustomAdapter());

// Set as default (optional)
AIAdapterFactory.getInstance().setDefaultAdapter('custom');
```

## Adding a New AI Provider

To add a new AI provider:

1. Create a new class that implements the `AIServiceAdapter` interface
2. Register the adapter with the `AIAdapterFactory`
3. Use the adapter in the CommentaryService or other services

Example:

```typescript
// 1. Create the adapter
class AzureOpenAIAdapter implements AIServiceAdapter {
  public async generateCompletion(prompt: string, options?: AICompletionOptions): Promise<string> {
    // Implementation for Azure OpenAI
  }
}

// 2. Register the adapter
AIAdapterFactory.getInstance().registerAdapter('azure', new AzureOpenAIAdapter());

// 3. Use the adapter
const commentaryService = new CommentaryService({
  aiAdapter: getAIAdapter('azure')
});