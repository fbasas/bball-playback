# Implementation Plan: Robust Event Translation System

## Overview

This document outlines a plan to refactor the event translation system to eliminate the need for special case translations. The current implementation in `translateEvent.ts` contains numerous special cases to handle specific event patterns, making the code difficult to maintain and extend. This plan proposes a more robust, pattern-based approach to event translation that can handle all Retrosheet event notations consistently.

## Current Issues

The current implementation has several limitations:

1. **Incomplete Parsing Logic**: The `parseEvent` function doesn't fully handle all the complexities of Retrosheet event notation.
2. **Inconsistent Field Location Handling**: Location codes are handled inconsistently, with special cases for specific patterns.
3. **Ambiguous Event Notation**: Some Retrosheet event notations encode multiple actions that require context-specific handling.
4. **Incomplete Modifier Processing**: Not all modifiers (depth, direction, trajectory) are properly processed.

## Proposed Solution

We'll implement a comprehensive event parsing and translation system with the following components:

1. **Enhanced Event Parser**: A more robust parser that breaks down Retrosheet events into their component parts.
2. **Structured Event Representation**: A detailed event structure that captures all aspects of a play.
3. **Modular Translation System**: Separate translation functions for different event components.
4. **Pattern-Based Translation**: A pattern-matching system that can handle complex event patterns.

## Implementation Steps

### 1. Define a Comprehensive Event Structure

Create a more detailed event structure that captures all aspects of a baseball play:

```typescript
interface DetailedBaseballEvent {
  // Primary event
  primaryEventType: string;  // S, D, T, HR, K, etc.
  
  // Fielders involved
  fielders: {
    position: number;
    role: 'primary' | 'assist' | 'error' | 'putout';
  }[];
  
  // Location information
  location: {
    zone: string;  // Infield, outfield, etc.
    direction: string;  // Left, center, right, etc.
    depth: string;  // Deep, medium, shallow, etc.
    trajectory: string;  // Ground ball, fly ball, line drive, etc.
  };
  
  // Base advancements
  baseRunning: {
    runner: string;  // Runner ID or position
    fromBase: string;  // 1, 2, 3, H
    toBase: string;  // 1, 2, 3, H
    isOut?: boolean;
    outNumber?: number;
    fielders?: number[];  // Fielders involved in the out
  }[];
  
  // Additional information
  rbi?: number;
  isOut: boolean;
  outCount: number;
  isDoublePlay: boolean;
  isTriplePlay: boolean;
  isFieldersChoice: boolean;
  isError: boolean;
  
  // Raw event data
  rawEvent: string;
}
```

### 2. Implement a Pattern-Based Event Parser

Create a robust parser that uses regular expressions and pattern matching to break down event strings:

```typescript
function parseDetailedEvent(eventString: string): DetailedBaseballEvent {
  // Initialize the event object
  const event: DetailedBaseballEvent = {
    primaryEventType: '',
    fielders: [],
    location: {
      zone: '',
      direction: '',
      depth: '',
      trajectory: ''
    },
    baseRunning: [],
    isOut: false,
    outCount: 0,
    isDoublePlay: false,
    isTriplePlay: false,
    isFieldersChoice: false,
    isError: false,
    rawEvent: eventString
  };
  
  // Split the event string into components
  const [mainEvent, ...advancementParts] = eventString.split('.');
  const [primaryEvent, ...modifiers] = mainEvent.split('/');
  
  // Parse the primary event
  parsePrimaryEvent(primaryEvent, event);
  
  // Parse modifiers
  parseModifiers(modifiers, event);
  
  // Parse base advancements
  parseBaseAdvancements(advancementParts, event);
  
  return event;
}
```

### 3. Implement Component Parsers

Create specialized parsers for each component of the event:

#### Primary Event Parser

