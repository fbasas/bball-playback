/**
 * Event Translation Service
 * 
 * This service provides functionality to translate Retrosheet event codes
 * into human-readable descriptions of baseball plays.
 * 
 * The event format is described at: https://www.retrosheet.org/eventfile.htm
 */

export { translateEvent } from './translateEvent';
export { parseEvent } from './translateEvent';
export * from './eventTypes';