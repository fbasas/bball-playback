# Event Translation System

This directory contains the implementation of a robust event translation system for Retrosheet event codes. The system is designed to parse and translate Retrosheet event codes into human-readable descriptions without relying on special cases.

## Overview

Retrosheet event codes are a compact notation used to describe baseball plays. For example, `S8` represents a single to center field, and `643` represents a ground ball to the shortstop who throws to the second baseman who then throws to the first baseman for a double play.

The event translation system consists of three main components:

1. **Event Parser**: Parses Retrosheet event codes into a structured representation
2. **Event Translator**: Translates the structured representation into human-readable descriptions
3. **Main Interface**: Provides a simple interface for translating event codes

## Files

- `detailedEventTypes.ts`: Defines the types and interfaces for the event translation system
- `detailedEventParser.ts`: Implements the parsing of Retrosheet event codes
- `detailedEventTranslator.ts`: Implements the translation of parsed events
- `translateEvent.ts`: Provides the main interface for translating event codes
- `translateEvent.test.ts`: Contains tests for the event translation system

## Usage

To translate a Retrosheet event code, use the `translateEvent` function:

```typescript
import { translateEvent } from './translateEvent';

const description = translateEvent('S8');
console.log(description); // "Single to center field"
```

For more advanced usage, you can use the `parseDetailedEvent` and `translateDetailedEvent` functions directly:

```typescript
import { parseDetailedEvent } from './detailedEventParser';
import { translateDetailedEvent } from './detailedEventTranslator';

const event = parseDetailedEvent('S8');
console.log(event);
// {
//   primaryEventType: 'S',
//   fielders: [{ position: 8, role: 'primary' }],
//   location: { zone: 'outfield', direction: 'center', depth: '', trajectory: '' },
//   baseRunning: [],
//   isOut: false,
//   outCount: 0,
//   isDoublePlay: false,
//   isTriplePlay: false,
//   isFieldersChoice: false,
//   isError: false,
//   rawEvent: 'S8'
// }

const description = translateDetailedEvent(event);
console.log(description); // "Single to center field"
```

## Design

The event translation system is designed to be robust and maintainable. It uses a pattern-based approach to parse and translate event codes, rather than relying on special cases.

### Event Parsing

The event parser breaks down the event code into its component parts:

1. **Primary Event**: The main action (e.g., single, double, groundout)
2. **Fielders**: The fielders involved in the play
3. **Location**: Where the ball was hit
4. **Base Running**: How runners advanced on the play

### Event Translation

The event translator generates a human-readable description based on the parsed event:

1. **Primary Event Description**: A description of the main action
2. **Location Description**: A description of where the ball was hit
3. **Fielder Description**: A description of the fielders involved
4. **RBI Information**: Information about runs batted in

## Benefits

The new event translation system offers several benefits:

1. **Consistency**: All events are parsed and translated using the same logic
2. **Maintainability**: The code is more modular and easier to understand
3. **Extensibility**: New event types or patterns can be added without special cases
4. **Robustness**: The system can handle complex event notations correctly

## Testing

The event translation system includes comprehensive tests to ensure that it works correctly. The tests cover a wide range of event codes, including all the special cases that were previously hardcoded.

To run the tests, use the following command:

```bash
npm test
```

## References

- [Retrosheet Event File Documentation](https://www.retrosheet.org/eventfile.htm)