```typescript
function parsePrimaryEvent(primaryEvent: string, event: DetailedBaseballEvent): void {
  // Handle hits (S, D, T, HR)
  if (/^S\d?/.test(primaryEvent)) {
    event.primaryEventType = 'S';
    parseHitLocation(primaryEvent.substring(1), event);
  } else if (/^D\d?/.test(primaryEvent)) {
    event.primaryEventType = 'D';
    parseHitLocation(primaryEvent.substring(1), event);
  } else if (/^T\d?/.test(primaryEvent)) {
    event.primaryEventType = 'T';
    parseHitLocation(primaryEvent.substring(1), event);
  } else if (/^HR\d?/.test(primaryEvent)) {
    event.primaryEventType = 'HR';
    parseHitLocation(primaryEvent.substring(2), event);
  }
  
  // Handle outs (K, G, F, L, P)
  else if (primaryEvent.startsWith('K')) {
    event.primaryEventType = 'K';
    event.isOut = true;
    event.outCount = 1;
  } else if (/^G\d+/.test(primaryEvent)) {
    event.primaryEventType = 'G';
    event.isOut = true;
    event.outCount = 1;
    parseFielders(primaryEvent.substring(1), event);
  } else if (/^F\d+/.test(primaryEvent)) {
    event.primaryEventType = 'F';
    event.isOut = true;
    event.outCount = 1;
    parseFielders(primaryEvent.substring(1), event);
  } else if (/^L\d+/.test(primaryEvent)) {
    event.primaryEventType = 'L';
    event.isOut = true;
    event.outCount = 1;
    parseFielders(primaryEvent.substring(1), event);
  } else if (/^P\d+/.test(primaryEvent)) {
    event.primaryEventType = 'P';
    event.isOut = true;
    event.outCount = 1;
    parseFielders(primaryEvent.substring(1), event);
  }
  
  // Handle walks and HBP
  else if (primaryEvent === 'W') {
    event.primaryEventType = 'W';
  } else if (primaryEvent === 'IW') {
    event.primaryEventType = 'IW';
  } else if (primaryEvent === 'HP') {
    event.primaryEventType = 'HP';
  }
  
  // Handle errors
  else if (/^E\d/.test(primaryEvent)) {
    event.primaryEventType = 'E';
    event.isError = true;
    const fielderPosition = parseInt(primaryEvent.substring(1), 10);
    event.fielders.push({
      position: fielderPosition,
      role: 'error'
    });
  }
  
  // Handle fielder's choice
  else if (primaryEvent.startsWith('FC')) {
    event.primaryEventType = 'FC';
    event.isFieldersChoice = true;
  }
  
  // Handle base running events
  else if (/^SB[23H]/.test(primaryEvent)) {
    event.primaryEventType = 'SB';
    const base = primaryEvent.substring(2);
    event.baseRunning.push({
      runner: '',  // Will be filled in from context
      fromBase: base === '2' ? '1' : base === '3' ? '2' : '3',
      toBase: base
    });
  } else if (/^CS[23H]/.test(primaryEvent)) {
    event.primaryEventType = 'CS';
    const base = primaryEvent.substring(2);
    event.baseRunning.push({
      runner: '',  // Will be filled in from context
      fromBase: base === '2' ? '1' : base === '3' ? '2' : '3',
      toBase: base,
      isOut: true
    });
  } else if (/^PO[123]/.test(primaryEvent)) {
    event.primaryEventType = 'PO';
    const base = primaryEvent.substring(2);
    event.baseRunning.push({
      runner: '',  // Will be filled in from context
      fromBase: base,
      toBase: base,
      isOut: true
    });
  }
  
  // Handle miscellaneous events
  else if (primaryEvent === 'WP') {
    event.primaryEventType = 'WP';
  } else if (primaryEvent === 'PB') {
    event.primaryEventType = 'PB';
  } else if (primaryEvent === 'BK') {
    event.primaryEventType = 'BK';
  } else if (primaryEvent === 'NP') {
    event.primaryEventType = 'NP';
  }
  
  // Handle fielder-to-fielder plays (e.g., 31, 643)
  else if (/^[1-9]+$/.test(primaryEvent)) {
    // Determine if it's a double play or triple play
    if (primaryEvent.length === 3) {
      event.isDoublePlay = true;
      event.outCount = 2;
    } else if (primaryEvent.length > 3) {
      event.isTriplePlay = true;
      event.outCount = 3;
    } else {
      event.outCount = 1;
    }
    
    event.isOut = true;
    
    // Default to groundout, will be refined by modifiers
    event.primaryEventType = 'G';
    
    // Parse the fielders
    for (let i = 0; i < primaryEvent.length; i++) {
      const fielderPosition = parseInt(primaryEvent[i], 10);
      event.fielders.push({
        position: fielderPosition,
        role: i === 0 ? 'primary' : i === primaryEvent.length - 1 ? 'putout' : 'assist'
      });
    }
  }
}
```

