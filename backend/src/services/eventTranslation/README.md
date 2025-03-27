# Event Translation Service

This service provides functionality to translate Retrosheet event codes into human-readable descriptions of baseball plays.

## Overview

The Retrosheet event format is a compact notation used to describe baseball plays. This service parses these event codes and generates descriptive phrases that explain what happened during the play, similar to the play-by-play descriptions found on the Retrosheet website.

## Files

- `index.ts` - Main export file
- `eventTypes.ts` - Type definitions and constants
- `translateEvent.ts` - Core translation function
- `tests/translateEvent.test.ts` - Test script

## Usage

```typescript
import { translateEvent } from '../services/eventTranslation';

// Example: Translate a single event
const eventString = 'S7/L7';
const description = translateEvent(eventString);
console.log(description); // "Singled to left field"

// Example: Translate a home run
const homeRun = 'HR/F78';
console.log(translateEvent(homeRun)); // "Homered to center field"

// Example: Translate a strikeout
const strikeout = 'K';
console.log(translateEvent(strikeout)); // "Struck out"
```

## Event Format

The event format is described in detail at [https://www.retrosheet.org/eventfile.htm](https://www.retrosheet.org/eventfile.htm).

Some common event types:

- `S` - Single
- `D` - Double
- `T` - Triple
- `HR` - Home Run
- `K` - Strikeout
- `W` - Walk
- `HP` - Hit by pitch
- `E` - Error
- `FC` - Fielder's choice
- `G` - Ground out
- `F` - Fly out
- `L` - Line out
- `P` - Pop out

## Testing

To test the event translation functionality, run:

```bash
cd backend
npx ts-node src/scripts/testEventTranslation.ts
```

This will fetch plays from the database for game ID NYA202410300 and display the original event code alongside its translation.

## References

- [Retrosheet Event File Documentation](https://www.retrosheet.org/eventfile.htm)
- [Example Play-by-Play](https://www.retrosheet.org/boxesetc/2024/B10300NYA2024.htm)