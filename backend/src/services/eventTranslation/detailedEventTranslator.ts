import { DetailedBaseballEvent } from './detailedEventTypes';
import { FIELD_POSITION_NAMES } from './detailedEventTypes';

/**
 * Translates a detailed baseball event into a descriptive phrase
 * @param event The detailed event to translate
 * @returns A descriptive phrase of what transpired
 */
export function translateDetailedEvent(event: DetailedBaseballEvent): string {
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

/**
 * Translates the primary event
 * @param event The detailed event
 * @returns A description of the primary event
 */
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
  
  if (event.primaryEventType === 'POCS' && event.baseRunning.length > 0) {
    const base = event.baseRunning[0].toBase;
    const baseDesc = base === '2' ? 'second base' : base === '3' ? 'third base' : 'home';
    return `Picked off and caught stealing ${baseDesc}`;
  }
  
  // Handle fielder-to-fielder plays for non-double/triple plays
  if (event.fielders.length >= 2 && !event.isDoublePlay && !event.isTriplePlay && 
      event.primaryEventType === 'G' && /^[1-9]+$/.test(event.rawEvent.split('/')[0])) {
    const firstFielder = event.fielders[0];
    const lastFielder = event.fielders[event.fielders.length - 1];
    
    return `Groundout to ${FIELD_POSITION_NAMES[firstFielder.position] || 'fielder'}, throw to ${FIELD_POSITION_NAMES[lastFielder.position] || 'fielder'}`;
  }
  
  // Handle standard events
  return eventTypeDescriptions[event.primaryEventType] || 'Unknown play';
}

/**
 * Translates the location information
 * @param event The detailed event
 * @returns A description of the location
 */
function translateLocation(event: DetailedBaseballEvent): string {
  // For hits, we want to describe where the ball was hit
  if (['S', 'D', 'T', 'HR', 'DGR'].includes(event.primaryEventType)) {
    // If we have a specific direction, use that
    if (event.location.direction) {
      if (event.location.zone === 'outfield') {
        if (event.location.direction === 'left') {
          return 'to left field';
        } else if (event.location.direction === 'center') {
          return 'to center field';
        } else if (event.location.direction === 'right') {
          return 'to right field';
        } else if (event.location.direction === 'left-center') {
          return 'to left-center field';
        } else if (event.location.direction === 'right-center') {
          return 'to right-center field';
        }
      } else if (event.location.zone === 'infield') {
        if (event.location.direction === 'left side') {
          return 'to the left side of the infield';
        } else if (event.location.direction === 'right side') {
          return 'to the right side of the infield';
        }
      }
    }
    
    // If we have a fielder, use that to determine location
    if (event.fielders.length > 0) {
      const fielder = event.fielders[0];
      if (fielder.position >= 7 && fielder.position <= 9) {
        if (fielder.position === 7) {
          return 'to left field';
        } else if (fielder.position === 8) {
          return 'to center field';
        } else if (fielder.position === 9) {
          return 'to right field';
        }
      } else if (fielder.position >= 1 && fielder.position <= 6) {
        return `to ${FIELD_POSITION_NAMES[fielder.position] || 'fielder'}`;
      }
    }
  }
  
  // For outs, we don't need to describe the location as it's covered by the fielder
  return '';
}

/**
 * Translates the fielder information
 * @param event The detailed event
 * @returns A description of the fielders involved
 */
function translateFielders(event: DetailedBaseballEvent): string {
  // For errors, return the fielder who made the error
  if (event.isError) {
    const errorFielder = event.fielders.find(f => f.role === 'error');
    if (errorFielder) {
      return FIELD_POSITION_NAMES[errorFielder.position] || 'fielder';
    }
  }
  
  // For outs, return the primary fielder
  if (event.isOut) {
    // If we have a fielder-to-fielder play, it's handled in translatePrimaryEvent
    if (event.fielders.length >= 2 && /^[1-9]+$/.test(event.rawEvent.split('/')[0])) {
      return '';
    }
    
    const primaryFielder = event.fielders.find(f => f.role === 'primary');
    if (primaryFielder) {
      return `to ${FIELD_POSITION_NAMES[primaryFielder.position] || 'fielder'}`;
    }
  }
  
  // For fielder's choice, return the fielders involved
  if (event.isFieldersChoice) {
    const fielders = event.fielders.map(f => FIELD_POSITION_NAMES[f.position] || 'fielder');
    if (fielders.length > 0) {
      return `to ${fielders.join(', ')}`;
    }
  }
  
  return '';
}

/**
 * Gets a description of the base being stolen or caught stealing
 * @param base The base code (e.g., "2", "3", "H")
 * @returns A description of the base
 */
export function getBaseDescription(base: string): string {
  switch (base) {
    case '1': return 'first base';
    case '2': return 'second base';
    case '3': return 'third base';
    case 'H': return 'home';
    default: return `base ${base}`;
  }
}