#### Modifier Parser

```typescript
function parseModifiers(modifiers: string[], event: DetailedBaseballEvent): void {
  for (const modifier of modifiers) {
    // Parse location modifiers
    if (modifier.startsWith('F')) {
      event.location.trajectory = 'fly ball';
      parseLocationCode(modifier.substring(1), event);
    } else if (modifier.startsWith('L')) {
      event.location.trajectory = 'line drive';
      parseLocationCode(modifier.substring(1), event);
    } else if (modifier.startsWith('G')) {
      event.location.trajectory = 'ground ball';
      parseLocationCode(modifier.substring(1), event);
    } else if (modifier.startsWith('P')) {
      event.location.trajectory = 'popup';
      parseLocationCode(modifier.substring(1), event);
    }
    
    // Parse depth modifiers
    if (modifier.endsWith('D')) {
      event.location.depth = 'deep';
    } else if (modifier.endsWith('S')) {
      event.location.depth = 'shallow';
    } else if (modifier.endsWith('M')) {
      event.location.depth = 'medium';
    }
    
    // Parse direction modifiers
    if (modifier.includes('L') && !modifier.startsWith('L')) {
      event.location.direction = 'left';
    } else if (modifier.includes('R') && !modifier.startsWith('R')) {
      event.location.direction = 'right';
    }
  }
}
```

#### Base Advancement Parser

```typescript
function parseBaseAdvancements(advancementParts: string[], event: DetailedBaseballEvent): void {
  for (const part of advancementParts) {
    const advances = part.split(';');
    
    for (const advance of advances) {
      const match = advance.match(/^([123])-([123H])(?:\(([1-9]+)\))?$/);
      if (match) {
        const fromBase = match[1];
        const toBase = match[2];
        const fielders = match[3] ? match[3].split('').map(f => parseInt(f, 10)) : undefined;
        
        event.baseRunning.push({
          runner: '',  // Will be filled in from context
          fromBase,
          toBase,
          isOut: fielders !== undefined,
          fielders
        });
      }
    }
  }
}
```

### 4. Implement Location and Fielder Parsers

Create specialized parsers for locations and fielders:

```typescript
function parseHitLocation(locationCode: string, event: DetailedBaseballEvent): void {
  if (locationCode) {
    const fielderPosition = parseInt(locationCode, 10);
    if (!isNaN(fielderPosition)) {
      event.fielders.push({
        position: fielderPosition,
        role: 'primary'
      });
      
      // Set location based on fielder position
      if (fielderPosition >= 1 && fielderPosition <= 6) {
        event.location.zone = 'infield';
      } else if (fielderPosition >= 7 && fielderPosition <= 9) {
        event.location.zone = 'outfield';
        
        if (fielderPosition === 7) {
          event.location.direction = 'left';
        } else if (fielderPosition === 8) {
          event.location.direction = 'center';
        } else if (fielderPosition === 9) {
          event.location.direction = 'right';
        }
      }
    }
  }
}

function parseFielders(fielderCode: string, event: DetailedBaseballEvent): void {
  for (let i = 0; i < fielderCode.length; i++) {
    const fielderPosition = parseInt(fielderCode[i], 10);
    if (!isNaN(fielderPosition)) {
      event.fielders.push({
        position: fielderPosition,
        role: i === 0 ? 'primary' : i === fielderCode.length - 1 ? 'putout' : 'assist'
      });
    }
  }
}

function parseLocationCode(locationCode: string, event: DetailedBaseballEvent): void {
  // Handle special cases like "78" (between left and center)
  if (locationCode === '78') {
    event.location.direction = 'left-center';
    event.location.zone = 'outfield';
    return;
  }
  
  // Handle special cases like "56" (between third and short)
  if (locationCode === '56') {
    event.location.direction = 'left side';
    event.location.zone = 'infield';
    return;
  }
  
  // Handle single position numbers
  const fielderPosition = parseInt(locationCode, 10);
  if (!isNaN(fielderPosition)) {
    if (fielderPosition >= 1 && fielderPosition <= 6) {
      event.location.zone = 'infield';
    } else if (fielderPosition >= 7 && fielderPosition <= 9) {
      event.location.zone = 'outfield';
      
      if (fielderPosition === 7) {
        event.location.direction = 'left';
      } else if (fielderPosition === 8) {
        event.location.direction = 'center';
      } else if (fielderPosition === 9) {
        event.location.direction = 'right';
      }
    }
  }
  
  // Handle direction codes
  if (locationCode.startsWith('L')) {
    event.location.direction = 'left';
  } else if (locationCode.startsWith('R')) {
    event.location.direction = 'right';
  } else if (locationCode.startsWith('C')) {
    event.location.direction = 'center';
  }
}
```

