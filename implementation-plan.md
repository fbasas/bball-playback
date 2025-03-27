# Implementation Plan: Add Play Description to Next Play Endpoint

## Overview

This document outlines the plan to modify the next play endpoint to return an extra field in its response with a one-line description of the next play. The implementation will use the 'event' field in the 'plays' database and pass that to the event translation service to generate the description.

## Required Changes

### 1. Update the PlayData Interface

First, we need to update the PlayData interface to include the 'event' field:

```typescript
// common/types/PlayData.ts
export interface PlayData {
  // Existing fields...
  gid: string;
  pn: number;
  // ...
  f9?: string;
  
  // Add the event field
  event?: string;  // Retrosheet event code
}
```

### 2. Update the SimplifiedBaseballState Interface

Next, we need to update the SimplifiedBaseballState interface to include a field for the play description:

```typescript
// common/types/SimplifiedBaseballState.ts
export interface SimplifiedBaseballState {
  // Existing fields...
  gameId: string;
  sessionId: string;
  game: {
    // ...
    log: string[];
    onFirst: string;
    onSecond: string;
    onThird: string;
  };
  // ...
  currentPlay: number;
  
  // Add the play description field
  playDescription?: string;  // One-line description of the play
}
```

### 3. Modify the getNextPlay Function

Finally, we need to modify the getNextPlay function in nextPlay.ts to:
- Fetch the 'event' field from the 'plays' table
- Check if the event field exists and throw an error if it doesn't
- Use the translateEvent function to generate a description
- Include the description in the response

```typescript
// backend/src/routes/game/nextPlay.ts

// Import the translateEvent function
import { translateEvent } from '../../services/eventTranslation';

// In the fetchPlayData function, ensure we're selecting the event field
const fetchPlayData = async (gameId: string, currentPlay: number): Promise<PlayDataResult> => {
    const currentPlayData = await db('plays')
        .where({ gid: gameId, pn: currentPlay })
        .first();
    
    // Existing validation...
    
    const nextPlayData = await db('plays')
        .where({ gid: gameId })
        .where('pn', '>', currentPlay)
        .orderBy('pn', 'asc')
        .first();
    
    // Existing validation...
    
    // Add validation for the event field
    if (!nextPlayData.event) {
        throw new Error('Event data not found for the specified play');
    }
    
    return { currentPlayData, nextPlayData };
};

// In the getNextPlay function, after processing the lineup state:
try {
    // Generate the play description
    const playDescription = translateEvent(nextPlayData.event);
    
    // Include the description in the response
    const simplifiedState: SimplifiedBaseballState = {
        // Existing fields...
        currentPlay: nextPlayData.pn,
        playDescription
    };
    
    res.json(simplifiedState);
} catch (error) {
    console.error('Error translating event:', error);
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(status).json({ error: message });
}
```

## Error Handling

The implementation includes the following error handling:

1. If the event field is missing (null or undefined), we'll throw an error with a message like "Event data not found for the specified play".
2. This error will be caught by the existing error handling in the endpoint, which will return an appropriate HTTP error response (e.g., 404 or 500).
3. We'll add try/catch blocks around the translation logic to handle any unexpected errors during translation.
4. If translation fails, we'll log the error and throw it to be handled by the endpoint's error handling.

## Testing

After implementing these changes, we should test the endpoint to ensure:
- The 'event' field is correctly fetched from the database
- The description is correctly generated using the translateEvent function
- The description is included in the response
- Appropriate error responses are returned when the event field is missing or invalid

## Sequence Diagram

```mermaid
sequenceDiagram
    participant Client
    participant NextPlayEndpoint
    participant Database
    participant EventTranslationService
    
    Client->>NextPlayEndpoint: GET /api/game/next/:gameId
    NextPlayEndpoint->>Database: Query plays table (include event field)
    Database-->>NextPlayEndpoint: Return play data with event field
    
    alt Event field is missing
        NextPlayEndpoint-->>Client: Return error response
    else Event field is present
        NextPlayEndpoint->>EventTranslationService: translateEvent(event)
        EventTranslationService-->>NextPlayEndpoint: Return play description
        NextPlayEndpoint->>Client: Return response with playDescription field
    end