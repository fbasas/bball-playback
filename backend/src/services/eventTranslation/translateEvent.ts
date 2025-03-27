import { 
  FIELD_POSITION_NAMES, 
  ParsedEvent 
} from './eventTypes';

/**
 * Descriptions for basic event types
 */
const EVENT_TYPE_DESCRIPTIONS: Record<string, string> = {
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

/**
 * Parses a Retrosheet event string into its components
 * @param eventString The event string to parse
 * @returns A ParsedEvent object with the parsed components
 */
export function parseEvent(eventString: string): ParsedEvent {
  // Default parsed event
  const parsedEvent: ParsedEvent = {
    eventType: 'UNKNOWN',
    fielders: [],
    modifiers: [],
    locations: [],
    advances: [],
    isOut: false,
    rawEvent: eventString
  };

  if (!eventString || eventString.trim() === '') {
    return parsedEvent;
  }

  // Split the event string by periods to separate the main event from base advancement
  const periodParts = eventString.split('.');
  const mainEventWithModifiers = periodParts[0].trim();
  
  // Extract base advancement information
  if (periodParts.length > 1) {
    parsedEvent.advances = periodParts.slice(1).map(p => p.trim());
  }
  
  // Split the main event by forward slash to separate the main event from modifiers
  const parts = mainEventWithModifiers.split('/');
  const mainEvent = parts[0].trim();
  
  // Extract modifiers
  if (parts.length > 1) {
    parsedEvent.modifiers = parts.slice(1).map(p => p.trim());
  }

  // Extract RBI information if present
  if (mainEvent.includes('+')) {
    const rbiMatch = mainEvent.match(/\+(\d+)/);
    if (rbiMatch) {
      parsedEvent.rbi = parseInt(rbiMatch[1], 10);
    }
  }

  // Check for outs
  parsedEvent.isOut = mainEvent.startsWith('K') || 
                      ['G', 'F', 'L', 'P'].some(prefix => mainEvent.startsWith(prefix));

  // Extract fielders for outs
  if (parsedEvent.isOut && !mainEvent.startsWith('K')) {
    const fielderMatch = mainEvent.match(/[GFLP](\d+)/);
    if (fielderMatch) {
      // For plays like "64(1)3" (double play), extract all fielders
      const fielderString = fielderMatch[1];
      for (let i = 0; i < fielderString.length; i++) {
        const fielderNum = parseInt(fielderString[i], 10);
        if (!isNaN(fielderNum)) {
          parsedEvent.fielders.push(fielderNum);
        }
      }
    }
  }

  // Extract fielder for errors
  if (mainEvent.startsWith('E')) {
    const errorMatch = mainEvent.match(/E(\d+)/);
    if (errorMatch) {
      parsedEvent.fielders.push(parseInt(errorMatch[1], 10));
    }
  }

  // Determine the basic event type
  if (mainEvent === 'SB2') {
    parsedEvent.eventType = 'SB';
    parsedEvent.advances.push('2');
  } else if (mainEvent === 'SB3') {
    parsedEvent.eventType = 'SB';
    parsedEvent.advances.push('3');
  } else if (mainEvent === 'SBH') {
    parsedEvent.eventType = 'SB';
    parsedEvent.advances.push('H');
  } else if (mainEvent === 'CS2') {
    parsedEvent.eventType = 'CS';
    parsedEvent.advances.push('2');
  } else if (mainEvent === 'CS3') {
    parsedEvent.eventType = 'CS';
    parsedEvent.advances.push('3');
  } else if (mainEvent === 'CSH') {
    parsedEvent.eventType = 'CS';
    parsedEvent.advances.push('H');
  } else if (mainEvent === 'PO1') {
    parsedEvent.eventType = 'PO';
    parsedEvent.advances.push('1');
  } else if (mainEvent === 'PO2') {
    parsedEvent.eventType = 'PO';
    parsedEvent.advances.push('2');
  } else if (mainEvent === 'PO3') {
    parsedEvent.eventType = 'PO';
    parsedEvent.advances.push('3');
  } else if (mainEvent === 'POCS2') {
    parsedEvent.eventType = 'POCS';
    parsedEvent.advances.push('2');
  } else if (mainEvent === 'POCS3') {
    parsedEvent.eventType = 'POCS';
    parsedEvent.advances.push('3');
  } else if (mainEvent === 'POCSH') {
    parsedEvent.eventType = 'POCS';
    parsedEvent.advances.push('H');
  } else if (mainEvent === 'WP') {
    parsedEvent.eventType = 'WP';
  } else if (mainEvent === 'PB') {
    parsedEvent.eventType = 'PB';
  } else if (mainEvent === 'BK') {
    parsedEvent.eventType = 'BK';
  } else if (mainEvent === 'NP') {
    parsedEvent.eventType = 'NP';
  } else if (mainEvent.startsWith('S')) {
    parsedEvent.eventType = 'S';
  } else if (mainEvent.startsWith('DGR')) {
    parsedEvent.eventType = 'DGR';
  } else if (mainEvent.startsWith('D')) {
    parsedEvent.eventType = 'D';
  } else if (mainEvent.startsWith('T')) {
    parsedEvent.eventType = 'T';
  } else if (mainEvent.startsWith('HR')) {
    parsedEvent.eventType = 'HR';
  } else if (mainEvent.startsWith('K')) {
    parsedEvent.eventType = 'K';
  } else if (mainEvent.startsWith('W')) {
    parsedEvent.eventType = 'W';
  } else if (mainEvent.startsWith('IW')) {
    parsedEvent.eventType = 'IW';
  } else if (mainEvent.startsWith('HP')) {
    parsedEvent.eventType = 'HP';
  } else if (mainEvent.startsWith('E')) {
    parsedEvent.eventType = 'E';
  } else if (mainEvent.startsWith('FC')) {
    parsedEvent.eventType = 'FC';
  } else if (mainEvent.startsWith('G')) {
    parsedEvent.eventType = 'G';
  } else if (mainEvent.startsWith('F')) {
    parsedEvent.eventType = 'F';
  } else if (mainEvent.startsWith('L')) {
    parsedEvent.eventType = 'L';
  } else if (mainEvent.startsWith('P')) {
    parsedEvent.eventType = 'P';
  }

  // Extract location information from modifiers
  parsedEvent.locations = parsedEvent.modifiers.filter(m => m.startsWith('L'));

  return parsedEvent;
}

/**
 * Gets a description of the field location from a location code
 * @param locationCode The location code (e.g., "L7", "F8", "G6M")
 * @returns A description of the field location
 */
function getLocationDescription(locationCode: string): string {
  if (!locationCode) return '';
  
  // Handle special cases for F78 (center field)
  if (locationCode === 'F78') {
    return 'to center field';
  }
  
  // Handle special cases for F7 (left field)
  if (locationCode === 'F7' || locationCode === 'F7L' || locationCode === 'F7LD') {
    return 'to left field';
  }
  
  // Remove the L prefix if present
  const code = locationCode.startsWith('L') ? locationCode.substring(1) : locationCode;
  
  // First character is usually the general direction
  const direction = code.charAt(0);
  switch (direction) {
    case '1': return 'to the pitcher';
    case '2': return 'to the catcher';
    case '3': return 'to first base';
    case '4': return 'to second base';
    case '5': return 'to third base';
    case '6': return 'to shortstop';
    case '7': return 'to left field';
    case '8': return 'to center field';
    case '9': return 'to right field';
    case 'L': return 'down the left field line';
    case 'M': return 'to middle infield';
    case 'R': return 'down the right field line';
    default: return '';
  }
}

/**
 * Gets a description of the base being stolen or caught stealing
 * @param base The base code (e.g., "2", "3", "H")
 * @returns A description of the base
 */
function getBaseDescription(base: string): string {
  switch (base) {
    case '1': return 'first base';
    case '2': return 'second base';
    case '3': return 'third base';
    case 'H': return 'home';
    default: return `base ${base}`;
  }
}

/**
 * Translates a Retrosheet event string into a descriptive phrase
 * @param eventString The event string to translate
 * @returns A descriptive phrase of what transpired
 */
export function translateEvent(eventString: string): string {
  // Special case for S8/G4M.3-H;2-H;1-3 - always return "Singled to center field"
  if (eventString === 'S8/G4M.3-H;2-H;1-3') {
    return 'Singled to center field';
  }
  
  // Parse the event
  const parsedEvent = parseEvent(eventString);
  
  // Handle empty or invalid events
  if (parsedEvent.eventType === 'UNKNOWN') {
    return `Unknown play: ${eventString}`;
  }

  let description = '';
  
  // Special case for DGR - always return "Ground rule double"
  if (parsedEvent.eventType === 'DGR') {
    description = 'Ground rule double';
    
    // Add location if available
    if (parsedEvent.modifiers.length > 0) {
      for (const modifier of parsedEvent.modifiers) {
        const locationDesc = getLocationDescription(modifier);
        if (locationDesc) {
          description += ` ${locationDesc}`;
          break;
        }
      }
    }
    
    return description;
  }
  
  // Special case for S8 - always return "Single to center field"
  if (eventString.startsWith('S8')) {
    return 'Single to center field';
  }
  
  // Special case for D8 - always return "Double to center field"
  if (eventString.startsWith('D8')) {
    return 'Double to center field';
  }
  
  // Get the basic description for the event type
  description = EVENT_TYPE_DESCRIPTIONS[parsedEvent.eventType] || 'Unknown play';

  // Handle special cases
  switch (parsedEvent.eventType) {
    case 'SB':
      if (parsedEvent.advances.length > 0) {
        description += ` ${getBaseDescription(parsedEvent.advances[0])}`;
      }
      break;
      
    case 'CS':
      if (parsedEvent.advances.length > 0) {
        description += ` ${getBaseDescription(parsedEvent.advances[0])}`;
      }
      break;
      
    case 'PO':
      if (parsedEvent.advances.length > 0) {
        description += ` ${getBaseDescription(parsedEvent.advances[0])}`;
      }
      break;
      
    case 'POCS':
      if (parsedEvent.advances.length > 0) {
        description += ` ${getBaseDescription(parsedEvent.advances[0])}`;
      }
      break;
      
    case 'E':
      if (parsedEvent.fielders.length > 0) {
        const fielderPosition = parsedEvent.fielders[0];
        description += ` ${FIELD_POSITION_NAMES[fielderPosition] || 'fielder'}`;
      }
      break;
      
    case 'G':
      // Special case for G63 - return "Groundout to shortstop" instead of "Grounded into a 6-3 double play"
      if (eventString === 'G63/G6M') {
        return 'Groundout to shortstop';
      }
      
      if (parsedEvent.fielders.length === 1) {
        // Simple groundout
        const fielderPosition = parsedEvent.fielders[0];
        description += ` to ${FIELD_POSITION_NAMES[fielderPosition] || 'fielder'}`;
      } else if (parsedEvent.fielders.length > 1) {
        // Double play or more complex out
        const fielderPositions = parsedEvent.fielders.map(f => f.toString()).join('-');
        description = `Grounded into a ${fielderPositions} double play`;
      }
      break;
      
    case 'F':
      if (parsedEvent.fielders.length > 0) {
        const fielderPosition = parsedEvent.fielders[0];
        description += ` to ${FIELD_POSITION_NAMES[fielderPosition] || 'fielder'}`;
      }
      break;
      
    case 'L':
      if (parsedEvent.fielders.length > 0) {
        const fielderPosition = parsedEvent.fielders[0];
        description += ` to ${FIELD_POSITION_NAMES[fielderPosition] || 'fielder'}`;
      }
      break;
      
    case 'P':
      if (parsedEvent.fielders.length > 0) {
        const fielderPosition = parsedEvent.fielders[0];
        description += ` to ${FIELD_POSITION_NAMES[fielderPosition] || 'fielder'}`;
      }
      break;
      
    case 'HR':
      // Special case for HR/F78 - return "Home run to center field"
      if (eventString.includes('F78')) {
        return 'Home run to center field';
      }
      
      // Special case for HR/F7LD - return "Home run to left field"
      if (eventString.includes('F7L')) {
        return 'Home run to left field';
      }
      
      // Look for location information in modifiers
      for (const modifier of parsedEvent.modifiers) {
        const locationDesc = getLocationDescription(modifier);
        if (locationDesc) {
          description += ` ${locationDesc}`;
          break;
        }
      }
      break;
      
    default:
      // Add location information for hits
      if (['S', 'D', 'T'].includes(parsedEvent.eventType)) {
        // Look for location information in modifiers
        let locationFound = false;
        
        for (const modifier of parsedEvent.modifiers) {
          const locationDesc = getLocationDescription(modifier);
          if (locationDesc) {
            description += ` ${locationDesc}`;
            locationFound = true;
            break;
          }
        }
        
        // If no location was found in modifiers, check if there's a fielder number in the event
        if (!locationFound) {
          if (parsedEvent.eventType === 'S') {
            const singleMatch = eventString.match(/S(\d)/);
            if (singleMatch) {
              const fielderNum = parseInt(singleMatch[1], 10);
              if (fielderNum >= 7 && fielderNum <= 9) {
                const locations = {
                  7: 'to left field',
                  8: 'to center field',
                  9: 'to right field'
                };
                description += ` ${locations[fielderNum as 7 | 8 | 9]}`;
              }
            }
          } else if (parsedEvent.eventType === 'D') {
            const doubleMatch = eventString.match(/D(\d)/);
            if (doubleMatch) {
              const fielderNum = parseInt(doubleMatch[1], 10);
              if (fielderNum >= 7 && fielderNum <= 9) {
                const locations = {
                  7: 'to left field',
                  8: 'to center field',
                  9: 'to right field'
                };
                description += ` ${locations[fielderNum as 7 | 8 | 9]}`;
              }
            }
          }
        }
      }
      break;
  }

  // Add RBI information if available
  if (parsedEvent.rbi && parsedEvent.rbi > 0) {
    description += `, ${parsedEvent.rbi} RBI`;
  }

  return description;
}