### 5. Implement the Translation System

Create a modular translation system that generates descriptions based on the parsed event:

```typescript
function translateDetailedEvent(event: DetailedBaseballEvent): string {
  let description = '';
  
  // Translate the primary event
  description += translatePrimaryEvent(event);
  
  // Add location information
  const locationDesc = translateLocation(event);
  if (locationDesc) {
    description += ` ${locationDesc}`;
  }
  
  // Add fielder information for outs and errors
  if (event.isOut || event.isError || event.isFieldersChoice) {
    const fielderDesc = translateFielders(event);
    if (fielderDesc) {
      description += ` ${fielderDesc}`;
    }
  }
  
  // Add RBI information
  if (event.rbi && event.rbi > 0) {
    description += `, ${event.rbi} RBI`;
  }
  
  return description;
}
```

### 6. Implement Component Translators

Create specialized translators for each component of the event:

```typescript
function translatePrimaryEvent(event: DetailedBaseballEvent): string {
  const eventTypeDescriptions: Record<string, string> = {
    'S': 'Single',
    'D': 'Double',
    'T': 'Triple',
    'HR': 'Home run',
    'K': 'Struck out',
    'G': 'Groundout',
    'F': 'Flyout',
    'L': 'Lineout',
    'P': 'Popup',
    'W': 'Walk',
    'IW': 'Intentional walk',
    'HP': 'Hit by pitch',
    'E': 'Error by',
    'FC': 'Reached on a fielder\'s choice',
    'SB': 'Stole',
    'CS': 'Caught stealing',
    'PO': 'Picked off',
    'POCS': 'Picked off and caught stealing',
    'WP': 'Wild pitch',
    'PB': 'Passed ball',
    'BK': 'Balk',
    'DGR': 'Ground rule double',
    'NP': 'No play'
  };
  
  // Handle double plays and triple plays
  if (event.isDoublePlay) {
    const fielderPositions = event.fielders.map(f => f.position.toString()).join('-');
    return `Grounded into a ${fielderPositions} double play`;
  }
  
  if (event.isTriplePlay) {
    const fielderPositions = event.fielders.map(f => f.position.toString()).join('-');
    return `Grounded into a ${fielderPositions} triple play`;
  }
  
  // Handle base running events
  if (event.primaryEventType === 'SB' && event.baseRunning.length > 0) {
    const base = event.baseRunning[0].toBase;
    const baseDesc = base === '2' ? 'second base' : base === '3' ? 'third base' : 'home';
    return `Stole ${baseDesc}`;
  }
  
  if (event.primaryEventType === 'CS' && event.baseRunning.length > 0) {
    const base = event.baseRunning[0].toBase;
    const baseDesc = base === '2' ? 'second base' : base === '3' ? 'third base' : 'home';
    return `Caught stealing ${baseDesc}`;
  }
  
  if (event.primaryEventType === 'PO' && event.baseRunning.length > 0) {
    const base = event.baseRunning[0].fromBase;
    const baseDesc = base === '1' ? 'first base' : base === '2' ? 'second base' : 'third base';
    return `Picked off ${baseDesc}`;
  }
  
  // Handle standard events
  return eventTypeDescriptions[event.primaryEventType] || 'Unknown play';
}

function translateLocation(event: DetailedBaseballEvent): string {
  let locationDesc = '';
  
  // Add trajectory information
  if (event.location.trajectory) {
    // Only add for certain event types
    if (['G', 'F', 'L', 'P'].includes(event.primaryEventType)) {
      locationDesc += event.location.trajectory;
    }
  }
  
  // Add zone information
  if (event.location.zone) {
    if (locationDesc) locationDesc += ' ';
    locationDesc += `to ${event.location.zone}`;
  }
  
  // Add direction information
  if (event.location.direction) {
    if (locationDesc) locationDesc += ' ';
    
    if (event.location.zone === 'outfield') {
      if (event.location.direction === 'left') {
        locationDesc += 'to left field';
      } else if (event.location.direction === 'center') {
        locationDesc += 'to center field';
      } else if (event.location.direction === 'right') {
        locationDesc += 'to right field';
      } else if (event.location.direction === 'left-center') {
        locationDesc += 'to left-center field';
      } else if (event.location.direction === 'right-center') {
        locationDesc += 'to right-center field';
      }
    } else if (event.location.zone === 'infield') {
      if (event.location.direction === 'left side') {
        locationDesc += 'to the left side of the infield';
      } else if (event.location.direction === 'right side') {
        locationDesc += 'to the right side of the infield';
      }
    }
  }
  
  // Add depth information
  if (event.location.depth) {
    if (locationDesc) locationDesc += ' ';
    locationDesc += `(${event.location.depth})`;
  }
  
  return locationDesc;
}

function translateFielders(event: DetailedBaseballEvent): string {
  const fieldPositionNames: Record<number, string> = {
    1: 'pitcher',
    2: 'catcher',
    3: 'first baseman',
    4: 'second baseman',
    5: 'third baseman',
    6: 'shortstop',
    7: 'left fielder',
    8: 'center fielder',
    9: 'right fielder',
    0: 'unknown fielder'
  };
  
  // For errors, return the fielder who made the error
  if (event.isError) {
    const errorFielder = event.fielders.find(f => f.role === 'error');
    if (errorFielder) {
      return fieldPositionNames[errorFielder.position] || 'fielder';
    }
  }
  
  // For outs, return the primary fielder
  if (event.isOut) {
    const primaryFielder = event.fielders.find(f => f.role === 'primary');
    if (primaryFielder) {
      return `to ${fieldPositionNames[primaryFielder.position] || 'fielder'}`;
    }
  }
  
  // For fielder's choice, return the fielders involved
  if (event.isFieldersChoice) {
    const fielders = event.fielders.map(f => fieldPositionNames[f.position] || 'fielder');
    if (fielders.length > 0) {
      return `to ${fielders.join(', ')}`;
    }
  }
  
  return '';
}
```

