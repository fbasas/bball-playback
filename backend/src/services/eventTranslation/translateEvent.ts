/**
 * Event Translation Service
 *
 * Translates Retrosheet event codes into human-readable descriptions.
 * Uses the detailed event parser and translator for accurate play descriptions.
 *
 * Event format: https://www.retrosheet.org/eventfile.htm
 */

import { parseDetailedEvent } from './detailedEventParser';
import { translateDetailedEvent } from './detailedEventTranslator';

/**
 * Translates a Retrosheet event string into a descriptive phrase
 * @param eventString The event string to translate (e.g., "S7/L7", "K", "HR/F78")
 * @returns A descriptive phrase of what transpired
 */
export function translateEvent(eventString: string): string {
  const detailedEvent = parseDetailedEvent(eventString);
  return translateDetailedEvent(detailedEvent);
}

// Re-export parsing functions for consumers who need lower-level access
export { parseDetailedEvent } from './detailedEventParser';
export { translateDetailedEvent } from './detailedEventTranslator';
