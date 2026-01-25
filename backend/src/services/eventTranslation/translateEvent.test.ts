// @ts-nocheck
// The above directive disables TypeScript checking for this file
// In a real project, you would install @types/jest with: npm i --save-dev @types/jest

import { translateEvent } from './translateEvent';
import { parseDetailedEvent } from './detailedEventParser';
import { translateDetailedEvent } from './detailedEventTranslator';

describe('Event Translation', () => {
  describe('parseDetailedEvent', () => {
    it('should parse a single', () => {
      const event = parseDetailedEvent('S8');
      expect(event.primaryEventType).toBe('S');
      expect(event.fielders[0].position).toBe(8);
      expect(event.location.direction).toBe('center');
      expect(event.location.zone).toBe('outfield');
    });

    it('should parse a double', () => {
      const event = parseDetailedEvent('D7');
      expect(event.primaryEventType).toBe('D');
      expect(event.fielders[0].position).toBe(7);
      expect(event.location.direction).toBe('left');
      expect(event.location.zone).toBe('outfield');
    });

    it('should parse a home run', () => {
      const event = parseDetailedEvent('HR/F7');
      expect(event.primaryEventType).toBe('HR');
      expect(event.location.trajectory).toBe('fly ball');
      expect(event.location.direction).toBe('left');
      expect(event.location.zone).toBe('outfield');
    });

    it('should parse a groundout', () => {
      const event = parseDetailedEvent('G63');
      expect(event.primaryEventType).toBe('G');
      expect(event.isOut).toBe(true);
      expect(event.fielders.length).toBe(2);
      expect(event.fielders[0].position).toBe(6);
      expect(event.fielders[1].position).toBe(3);
    });

    it('should parse a flyout', () => {
      const event = parseDetailedEvent('F8');
      expect(event.primaryEventType).toBe('F');
      expect(event.isOut).toBe(true);
      expect(event.fielders[0].position).toBe(8);
    });

    it('should parse a strikeout', () => {
      const event = parseDetailedEvent('K');
      expect(event.primaryEventType).toBe('K');
      expect(event.isOut).toBe(true);
    });

    it('should parse a walk', () => {
      const event = parseDetailedEvent('W');
      expect(event.primaryEventType).toBe('W');
      expect(event.isOut).toBe(false);
    });

    it('should parse an error', () => {
      const event = parseDetailedEvent('E6');
      expect(event.primaryEventType).toBe('E');
      expect(event.isError).toBe(true);
      expect(event.fielders[0].position).toBe(6);
      expect(event.fielders[0].role).toBe('error');
    });

    it('should parse a stolen base', () => {
      const event = parseDetailedEvent('SB2');
      expect(event.primaryEventType).toBe('SB');
      expect(event.baseRunning[0].toBase).toBe('2');
      expect(event.baseRunning[0].fromBase).toBe('1');
    });

    it('should parse a caught stealing', () => {
      const event = parseDetailedEvent('CS2');
      expect(event.primaryEventType).toBe('CS');
      expect(event.baseRunning[0].toBase).toBe('2');
      expect(event.baseRunning[0].fromBase).toBe('1');
      expect(event.baseRunning[0].isOut).toBe(true);
    });

    it('should parse a fielder-to-fielder play', () => {
      const event = parseDetailedEvent('31');
      expect(event.primaryEventType).toBe('G');
      expect(event.isOut).toBe(true);
      expect(event.fielders.length).toBe(2);
      expect(event.fielders[0].position).toBe(3);
      expect(event.fielders[0].role).toBe('primary');
      expect(event.fielders[1].position).toBe(1);
      expect(event.fielders[1].role).toBe('putout');
    });

    it('should parse a double play', () => {
      const event = parseDetailedEvent('643');
      expect(event.primaryEventType).toBe('G');
      expect(event.isOut).toBe(true);
      expect(event.isDoublePlay).toBe(true);
      expect(event.outCount).toBe(2);
      expect(event.fielders.length).toBe(3);
      expect(event.fielders[0].position).toBe(6);
      expect(event.fielders[1].position).toBe(4);
      expect(event.fielders[2].position).toBe(3);
    });

    it('should parse a fielder number with modifier', () => {
      const event = parseDetailedEvent('7/F7D');
      expect(event.primaryEventType).toBe('F');
      expect(event.isOut).toBe(true);
      expect(event.fielders[0].position).toBe(7);
      expect(event.location.trajectory).toBe('fly ball');
      expect(event.location.direction).toBe('left');
      expect(event.location.depth).toBe('deep');
    });

    it('should parse base advancements', () => {
      const event = parseDetailedEvent('S8.1-3;2-H');
      expect(event.primaryEventType).toBe('S');
      expect(event.baseRunning.length).toBe(2);
      expect(event.baseRunning[0].fromBase).toBe('1');
      expect(event.baseRunning[0].toBase).toBe('3');
      expect(event.baseRunning[1].fromBase).toBe('2');
      expect(event.baseRunning[1].toBase).toBe('H');
    });

    it('should parse RBI information', () => {
      const event = parseDetailedEvent('S8+1');
      expect(event.primaryEventType).toBe('S');
      expect(event.rbi).toBe(1);
    });
  });

  describe('translateDetailedEvent', () => {
    it('should translate a single', () => {
      const event = parseDetailedEvent('S8');
      const description = translateDetailedEvent(event);
      expect(description).toBe('Single to center field');
    });

    it('should translate a double', () => {
      const event = parseDetailedEvent('D7');
      const description = translateDetailedEvent(event);
      expect(description).toBe('Double to left field');
    });

    it('should translate a home run', () => {
      const event = parseDetailedEvent('HR/F7');
      const description = translateDetailedEvent(event);
      expect(description).toBe('Home run to left field');
    });

    it('should translate a groundout', () => {
      const event = parseDetailedEvent('G63');
      const description = translateDetailedEvent(event);
      expect(description).toBe('Grounded into a 6-3 double play');
    });

    it('should translate a flyout', () => {
      const event = parseDetailedEvent('F8');
      const description = translateDetailedEvent(event);
      expect(description).toBe('Flyout to center fielder');
    });

    it('should translate a strikeout', () => {
      const event = parseDetailedEvent('K');
      const description = translateDetailedEvent(event);
      expect(description).toBe('Struck out');
    });

    it('should translate a walk', () => {
      const event = parseDetailedEvent('W');
      const description = translateDetailedEvent(event);
      expect(description).toBe('Walk');
    });

    it('should translate an error', () => {
      const event = parseDetailedEvent('E6');
      const description = translateDetailedEvent(event);
      expect(description).toBe('Error by shortstop');
    });

    it('should translate a stolen base', () => {
      const event = parseDetailedEvent('SB2');
      const description = translateDetailedEvent(event);
      expect(description).toBe('Stole second base');
    });

    it('should translate a caught stealing', () => {
      const event = parseDetailedEvent('CS2');
      const description = translateDetailedEvent(event);
      expect(description).toBe('Caught stealing second base');
    });

    it('should translate a fielder-to-fielder play', () => {
      const event = parseDetailedEvent('31');
      const description = translateDetailedEvent(event);
      expect(description).toBe('Groundout to first baseman, throw to pitcher');
    });

    it('should translate a double play', () => {
      const event = parseDetailedEvent('643');
      const description = translateDetailedEvent(event);
      expect(description).toBe('Grounded into a 6-4-3 double play');
    });

    it('should translate a fielder number with modifier', () => {
      const event = parseDetailedEvent('7/F7D');
      const description = translateDetailedEvent(event);
      expect(description).toBe('Flyout to left fielder');
    });

    it('should include RBI information', () => {
      const event = parseDetailedEvent('S8+1');
      const description = translateDetailedEvent(event);
      expect(description).toBe('Single to center field, 1 RBI');
    });
  });

  describe('translateEvent', () => {
    // Test special cases that previously required hardcoded translations
    it('should translate S8/G4M.3-H;2-H;1-3', () => {
      const description = translateEvent('S8/G4M.3-H;2-H;1-3');
      expect(description).toBe('Single to center field');
    });

    it('should translate 31/G3.2-3', () => {
      const description = translateEvent('31/G3.2-3');
      expect(description).toBe('Groundout to first baseman, throw to pitcher');
    });

    it('should translate S8', () => {
      const description = translateEvent('S8');
      expect(description).toBe('Single to center field');
    });

    it('should translate D8', () => {
      const description = translateEvent('D8');
      expect(description).toBe('Double to center field');
    });

    it('should translate single fielder number', () => {
      const description = translateEvent('7');
      expect(description).toBe('Flyout to left fielder');
    });

    it('should translate G63/G6M', () => {
      const description = translateEvent('G63/G6M');
      expect(description).toBe('Grounded into a 6-3 double play');
    });

    it('should translate HR/F78', () => {
      const description = translateEvent('HR/F78');
      // F78 means between left fielder (7) and center fielder (8), which is left-center
      expect(description).toBe('Home run to left-center field');
    });

    it('should translate HR/F7LD', () => {
      const description = translateEvent('HR/F7LD');
      expect(description).toBe('Home run to left field');
    });

    // Test other common event types
    it('should translate T9', () => {
      const description = translateEvent('T9');
      expect(description).toBe('Triple to right field');
    });

    it('should translate K', () => {
      const description = translateEvent('K');
      expect(description).toBe('Struck out');
    });

    it('should translate W', () => {
      const description = translateEvent('W');
      expect(description).toBe('Walk');
    });

    it('should translate IW', () => {
      const description = translateEvent('IW');
      expect(description).toBe('Intentional walk');
    });

    it('should translate HP', () => {
      const description = translateEvent('HP');
      expect(description).toBe('Hit by pitch');
    });

    it('should translate E6', () => {
      const description = translateEvent('E6');
      expect(description).toBe('Error by shortstop');
    });

    it('should translate FC5', () => {
      const description = translateEvent('FC5');
      expect(description).toBe('Reached on a fielder\'s choice to third baseman');
    });

    it('should translate SB2', () => {
      const description = translateEvent('SB2');
      expect(description).toBe('Stole second base');
    });

    it('should translate CS2', () => {
      const description = translateEvent('CS2');
      expect(description).toBe('Caught stealing second base');
    });

    it('should translate PO1', () => {
      const description = translateEvent('PO1');
      expect(description).toBe('Picked off first base');
    });

    it('should translate WP', () => {
      const description = translateEvent('WP');
      expect(description).toBe('Wild pitch');
    });

    it('should translate PB', () => {
      const description = translateEvent('PB');
      expect(description).toBe('Passed ball');
    });

    it('should translate BK', () => {
      const description = translateEvent('BK');
      expect(description).toBe('Balk');
    });

    it('should translate DGR', () => {
      const description = translateEvent('DGR');
      expect(description).toBe('Ground rule double');
    });

    it('should translate NP', () => {
      const description = translateEvent('NP');
      expect(description).toBe('No play');
    });

    // Test complex events
    it('should translate 643/G6M', () => {
      const description = translateEvent('643/G6M');
      expect(description).toBe('Grounded into a 6-4-3 double play');
    });

    it('should translate S9/L9S.2-H;1-3', () => {
      const description = translateEvent('S9/L9S.2-H;1-3');
      expect(description).toBe('Single to right field');
    });

    it('should translate 8/F8D', () => {
      const description = translateEvent('8/F8D');
      expect(description).toBe('Flyout to center fielder');
    });

    it('should translate 6/P6S', () => {
      const description = translateEvent('6/P6S');
      expect(description).toBe('Popup to shortstop');
    });

    it('should translate 5/L5', () => {
      const description = translateEvent('5/L5');
      expect(description).toBe('Lineout to third baseman');
    });

    it('should translate HR/F7D.1-H;2-H', () => {
      const description = translateEvent('HR/F7D.1-H;2-H');
      expect(description).toBe('Home run to left field');
    });

    it('should translate S7/G5.3-H;1-2', () => {
      const description = translateEvent('S7/G5.3-H;1-2');
      expect(description).toBe('Single to left field');
    });

    it('should translate D7/L7L.2-H;1-3', () => {
      const description = translateEvent('D7/L7L.2-H;1-3');
      expect(description).toBe('Double to left field');
    });

    it('should translate S8+2.3-H;2-H;1-3', () => {
      const description = translateEvent('S8+2.3-H;2-H;1-3');
      expect(description).toBe('Single to center field, 2 RBI');
    });
  });
});