### 7. Update the Main Translation Function

Replace the current `translateEvent` function with a new implementation that uses the enhanced parsing and translation system:

```typescript
export function translateEvent(eventString: string): string {
  // Parse the event into a detailed structure
  const detailedEvent = parseDetailedEvent(eventString);
  
  // Translate the detailed event into a description
  return translateDetailedEvent(detailedEvent);
}
```

## Testing Strategy

To ensure the new implementation works correctly, we'll need a comprehensive testing strategy:

1. **Unit Tests for Component Parsers**: Test each parser function with various input patterns.
2. **Integration Tests for Full Events**: Test the complete parsing and translation pipeline with real Retrosheet events.
3. **Regression Tests for Special Cases**: Ensure all the current special cases are handled correctly by the new system.
4. **Edge Case Tests**: Test unusual or complex event notations to ensure robustness.

## Implementation Timeline

1. **Week 1**: Define the detailed event structure and implement the basic parsing framework.
2. **Week 2**: Implement the component parsers for primary events, modifiers, and base advancements.
3. **Week 3**: Implement the translation system and component translators.
4. **Week 4**: Write tests, fix bugs, and ensure all special cases are handled correctly.

## Conclusion

This implementation plan provides a comprehensive approach to refactoring the event translation system. By creating a more robust, pattern-based parsing and translation system, we can eliminate the need for special case translations and make the code more maintainable and extensible.

The key benefits of this approach include:

1. **Consistency**: All events are parsed and translated using the same logic.
2. **Maintainability**: The code is more modular and easier to understand.
3. **Extensibility**: New event types or patterns can be added without special cases.
4. **Robustness**: The system can handle complex event notations correctly.

By implementing this plan, we'll create a more reliable and maintainable event translation system that can handle all Retrosheet event notations without special cases.