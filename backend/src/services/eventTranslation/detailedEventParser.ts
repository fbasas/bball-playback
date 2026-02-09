import { 
  DetailedBaseballEvent, 
  FielderInfo, 
  LocationInfo, 
  BaseRunningInfo,
  FIELD_POSITION_NAMES
} from './detailedEventTypes';

/**
 * Parses a Retrosheet event string into a detailed baseball event
 * @param eventString The event string to parse
 * @returns A DetailedBaseballEvent object with the parsed components
 */
export function parseDetailedEvent(eventString: string): DetailedBaseballEvent {
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
  
  if (!eventString || eventString.trim() === '') {
    return event;
  }
  
  // Split the event string into components
  const periodParts = eventString.split('.');
  const mainEventWithModifiers = periodParts[0].trim();
  const advancementParts = periodParts.slice(1).map(p => p.trim());
  
  // Split the main event by forward slash to separate the main event from modifiers
  const parts = mainEventWithModifiers.split('/');
  const primaryEvent = parts[0].trim();
  const modifiers = parts.slice(1).map(p => p.trim());
  
  // Parse the primary event
  parsePrimaryEvent(primaryEvent, event);
  
  // Parse modifiers
  parseModifiers(modifiers, event);
  
  // Parse base advancements
  parseBaseAdvancements(advancementParts, event);
  
  // Extract RBI information if present
  if (primaryEvent.includes('+')) {
    const rbiMatch = primaryEvent.match(/\+(\d+)/);
    if (rbiMatch) {
      event.rbi = parseInt(rbiMatch[1], 10);
    }
  }
  
  return event;
}

/**
 * Parses the primary event component
 * @param primaryEvent The primary event string
 * @param event The event object to update
 */
function parsePrimaryEvent(primaryEvent: string, event: DetailedBaseballEvent): void {
  // Handle base running events FIRST (before hits) to avoid SB being parsed as S
  if (/^SB[23H]/.test(primaryEvent)) {
    event.primaryEventType = 'SB';
    const base = primaryEvent.substring(2);
    event.baseRunning.push({
      runner: '',  // Will be filled in from context
      fromBase: base === '2' ? '1' : base === '3' ? '2' : '3',
      toBase: base
    });
    return;
  } else if (/^CS[23H]/.test(primaryEvent)) {
    event.primaryEventType = 'CS';
    const base = primaryEvent.substring(2);
    event.baseRunning.push({
      runner: '',  // Will be filled in from context
      fromBase: base === '2' ? '1' : base === '3' ? '2' : '3',
      toBase: base,
      isOut: true
    });
    return;
  }

  // Handle sacrifice events BEFORE singles (to avoid SH/SF being parsed as S)
  if (/^SH\d*/.test(primaryEvent)) {
    event.primaryEventType = 'SH';
    event.isOut = true;
    event.outCount = 1;
    // Extract fielders if present (e.g., SH13 = pitcher to first)
    const fielderString = primaryEvent.substring(2);
    if (fielderString) {
      parseFielders(fielderString, event);
    }
    return;
  } else if (/^SF\d*/.test(primaryEvent)) {
    event.primaryEventType = 'SF';
    event.isOut = true;
    event.outCount = 1;
    // Extract fielder if present (e.g., SF9 = to right fielder)
    const fielderString = primaryEvent.substring(2);
    if (fielderString) {
      parseFielders(fielderString, event);
    }
    return;
  }

  // Handle hits (S, D, T, HR, DGR)
  // Note: DGR must be checked before D to prevent false match
  if (/^S\d?/.test(primaryEvent)) {
    event.primaryEventType = 'S';
    parseHitLocation(primaryEvent.substring(1), event);
  } else if (primaryEvent.startsWith('DGR')) {
    event.primaryEventType = 'DGR';
    parseHitLocation(primaryEvent.substring(3), event);
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
    const fielderString = primaryEvent.substring(1);
    // Check for double play (e.g., G63 = 6-3 double play)
    if (fielderString.length >= 2) {
      event.isDoublePlay = true;
      event.outCount = 2;
    } else {
      event.outCount = 1;
    }
    parseFielders(fielderString, event);
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
    
    // Extract fielder if present (e.g., FC5)
    const fielderMatch = primaryEvent.match(/FC(\d)/);
    if (fielderMatch) {
      const fielderPosition = parseInt(fielderMatch[1], 10);
      event.fielders.push({
        position: fielderPosition,
        role: 'primary'
      });
    }
  }
  
  // Handle base running events (SB and CS handled above)
  else if (/^PO[123]/.test(primaryEvent)) {
    event.primaryEventType = 'PO';
    const base = primaryEvent.substring(2);
    event.baseRunning.push({
      runner: '',  // Will be filled in from context
      fromBase: base,
      toBase: base,
      isOut: true
    });
  } else if (/^POCS[23H]/.test(primaryEvent)) {
    event.primaryEventType = 'POCS';
    const base = primaryEvent.substring(4);
    event.baseRunning.push({
      runner: '',  // Will be filled in from context
      fromBase: base === '2' ? '1' : base === '3' ? '2' : '3',
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

  // Handle fielder-to-fielder plays (e.g., 31, 643) and single fielder plays (e.g., 7)
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

    // Parse the fielders
    for (let i = 0; i < primaryEvent.length; i++) {
      const fielderPosition = parseInt(primaryEvent[i], 10);
      event.fielders.push({
        position: fielderPosition,
        role: i === 0 ? 'primary' : i === primaryEvent.length - 1 ? 'putout' : 'assist'
      });
    }

    // Determine default event type based on fielder positions
    // Single fielder: outfielders (7-9) default to flyout, infielders (1-6) default to groundout
    // Multi-fielder: default to groundout (can be overridden by modifiers)
    if (primaryEvent.length === 1) {
      const fielderPosition = parseInt(primaryEvent, 10);
      event.primaryEventType = fielderPosition >= 7 && fielderPosition <= 9 ? 'F' : 'G';
    } else {
      event.primaryEventType = 'G';
    }
  }
}

/**
 * Parses modifiers in the event string
 * @param modifiers Array of modifier strings
 * @param event The event object to update
 */
function parseModifiers(modifiers: string[], event: DetailedBaseballEvent): void {
  // Check if primary event is a single fielder number (e.g., "7" or "8")
  // In this case, modifiers should override the default event type
  const primaryPart = event.rawEvent.split('/')[0];
  const isSingleFielderPlay = /^[1-9]$/.test(primaryPart);

  for (const modifier of modifiers) {
    // Parse location modifiers
    if (modifier.startsWith('F')) {
      event.location.trajectory = 'fly ball';
      parseLocationCode(modifier.substring(1), event);

      // Override event type for single fielder plays, or set if not set
      if (isSingleFielderPlay || (!event.primaryEventType && event.fielders.length > 0)) {
        event.primaryEventType = 'F';
        event.isOut = true;
        event.outCount = 1;
      }
    } else if (modifier.startsWith('L')) {
      event.location.trajectory = 'line drive';
      parseLocationCode(modifier.substring(1), event);

      // Override event type for single fielder plays, or set if not set
      if (isSingleFielderPlay || (!event.primaryEventType && event.fielders.length > 0)) {
        event.primaryEventType = 'L';
        event.isOut = true;
        event.outCount = 1;
      }
    } else if (modifier.startsWith('G')) {
      event.location.trajectory = 'ground ball';
      parseLocationCode(modifier.substring(1), event);

      // Override event type for single fielder plays, or set if not set
      if (isSingleFielderPlay || (!event.primaryEventType && event.fielders.length > 0)) {
        event.primaryEventType = 'G';
        event.isOut = true;
        event.outCount = 1;
      }
    } else if (modifier.startsWith('P')) {
      event.location.trajectory = 'popup';
      parseLocationCode(modifier.substring(1), event);

      // Override event type for single fielder plays, or set if not set
      if (isSingleFielderPlay || (!event.primaryEventType && event.fielders.length > 0)) {
        event.primaryEventType = 'P';
        event.isOut = true;
        event.outCount = 1;
      }
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
  
  // If we still don't have a primary event type after processing all modifiers,
  // and this is a fielder-number play, default to flyout for outfielders (7-9)
  // and groundout for infielders (1-6)
  if (!event.primaryEventType && event.fielders.length > 0 && /^[1-9]$/.test(event.rawEvent.split('/')[0])) {
    const fielderPosition = parseInt(event.rawEvent.split('/')[0], 10);
    if (fielderPosition >= 7 && fielderPosition <= 9) {
      // Outfielders (7=LF, 8=CF, 9=RF) default to flyout
      event.primaryEventType = 'F';
    } else {
      // Infielders default to groundout
      event.primaryEventType = 'G';
    }
    event.isOut = true;
    event.outCount = 1;
  }
}

/**
 * Parses base advancement information
 * @param advancementParts Array of advancement strings
 * @param event The event object to update
 */
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

/**
 * Parses hit location information
 * @param locationCode The location code
 * @param event The event object to update
 */
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

/**
 * Parses fielder information
 * @param fielderCode The fielder code
 * @param event The event object to update
 */
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

/**
 * Parses location code information
 * @param locationCode The location code
 * @param event The event object to update
 */
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
    
    // Add the fielder if not already present
    if (!event.fielders.some(f => f.position === fielderPosition)) {
      event.fielders.push({
        position: fielderPosition,
        role: 'primary'
      });
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

/**
 * Converts a DetailedBaseballEvent to a ParsedEvent for backward compatibility
 * @param detailedEvent The detailed event to convert
 * @returns A ParsedEvent object
 */
export function convertToLegacyParsedEvent(detailedEvent: DetailedBaseballEvent): { eventType: string, fielders: number[], modifiers: string[], locations: string[], advances: string[], isOut: boolean, rbi?: number, rawEvent: string } {
  return {
    eventType: detailedEvent.primaryEventType,
    fielders: detailedEvent.fielders.map(f => f.position),
    modifiers: [], // This would need to be reconstructed from the detailed event
    locations: [], // This would need to be reconstructed from the detailed event
    advances: detailedEvent.baseRunning.map(br => br.toBase),
    isOut: detailedEvent.isOut,
    rbi: detailedEvent.rbi,
    rawEvent: detailedEvent.rawEvent
  };
}