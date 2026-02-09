// @ts-nocheck
// The above directive disables TypeScript checking for this file
// In a real project, you would install @types/jest with: npm i --save-dev @types/jest

import { translateEvent } from './translateEvent';
import { parseDetailedEvent } from './detailedEventParser';
import { translateDetailedEvent } from './detailedEventTranslator';

describe('Event Translation', () => {
  // =============================================================================
  // SECTION 1: parseDetailedEvent Tests
  // =============================================================================
  describe('parseDetailedEvent', () => {
    // -------------------------------------------------------------------------
    // 1.1 Singles (S1-S9 and variants)
    // -------------------------------------------------------------------------
    describe('singles', () => {
      it('should parse S7 (single to left field)', () => {
        const event = parseDetailedEvent('S7');
        expect(event.primaryEventType).toBe('S');
        expect(event.fielders[0].position).toBe(7);
        expect(event.location.direction).toBe('left');
        expect(event.location.zone).toBe('outfield');
      });

      it('should parse S8 (single to center field)', () => {
        const event = parseDetailedEvent('S8');
        expect(event.primaryEventType).toBe('S');
        expect(event.fielders[0].position).toBe(8);
        expect(event.location.direction).toBe('center');
        expect(event.location.zone).toBe('outfield');
      });

      it('should parse S9 (single to right field)', () => {
        const event = parseDetailedEvent('S9');
        expect(event.primaryEventType).toBe('S');
        expect(event.fielders[0].position).toBe(9);
        expect(event.location.direction).toBe('right');
        expect(event.location.zone).toBe('outfield');
      });

      it('should parse S1 (infield single to pitcher)', () => {
        const event = parseDetailedEvent('S1');
        expect(event.primaryEventType).toBe('S');
        expect(event.fielders[0].position).toBe(1);
        expect(event.location.zone).toBe('infield');
      });

      it('should parse S3 (infield single to first baseman)', () => {
        const event = parseDetailedEvent('S3');
        expect(event.primaryEventType).toBe('S');
        expect(event.fielders[0].position).toBe(3);
        expect(event.location.zone).toBe('infield');
      });

      it('should parse S5 (infield single to third baseman)', () => {
        const event = parseDetailedEvent('S5');
        expect(event.primaryEventType).toBe('S');
        expect(event.fielders[0].position).toBe(5);
        expect(event.location.zone).toBe('infield');
      });

      it('should parse S6 (infield single to shortstop)', () => {
        const event = parseDetailedEvent('S6');
        expect(event.primaryEventType).toBe('S');
        expect(event.fielders[0].position).toBe(6);
        expect(event.location.zone).toBe('infield');
      });

      it('should parse single with ground ball modifier', () => {
        const event = parseDetailedEvent('S7/G56');
        expect(event.primaryEventType).toBe('S');
        expect(event.location.trajectory).toBe('ground ball');
      });

      it('should parse single with line drive modifier', () => {
        const event = parseDetailedEvent('S8/L8');
        expect(event.primaryEventType).toBe('S');
        expect(event.location.trajectory).toBe('line drive');
      });
    });

    // -------------------------------------------------------------------------
    // 1.2 Doubles (D1-D9, DGR, and variants)
    // -------------------------------------------------------------------------
    describe('doubles', () => {
      it('should parse D7 (double to left field)', () => {
        const event = parseDetailedEvent('D7');
        expect(event.primaryEventType).toBe('D');
        expect(event.fielders[0].position).toBe(7);
        expect(event.location.direction).toBe('left');
        expect(event.location.zone).toBe('outfield');
      });

      it('should parse D8 (double to center field)', () => {
        const event = parseDetailedEvent('D8');
        expect(event.primaryEventType).toBe('D');
        expect(event.fielders[0].position).toBe(8);
        expect(event.location.direction).toBe('center');
      });

      it('should parse D9 (double to right field)', () => {
        const event = parseDetailedEvent('D9');
        expect(event.primaryEventType).toBe('D');
        expect(event.fielders[0].position).toBe(9);
        expect(event.location.direction).toBe('right');
      });

      it('should parse DGR (ground rule double)', () => {
        const event = parseDetailedEvent('DGR');
        expect(event.primaryEventType).toBe('DGR');
      });

      it('should parse DGR7 (ground rule double to left)', () => {
        const event = parseDetailedEvent('DGR7');
        expect(event.primaryEventType).toBe('DGR');
        expect(event.fielders[0].position).toBe(7);
      });

      it('should parse double with line drive modifier', () => {
        const event = parseDetailedEvent('D7/L7D');
        expect(event.primaryEventType).toBe('D');
        expect(event.location.trajectory).toBe('line drive');
        expect(event.location.depth).toBe('deep');
      });
    });

    // -------------------------------------------------------------------------
    // 1.3 Triples (T1-T9)
    // -------------------------------------------------------------------------
    describe('triples', () => {
      it('should parse T7 (triple to left field)', () => {
        const event = parseDetailedEvent('T7');
        expect(event.primaryEventType).toBe('T');
        expect(event.fielders[0].position).toBe(7);
        expect(event.location.direction).toBe('left');
      });

      it('should parse T8 (triple to center field)', () => {
        const event = parseDetailedEvent('T8');
        expect(event.primaryEventType).toBe('T');
        expect(event.fielders[0].position).toBe(8);
        expect(event.location.direction).toBe('center');
      });

      it('should parse T9 (triple to right field)', () => {
        const event = parseDetailedEvent('T9');
        expect(event.primaryEventType).toBe('T');
        expect(event.fielders[0].position).toBe(9);
        expect(event.location.direction).toBe('right');
      });

      it('should parse triple with deep modifier', () => {
        const event = parseDetailedEvent('T8/F8D');
        expect(event.primaryEventType).toBe('T');
        expect(event.location.depth).toBe('deep');
      });
    });

    // -------------------------------------------------------------------------
    // 1.4 Home Runs (HR, HR7, HR/F78, etc.)
    // -------------------------------------------------------------------------
    describe('home runs', () => {
      it('should parse HR (basic home run)', () => {
        const event = parseDetailedEvent('HR');
        expect(event.primaryEventType).toBe('HR');
      });

      it('should parse HR7 (home run to left)', () => {
        const event = parseDetailedEvent('HR7');
        expect(event.primaryEventType).toBe('HR');
        expect(event.fielders[0].position).toBe(7);
      });

      it('should parse HR8 (home run to center)', () => {
        const event = parseDetailedEvent('HR8');
        expect(event.primaryEventType).toBe('HR');
        expect(event.fielders[0].position).toBe(8);
      });

      it('should parse HR9 (home run to right)', () => {
        const event = parseDetailedEvent('HR9');
        expect(event.primaryEventType).toBe('HR');
        expect(event.fielders[0].position).toBe(9);
      });

      it('should parse HR/F7 (fly ball home run to left)', () => {
        const event = parseDetailedEvent('HR/F7');
        expect(event.primaryEventType).toBe('HR');
        expect(event.location.trajectory).toBe('fly ball');
        expect(event.location.direction).toBe('left');
        expect(event.location.zone).toBe('outfield');
      });

      it('should parse HR/F78 (home run to left-center)', () => {
        const event = parseDetailedEvent('HR/F78');
        expect(event.primaryEventType).toBe('HR');
        expect(event.location.direction).toBe('left-center');
      });

      it('should parse HR/F7D (deep home run to left)', () => {
        const event = parseDetailedEvent('HR/F7D');
        expect(event.primaryEventType).toBe('HR');
        expect(event.location.depth).toBe('deep');
      });

      it('should parse HR/L7 (line drive home run)', () => {
        const event = parseDetailedEvent('HR/L7');
        expect(event.primaryEventType).toBe('HR');
        expect(event.location.trajectory).toBe('line drive');
      });
    });

    // -------------------------------------------------------------------------
    // 1.5 Groundouts (G13, G23, G43, G53, G63, etc.)
    // -------------------------------------------------------------------------
    describe('groundouts', () => {
      it('should parse G13 (pitcher to first)', () => {
        const event = parseDetailedEvent('G13');
        expect(event.primaryEventType).toBe('G');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(1);
        expect(event.fielders[1].position).toBe(3);
      });

      it('should parse G23 (catcher to first)', () => {
        const event = parseDetailedEvent('G23');
        expect(event.primaryEventType).toBe('G');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(2);
        expect(event.fielders[1].position).toBe(3);
      });

      it('should parse G3 (unassisted by first baseman)', () => {
        const event = parseDetailedEvent('G3');
        expect(event.primaryEventType).toBe('G');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(3);
        expect(event.outCount).toBe(1);
      });

      it('should parse G43 (second baseman to first)', () => {
        const event = parseDetailedEvent('G43');
        expect(event.primaryEventType).toBe('G');
        expect(event.fielders[0].position).toBe(4);
        expect(event.fielders[1].position).toBe(3);
      });

      it('should parse G53 (third baseman to first)', () => {
        const event = parseDetailedEvent('G53');
        expect(event.primaryEventType).toBe('G');
        expect(event.fielders[0].position).toBe(5);
        expect(event.fielders[1].position).toBe(3);
      });

      it('should parse G63 (shortstop to first)', () => {
        const event = parseDetailedEvent('G63');
        expect(event.primaryEventType).toBe('G');
        expect(event.isOut).toBe(true);
        expect(event.fielders.length).toBe(2);
        expect(event.fielders[0].position).toBe(6);
        expect(event.fielders[1].position).toBe(3);
      });

      it('should parse groundout with modifier', () => {
        const event = parseDetailedEvent('G63/G6M');
        expect(event.primaryEventType).toBe('G');
        expect(event.location.trajectory).toBe('ground ball');
        expect(event.location.depth).toBe('medium');
      });
    });

    // -------------------------------------------------------------------------
    // 1.6 Flyouts (F1-F9)
    // -------------------------------------------------------------------------
    describe('flyouts', () => {
      it('should parse F1 (flyout to pitcher)', () => {
        const event = parseDetailedEvent('F1');
        expect(event.primaryEventType).toBe('F');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(1);
      });

      it('should parse F2 (flyout to catcher - foul pop)', () => {
        const event = parseDetailedEvent('F2');
        expect(event.primaryEventType).toBe('F');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(2);
      });

      it('should parse F3 (flyout to first baseman)', () => {
        const event = parseDetailedEvent('F3');
        expect(event.primaryEventType).toBe('F');
        expect(event.fielders[0].position).toBe(3);
      });

      it('should parse F4 (flyout to second baseman)', () => {
        const event = parseDetailedEvent('F4');
        expect(event.primaryEventType).toBe('F');
        expect(event.fielders[0].position).toBe(4);
      });

      it('should parse F5 (flyout to third baseman)', () => {
        const event = parseDetailedEvent('F5');
        expect(event.primaryEventType).toBe('F');
        expect(event.fielders[0].position).toBe(5);
      });

      it('should parse F6 (flyout to shortstop)', () => {
        const event = parseDetailedEvent('F6');
        expect(event.primaryEventType).toBe('F');
        expect(event.fielders[0].position).toBe(6);
      });

      it('should parse F7 (flyout to left field)', () => {
        const event = parseDetailedEvent('F7');
        expect(event.primaryEventType).toBe('F');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(7);
      });

      it('should parse F8 (flyout to center field)', () => {
        const event = parseDetailedEvent('F8');
        expect(event.primaryEventType).toBe('F');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(8);
      });

      it('should parse F9 (flyout to right field)', () => {
        const event = parseDetailedEvent('F9');
        expect(event.primaryEventType).toBe('F');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(9);
      });

      it('should parse flyout with deep modifier', () => {
        const event = parseDetailedEvent('F8/F8D');
        expect(event.primaryEventType).toBe('F');
        expect(event.location.depth).toBe('deep');
      });

      it('should parse flyout with shallow modifier', () => {
        const event = parseDetailedEvent('F7/F7S');
        expect(event.primaryEventType).toBe('F');
        expect(event.location.depth).toBe('shallow');
      });
    });

    // -------------------------------------------------------------------------
    // 1.7 Lineouts (L1-L9)
    // -------------------------------------------------------------------------
    describe('lineouts', () => {
      it('should parse L1 (lineout to pitcher)', () => {
        const event = parseDetailedEvent('L1');
        expect(event.primaryEventType).toBe('L');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(1);
      });

      it('should parse L3 (lineout to first baseman)', () => {
        const event = parseDetailedEvent('L3');
        expect(event.primaryEventType).toBe('L');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(3);
      });

      it('should parse L4 (lineout to second baseman)', () => {
        const event = parseDetailedEvent('L4');
        expect(event.primaryEventType).toBe('L');
        expect(event.fielders[0].position).toBe(4);
      });

      it('should parse L5 (lineout to third baseman)', () => {
        const event = parseDetailedEvent('L5');
        expect(event.primaryEventType).toBe('L');
        expect(event.fielders[0].position).toBe(5);
      });

      it('should parse L6 (lineout to shortstop)', () => {
        const event = parseDetailedEvent('L6');
        expect(event.primaryEventType).toBe('L');
        expect(event.fielders[0].position).toBe(6);
      });

      it('should parse L7 (lineout to left field)', () => {
        const event = parseDetailedEvent('L7');
        expect(event.primaryEventType).toBe('L');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(7);
      });

      it('should parse L8 (lineout to center field)', () => {
        const event = parseDetailedEvent('L8');
        expect(event.primaryEventType).toBe('L');
        expect(event.fielders[0].position).toBe(8);
      });

      it('should parse L9 (lineout to right field)', () => {
        const event = parseDetailedEvent('L9');
        expect(event.primaryEventType).toBe('L');
        expect(event.fielders[0].position).toBe(9);
      });

      it('should parse lineout with modifier', () => {
        const event = parseDetailedEvent('L8/L8D');
        expect(event.primaryEventType).toBe('L');
        expect(event.location.trajectory).toBe('line drive');
        expect(event.location.depth).toBe('deep');
      });
    });

    // -------------------------------------------------------------------------
    // 1.8 Popouts (P1-P6)
    // -------------------------------------------------------------------------
    describe('popouts', () => {
      it('should parse P1 (popup to pitcher)', () => {
        const event = parseDetailedEvent('P1');
        expect(event.primaryEventType).toBe('P');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(1);
      });

      it('should parse P2 (popup to catcher)', () => {
        const event = parseDetailedEvent('P2');
        expect(event.primaryEventType).toBe('P');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(2);
      });

      it('should parse P3 (popup to first baseman)', () => {
        const event = parseDetailedEvent('P3');
        expect(event.primaryEventType).toBe('P');
        expect(event.fielders[0].position).toBe(3);
      });

      it('should parse P4 (popup to second baseman)', () => {
        const event = parseDetailedEvent('P4');
        expect(event.primaryEventType).toBe('P');
        expect(event.fielders[0].position).toBe(4);
      });

      it('should parse P5 (popup to third baseman)', () => {
        const event = parseDetailedEvent('P5');
        expect(event.primaryEventType).toBe('P');
        expect(event.fielders[0].position).toBe(5);
      });

      it('should parse P6 (popup to shortstop)', () => {
        const event = parseDetailedEvent('P6');
        expect(event.primaryEventType).toBe('P');
        expect(event.fielders[0].position).toBe(6);
      });

      it('should parse popup with shallow modifier', () => {
        const event = parseDetailedEvent('P6/P6S');
        expect(event.primaryEventType).toBe('P');
        expect(event.location.trajectory).toBe('popup');
        expect(event.location.depth).toBe('shallow');
      });
    });

    // -------------------------------------------------------------------------
    // 1.9 Strikeouts (K, K23, etc.)
    // -------------------------------------------------------------------------
    describe('strikeouts', () => {
      it('should parse K (basic strikeout)', () => {
        const event = parseDetailedEvent('K');
        expect(event.primaryEventType).toBe('K');
        expect(event.isOut).toBe(true);
      });

      it('should parse strikeout swinging (implied)', () => {
        const event = parseDetailedEvent('K');
        expect(event.primaryEventType).toBe('K');
        expect(event.isOut).toBe(true);
        expect(event.outCount).toBe(1);
      });
    });

    // -------------------------------------------------------------------------
    // 1.10 Walks (W, IW)
    // -------------------------------------------------------------------------
    describe('walks', () => {
      it('should parse W (walk)', () => {
        const event = parseDetailedEvent('W');
        expect(event.primaryEventType).toBe('W');
        expect(event.isOut).toBe(false);
      });

      it('should parse IW (intentional walk)', () => {
        const event = parseDetailedEvent('IW');
        expect(event.primaryEventType).toBe('IW');
        expect(event.isOut).toBe(false);
      });
    });

    // -------------------------------------------------------------------------
    // 1.11 Hit By Pitch
    // -------------------------------------------------------------------------
    describe('hit by pitch', () => {
      it('should parse HP (hit by pitch)', () => {
        const event = parseDetailedEvent('HP');
        expect(event.primaryEventType).toBe('HP');
        expect(event.isOut).toBe(false);
      });
    });

    // -------------------------------------------------------------------------
    // 1.12 Errors (E1-E9)
    // -------------------------------------------------------------------------
    describe('errors', () => {
      it('should parse E1 (error by pitcher)', () => {
        const event = parseDetailedEvent('E1');
        expect(event.primaryEventType).toBe('E');
        expect(event.isError).toBe(true);
        expect(event.fielders[0].position).toBe(1);
        expect(event.fielders[0].role).toBe('error');
      });

      it('should parse E2 (error by catcher)', () => {
        const event = parseDetailedEvent('E2');
        expect(event.primaryEventType).toBe('E');
        expect(event.isError).toBe(true);
        expect(event.fielders[0].position).toBe(2);
      });

      it('should parse E3 (error by first baseman)', () => {
        const event = parseDetailedEvent('E3');
        expect(event.primaryEventType).toBe('E');
        expect(event.isError).toBe(true);
        expect(event.fielders[0].position).toBe(3);
      });

      it('should parse E4 (error by second baseman)', () => {
        const event = parseDetailedEvent('E4');
        expect(event.primaryEventType).toBe('E');
        expect(event.isError).toBe(true);
        expect(event.fielders[0].position).toBe(4);
      });

      it('should parse E5 (error by third baseman)', () => {
        const event = parseDetailedEvent('E5');
        expect(event.primaryEventType).toBe('E');
        expect(event.isError).toBe(true);
        expect(event.fielders[0].position).toBe(5);
      });

      it('should parse E6 (error by shortstop)', () => {
        const event = parseDetailedEvent('E6');
        expect(event.primaryEventType).toBe('E');
        expect(event.isError).toBe(true);
        expect(event.fielders[0].position).toBe(6);
        expect(event.fielders[0].role).toBe('error');
      });

      it('should parse E7 (error by left fielder)', () => {
        const event = parseDetailedEvent('E7');
        expect(event.primaryEventType).toBe('E');
        expect(event.isError).toBe(true);
        expect(event.fielders[0].position).toBe(7);
      });

      it('should parse E8 (error by center fielder)', () => {
        const event = parseDetailedEvent('E8');
        expect(event.primaryEventType).toBe('E');
        expect(event.isError).toBe(true);
        expect(event.fielders[0].position).toBe(8);
      });

      it('should parse E9 (error by right fielder)', () => {
        const event = parseDetailedEvent('E9');
        expect(event.primaryEventType).toBe('E');
        expect(event.isError).toBe(true);
        expect(event.fielders[0].position).toBe(9);
      });
    });

    // -------------------------------------------------------------------------
    // 1.13 Fielder's Choice (FC1-FC9)
    // -------------------------------------------------------------------------
    describe('fielders choice', () => {
      it('should parse FC1 (fielders choice to pitcher)', () => {
        const event = parseDetailedEvent('FC1');
        expect(event.primaryEventType).toBe('FC');
        expect(event.isFieldersChoice).toBe(true);
        expect(event.fielders[0].position).toBe(1);
      });

      it('should parse FC2 (fielders choice to catcher)', () => {
        const event = parseDetailedEvent('FC2');
        expect(event.primaryEventType).toBe('FC');
        expect(event.isFieldersChoice).toBe(true);
        expect(event.fielders[0].position).toBe(2);
      });

      it('should parse FC3 (fielders choice to first baseman)', () => {
        const event = parseDetailedEvent('FC3');
        expect(event.primaryEventType).toBe('FC');
        expect(event.isFieldersChoice).toBe(true);
        expect(event.fielders[0].position).toBe(3);
      });

      it('should parse FC4 (fielders choice to second baseman)', () => {
        const event = parseDetailedEvent('FC4');
        expect(event.primaryEventType).toBe('FC');
        expect(event.isFieldersChoice).toBe(true);
        expect(event.fielders[0].position).toBe(4);
      });

      it('should parse FC5 (fielders choice to third baseman)', () => {
        const event = parseDetailedEvent('FC5');
        expect(event.primaryEventType).toBe('FC');
        expect(event.isFieldersChoice).toBe(true);
        expect(event.fielders[0].position).toBe(5);
      });

      it('should parse FC6 (fielders choice to shortstop)', () => {
        const event = parseDetailedEvent('FC6');
        expect(event.primaryEventType).toBe('FC');
        expect(event.isFieldersChoice).toBe(true);
        expect(event.fielders[0].position).toBe(6);
      });
    });

    // -------------------------------------------------------------------------
    // 1.14 Stolen Bases (SB2, SB3, SBH)
    // -------------------------------------------------------------------------
    describe('stolen bases', () => {
      it('should parse SB2 (stolen second)', () => {
        const event = parseDetailedEvent('SB2');
        expect(event.primaryEventType).toBe('SB');
        expect(event.baseRunning[0].toBase).toBe('2');
        expect(event.baseRunning[0].fromBase).toBe('1');
      });

      it('should parse SB3 (stolen third)', () => {
        const event = parseDetailedEvent('SB3');
        expect(event.primaryEventType).toBe('SB');
        expect(event.baseRunning[0].toBase).toBe('3');
        expect(event.baseRunning[0].fromBase).toBe('2');
      });

      it('should parse SBH (stolen home)', () => {
        const event = parseDetailedEvent('SBH');
        expect(event.primaryEventType).toBe('SB');
        expect(event.baseRunning[0].toBase).toBe('H');
        expect(event.baseRunning[0].fromBase).toBe('3');
      });
    });

    // -------------------------------------------------------------------------
    // 1.15 Caught Stealing (CS2, CS3, CSH)
    // -------------------------------------------------------------------------
    describe('caught stealing', () => {
      it('should parse CS2 (caught stealing second)', () => {
        const event = parseDetailedEvent('CS2');
        expect(event.primaryEventType).toBe('CS');
        expect(event.baseRunning[0].toBase).toBe('2');
        expect(event.baseRunning[0].fromBase).toBe('1');
        expect(event.baseRunning[0].isOut).toBe(true);
      });

      it('should parse CS3 (caught stealing third)', () => {
        const event = parseDetailedEvent('CS3');
        expect(event.primaryEventType).toBe('CS');
        expect(event.baseRunning[0].toBase).toBe('3');
        expect(event.baseRunning[0].fromBase).toBe('2');
        expect(event.baseRunning[0].isOut).toBe(true);
      });

      it('should parse CSH (caught stealing home)', () => {
        const event = parseDetailedEvent('CSH');
        expect(event.primaryEventType).toBe('CS');
        expect(event.baseRunning[0].toBase).toBe('H');
        expect(event.baseRunning[0].fromBase).toBe('3');
        expect(event.baseRunning[0].isOut).toBe(true);
      });
    });

    // -------------------------------------------------------------------------
    // 1.16 Pickoffs (PO1, PO2, PO3)
    // -------------------------------------------------------------------------
    describe('pickoffs', () => {
      it('should parse PO1 (pickoff at first)', () => {
        const event = parseDetailedEvent('PO1');
        expect(event.primaryEventType).toBe('PO');
        expect(event.baseRunning[0].fromBase).toBe('1');
        expect(event.baseRunning[0].isOut).toBe(true);
      });

      it('should parse PO2 (pickoff at second)', () => {
        const event = parseDetailedEvent('PO2');
        expect(event.primaryEventType).toBe('PO');
        expect(event.baseRunning[0].fromBase).toBe('2');
        expect(event.baseRunning[0].isOut).toBe(true);
      });

      it('should parse PO3 (pickoff at third)', () => {
        const event = parseDetailedEvent('PO3');
        expect(event.primaryEventType).toBe('PO');
        expect(event.baseRunning[0].fromBase).toBe('3');
        expect(event.baseRunning[0].isOut).toBe(true);
      });
    });

    // -------------------------------------------------------------------------
    // 1.17 Pickoff Caught Stealing (POCS2, POCS3, POCSH)
    // -------------------------------------------------------------------------
    describe('pickoff caught stealing', () => {
      it('should parse POCS2 (pickoff caught stealing second)', () => {
        const event = parseDetailedEvent('POCS2');
        expect(event.primaryEventType).toBe('POCS');
        expect(event.baseRunning[0].toBase).toBe('2');
        expect(event.baseRunning[0].fromBase).toBe('1');
        expect(event.baseRunning[0].isOut).toBe(true);
      });

      it('should parse POCS3 (pickoff caught stealing third)', () => {
        const event = parseDetailedEvent('POCS3');
        expect(event.primaryEventType).toBe('POCS');
        expect(event.baseRunning[0].toBase).toBe('3');
        expect(event.baseRunning[0].fromBase).toBe('2');
        expect(event.baseRunning[0].isOut).toBe(true);
      });

      it('should parse POCSH (pickoff caught stealing home)', () => {
        const event = parseDetailedEvent('POCSH');
        expect(event.primaryEventType).toBe('POCS');
        expect(event.baseRunning[0].toBase).toBe('H');
        expect(event.baseRunning[0].fromBase).toBe('3');
        expect(event.baseRunning[0].isOut).toBe(true);
      });
    });

    // -------------------------------------------------------------------------
    // 1.18 Sacrifice Hit (Bunt) Events
    // -------------------------------------------------------------------------
    describe('sacrifice hits', () => {
      it('should parse SH (basic sacrifice bunt)', () => {
        const event = parseDetailedEvent('SH');
        expect(event.primaryEventType).toBe('SH');
        expect(event.isOut).toBe(true);
        expect(event.outCount).toBe(1);
      });

      it('should parse SH1 (sacrifice bunt to pitcher)', () => {
        const event = parseDetailedEvent('SH1');
        expect(event.primaryEventType).toBe('SH');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(1);
      });

      it('should parse SH13 (sacrifice bunt, pitcher to first)', () => {
        const event = parseDetailedEvent('SH13');
        expect(event.primaryEventType).toBe('SH');
        expect(event.isOut).toBe(true);
        expect(event.fielders.length).toBe(2);
        expect(event.fielders[0].position).toBe(1);
        expect(event.fielders[1].position).toBe(3);
      });

      it('should parse SH23 (sacrifice bunt, catcher to first)', () => {
        const event = parseDetailedEvent('SH23');
        expect(event.primaryEventType).toBe('SH');
        expect(event.fielders[0].position).toBe(2);
        expect(event.fielders[1].position).toBe(3);
      });

      it('should parse SH35 (sacrifice bunt, first baseman to third)', () => {
        const event = parseDetailedEvent('SH35');
        expect(event.primaryEventType).toBe('SH');
        expect(event.fielders[0].position).toBe(3);
        expect(event.fielders[1].position).toBe(5);
      });
    });

    // -------------------------------------------------------------------------
    // 1.19 Sacrifice Fly Events
    // -------------------------------------------------------------------------
    describe('sacrifice flies', () => {
      it('should parse SF (basic sacrifice fly)', () => {
        const event = parseDetailedEvent('SF');
        expect(event.primaryEventType).toBe('SF');
        expect(event.isOut).toBe(true);
        expect(event.outCount).toBe(1);
      });

      it('should parse SF7 (sacrifice fly to left field)', () => {
        const event = parseDetailedEvent('SF7');
        expect(event.primaryEventType).toBe('SF');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(7);
      });

      it('should parse SF8 (sacrifice fly to center field)', () => {
        const event = parseDetailedEvent('SF8');
        expect(event.primaryEventType).toBe('SF');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(8);
      });

      it('should parse SF9 (sacrifice fly to right field)', () => {
        const event = parseDetailedEvent('SF9');
        expect(event.primaryEventType).toBe('SF');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(9);
      });
    });

    // -------------------------------------------------------------------------
    // 1.20 Wild Pitch, Passed Ball, Balk
    // -------------------------------------------------------------------------
    describe('miscellaneous events', () => {
      it('should parse WP (wild pitch)', () => {
        const event = parseDetailedEvent('WP');
        expect(event.primaryEventType).toBe('WP');
      });

      it('should parse PB (passed ball)', () => {
        const event = parseDetailedEvent('PB');
        expect(event.primaryEventType).toBe('PB');
      });

      it('should parse BK (balk)', () => {
        const event = parseDetailedEvent('BK');
        expect(event.primaryEventType).toBe('BK');
      });

      it('should parse NP (no play)', () => {
        const event = parseDetailedEvent('NP');
        expect(event.primaryEventType).toBe('NP');
      });
    });

    // -------------------------------------------------------------------------
    // 1.19 Double Plays
    // -------------------------------------------------------------------------
    describe('double plays', () => {
      it('should parse 643 (classic 6-4-3 double play)', () => {
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

      it('should parse 463 (4-6-3 double play)', () => {
        const event = parseDetailedEvent('463');
        expect(event.primaryEventType).toBe('G');
        expect(event.isDoublePlay).toBe(true);
        expect(event.outCount).toBe(2);
        expect(event.fielders[0].position).toBe(4);
        expect(event.fielders[1].position).toBe(6);
        expect(event.fielders[2].position).toBe(3);
      });

      it('should parse 543 (5-4-3 double play)', () => {
        const event = parseDetailedEvent('543');
        expect(event.primaryEventType).toBe('G');
        expect(event.isDoublePlay).toBe(true);
        expect(event.fielders[0].position).toBe(5);
        expect(event.fielders[1].position).toBe(4);
        expect(event.fielders[2].position).toBe(3);
      });

      it('should parse 143 (1-4-3 double play)', () => {
        const event = parseDetailedEvent('143');
        expect(event.primaryEventType).toBe('G');
        expect(event.isDoublePlay).toBe(true);
        expect(event.fielders[0].position).toBe(1);
      });

      it('should parse 163 (1-6-3 double play)', () => {
        const event = parseDetailedEvent('163');
        expect(event.primaryEventType).toBe('G');
        expect(event.isDoublePlay).toBe(true);
        expect(event.fielders[0].position).toBe(1);
        expect(event.fielders[1].position).toBe(6);
        expect(event.fielders[2].position).toBe(3);
      });

      it('should parse 453 (4-5-3 double play)', () => {
        const event = parseDetailedEvent('453');
        expect(event.primaryEventType).toBe('G');
        expect(event.isDoublePlay).toBe(true);
      });
    });

    // -------------------------------------------------------------------------
    // 1.20 Triple Plays
    // -------------------------------------------------------------------------
    describe('triple plays', () => {
      it('should parse 5643 (5-6-4-3 triple play)', () => {
        const event = parseDetailedEvent('5643');
        expect(event.primaryEventType).toBe('G');
        expect(event.isTriplePlay).toBe(true);
        expect(event.outCount).toBe(3);
        expect(event.fielders.length).toBe(4);
      });

      it('should parse 6543 (triple play)', () => {
        const event = parseDetailedEvent('6543');
        expect(event.primaryEventType).toBe('G');
        expect(event.isTriplePlay).toBe(true);
        expect(event.outCount).toBe(3);
      });
    });

    // -------------------------------------------------------------------------
    // 1.21 Fielder-to-Fielder Plays (non-DP)
    // -------------------------------------------------------------------------
    describe('fielder-to-fielder plays', () => {
      it('should parse 31 (first baseman to pitcher covering)', () => {
        const event = parseDetailedEvent('31');
        expect(event.primaryEventType).toBe('G');
        expect(event.isOut).toBe(true);
        expect(event.fielders.length).toBe(2);
        expect(event.fielders[0].position).toBe(3);
        expect(event.fielders[0].role).toBe('primary');
        expect(event.fielders[1].position).toBe(1);
        expect(event.fielders[1].role).toBe('putout');
      });

      it('should parse 41 (second baseman to pitcher covering)', () => {
        const event = parseDetailedEvent('41');
        expect(event.primaryEventType).toBe('G');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(4);
        expect(event.fielders[1].position).toBe(1);
      });

      it('should parse 54 (third baseman to second baseman)', () => {
        const event = parseDetailedEvent('54');
        expect(event.primaryEventType).toBe('G');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(5);
        expect(event.fielders[1].position).toBe(4);
      });
    });

    // -------------------------------------------------------------------------
    // 1.22 Single Fielder Plays (unassisted outs)
    // -------------------------------------------------------------------------
    describe('single fielder plays', () => {
      it('should parse 7 (flyout to left fielder)', () => {
        const event = parseDetailedEvent('7');
        expect(event.primaryEventType).toBe('F');
        expect(event.isOut).toBe(true);
        expect(event.outCount).toBe(1);
        expect(event.fielders[0].position).toBe(7);
      });

      it('should parse 8 (flyout to center fielder)', () => {
        const event = parseDetailedEvent('8');
        expect(event.primaryEventType).toBe('F');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(8);
      });

      it('should parse 9 (flyout to right fielder)', () => {
        const event = parseDetailedEvent('9');
        expect(event.primaryEventType).toBe('F');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(9);
      });

      it('should parse 3 (unassisted groundout to first baseman)', () => {
        const event = parseDetailedEvent('3');
        expect(event.primaryEventType).toBe('G');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(3);
      });

      it('should parse 4 (unassisted by second baseman)', () => {
        const event = parseDetailedEvent('4');
        expect(event.primaryEventType).toBe('G');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(4);
      });

      it('should parse 5 (unassisted by third baseman)', () => {
        const event = parseDetailedEvent('5');
        expect(event.primaryEventType).toBe('G');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(5);
      });

      it('should parse 6 (unassisted by shortstop)', () => {
        const event = parseDetailedEvent('6');
        expect(event.primaryEventType).toBe('G');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(6);
      });
    });

    // -------------------------------------------------------------------------
    // 1.23 Modifier-based Event Type Override
    // -------------------------------------------------------------------------
    describe('modifier event type override', () => {
      it('should parse 7/F7D (flyout to deep left)', () => {
        const event = parseDetailedEvent('7/F7D');
        expect(event.primaryEventType).toBe('F');
        expect(event.isOut).toBe(true);
        expect(event.fielders[0].position).toBe(7);
        expect(event.location.trajectory).toBe('fly ball');
        expect(event.location.direction).toBe('left');
        expect(event.location.depth).toBe('deep');
      });

      it('should parse 5/L5 (lineout to third)', () => {
        const event = parseDetailedEvent('5/L5');
        expect(event.primaryEventType).toBe('L');
        expect(event.isOut).toBe(true);
        expect(event.location.trajectory).toBe('line drive');
      });

      it('should parse 6/P6S (popup to shortstop shallow)', () => {
        const event = parseDetailedEvent('6/P6S');
        expect(event.primaryEventType).toBe('P');
        expect(event.isOut).toBe(true);
        expect(event.location.trajectory).toBe('popup');
        expect(event.location.depth).toBe('shallow');
      });

      it('should parse 4/G4M (groundout to second medium depth)', () => {
        const event = parseDetailedEvent('4/G4M');
        expect(event.primaryEventType).toBe('G');
        expect(event.isOut).toBe(true);
        expect(event.location.trajectory).toBe('ground ball');
        expect(event.location.depth).toBe('medium');
      });
    });

    // -------------------------------------------------------------------------
    // 1.24 Base Advancements
    // -------------------------------------------------------------------------
    describe('base advancements', () => {
      it('should parse S8.1-3;2-H', () => {
        const event = parseDetailedEvent('S8.1-3;2-H');
        expect(event.primaryEventType).toBe('S');
        expect(event.baseRunning.length).toBe(2);
        expect(event.baseRunning[0].fromBase).toBe('1');
        expect(event.baseRunning[0].toBase).toBe('3');
        expect(event.baseRunning[1].fromBase).toBe('2');
        expect(event.baseRunning[1].toBase).toBe('H');
      });

      it('should parse D7.1-H;2-H', () => {
        const event = parseDetailedEvent('D7.1-H;2-H');
        expect(event.primaryEventType).toBe('D');
        expect(event.baseRunning.length).toBe(2);
        expect(event.baseRunning[0].toBase).toBe('H');
        expect(event.baseRunning[1].toBase).toBe('H');
      });

      it('should parse HR.1-H;2-H;3-H', () => {
        const event = parseDetailedEvent('HR.1-H;2-H;3-H');
        expect(event.primaryEventType).toBe('HR');
        expect(event.baseRunning.length).toBe(3);
      });
    });

    // -------------------------------------------------------------------------
    // 1.25 RBI Information
    // -------------------------------------------------------------------------
    describe('RBI information', () => {
      it('should parse S8+1 (single with 1 RBI)', () => {
        const event = parseDetailedEvent('S8+1');
        expect(event.primaryEventType).toBe('S');
        expect(event.rbi).toBe(1);
      });

      it('should parse D7+2 (double with 2 RBI)', () => {
        const event = parseDetailedEvent('D7+2');
        expect(event.primaryEventType).toBe('D');
        expect(event.rbi).toBe(2);
      });

      it('should parse HR7+4 (grand slam to left)', () => {
        const event = parseDetailedEvent('HR7+4');
        expect(event.primaryEventType).toBe('HR');
        expect(event.rbi).toBe(4);
        expect(event.fielders[0].position).toBe(7);
      });
    });

    // -------------------------------------------------------------------------
    // 1.26 Edge Cases
    // -------------------------------------------------------------------------
    describe('edge cases', () => {
      it('should handle empty string', () => {
        const event = parseDetailedEvent('');
        expect(event.primaryEventType).toBe('');
        expect(event.rawEvent).toBe('');
      });

      it('should handle whitespace', () => {
        const event = parseDetailedEvent('   ');
        expect(event.primaryEventType).toBe('');
      });

      it('should preserve raw event', () => {
        const event = parseDetailedEvent('S8/G4M.3-H;2-H;1-3');
        expect(event.rawEvent).toBe('S8/G4M.3-H;2-H;1-3');
      });
    });
  });

  // =============================================================================
  // SECTION 2: translateDetailedEvent Tests
  // =============================================================================
  describe('translateDetailedEvent', () => {
    // -------------------------------------------------------------------------
    // 2.1 Singles Translation
    // -------------------------------------------------------------------------
    describe('singles translation', () => {
      it('should translate S7 to left field', () => {
        const event = parseDetailedEvent('S7');
        expect(translateDetailedEvent(event)).toBe('Single to left field');
      });

      it('should translate S8 to center field', () => {
        const event = parseDetailedEvent('S8');
        expect(translateDetailedEvent(event)).toBe('Single to center field');
      });

      it('should translate S9 to right field', () => {
        const event = parseDetailedEvent('S9');
        expect(translateDetailedEvent(event)).toBe('Single to right field');
      });

      it('should translate S3 (infield single)', () => {
        const event = parseDetailedEvent('S3');
        expect(translateDetailedEvent(event)).toBe('Single to first baseman');
      });

      it('should translate S6 (infield single)', () => {
        const event = parseDetailedEvent('S6');
        expect(translateDetailedEvent(event)).toBe('Single to shortstop');
      });
    });

    // -------------------------------------------------------------------------
    // 2.2 Doubles Translation
    // -------------------------------------------------------------------------
    describe('doubles translation', () => {
      it('should translate D7 to left field', () => {
        const event = parseDetailedEvent('D7');
        expect(translateDetailedEvent(event)).toBe('Double to left field');
      });

      it('should translate D8 to center field', () => {
        const event = parseDetailedEvent('D8');
        expect(translateDetailedEvent(event)).toBe('Double to center field');
      });

      it('should translate D9 to right field', () => {
        const event = parseDetailedEvent('D9');
        expect(translateDetailedEvent(event)).toBe('Double to right field');
      });

      it('should translate DGR (ground rule double)', () => {
        const event = parseDetailedEvent('DGR');
        expect(translateDetailedEvent(event)).toBe('Ground rule double');
      });
    });

    // -------------------------------------------------------------------------
    // 2.3 Triples Translation
    // -------------------------------------------------------------------------
    describe('triples translation', () => {
      it('should translate T7 to left field', () => {
        const event = parseDetailedEvent('T7');
        expect(translateDetailedEvent(event)).toBe('Triple to left field');
      });

      it('should translate T8 to center field', () => {
        const event = parseDetailedEvent('T8');
        expect(translateDetailedEvent(event)).toBe('Triple to center field');
      });

      it('should translate T9 to right field', () => {
        const event = parseDetailedEvent('T9');
        expect(translateDetailedEvent(event)).toBe('Triple to right field');
      });
    });

    // -------------------------------------------------------------------------
    // 2.4 Home Runs Translation
    // -------------------------------------------------------------------------
    describe('home runs translation', () => {
      it('should translate HR/F7 to left field', () => {
        const event = parseDetailedEvent('HR/F7');
        expect(translateDetailedEvent(event)).toBe('Home run to left field');
      });

      it('should translate HR/F8 to center field', () => {
        const event = parseDetailedEvent('HR/F8');
        expect(translateDetailedEvent(event)).toBe('Home run to center field');
      });

      it('should translate HR/F9 to right field', () => {
        const event = parseDetailedEvent('HR/F9');
        expect(translateDetailedEvent(event)).toBe('Home run to right field');
      });

      it('should translate HR/F78 to left-center', () => {
        const event = parseDetailedEvent('HR/F78');
        expect(translateDetailedEvent(event)).toBe('Home run to left-center field');
      });
    });

    // -------------------------------------------------------------------------
    // 2.5 Outs Translation
    // -------------------------------------------------------------------------
    describe('outs translation', () => {
      it('should translate groundout G63', () => {
        const event = parseDetailedEvent('G63');
        expect(translateDetailedEvent(event)).toBe('Grounded into a 6-3 double play');
      });

      it('should translate flyout F8', () => {
        const event = parseDetailedEvent('F8');
        expect(translateDetailedEvent(event)).toBe('Flyout to center fielder');
      });

      it('should translate flyout F7', () => {
        const event = parseDetailedEvent('F7');
        expect(translateDetailedEvent(event)).toBe('Flyout to left fielder');
      });

      it('should translate flyout F9', () => {
        const event = parseDetailedEvent('F9');
        expect(translateDetailedEvent(event)).toBe('Flyout to right fielder');
      });

      it('should translate lineout L5', () => {
        const event = parseDetailedEvent('L5');
        expect(translateDetailedEvent(event)).toBe('Lineout to third baseman');
      });

      it('should translate popup P6', () => {
        const event = parseDetailedEvent('P6');
        expect(translateDetailedEvent(event)).toBe('Popup to shortstop');
      });

      it('should translate strikeout K', () => {
        const event = parseDetailedEvent('K');
        expect(translateDetailedEvent(event)).toBe('Struck out');
      });
    });

    // -------------------------------------------------------------------------
    // 2.6 Walks and HBP Translation
    // -------------------------------------------------------------------------
    describe('walks and HBP translation', () => {
      it('should translate W (walk)', () => {
        const event = parseDetailedEvent('W');
        expect(translateDetailedEvent(event)).toBe('Walk');
      });

      it('should translate IW (intentional walk)', () => {
        const event = parseDetailedEvent('IW');
        expect(translateDetailedEvent(event)).toBe('Intentional walk');
      });

      it('should translate HP (hit by pitch)', () => {
        const event = parseDetailedEvent('HP');
        expect(translateDetailedEvent(event)).toBe('Hit by pitch');
      });
    });

    // -------------------------------------------------------------------------
    // 2.7 Errors Translation
    // -------------------------------------------------------------------------
    describe('errors translation', () => {
      it('should translate E1 (error by pitcher)', () => {
        const event = parseDetailedEvent('E1');
        expect(translateDetailedEvent(event)).toBe('Error by pitcher');
      });

      it('should translate E2 (error by catcher)', () => {
        const event = parseDetailedEvent('E2');
        expect(translateDetailedEvent(event)).toBe('Error by catcher');
      });

      it('should translate E3 (error by first baseman)', () => {
        const event = parseDetailedEvent('E3');
        expect(translateDetailedEvent(event)).toBe('Error by first baseman');
      });

      it('should translate E4 (error by second baseman)', () => {
        const event = parseDetailedEvent('E4');
        expect(translateDetailedEvent(event)).toBe('Error by second baseman');
      });

      it('should translate E5 (error by third baseman)', () => {
        const event = parseDetailedEvent('E5');
        expect(translateDetailedEvent(event)).toBe('Error by third baseman');
      });

      it('should translate E6 (error by shortstop)', () => {
        const event = parseDetailedEvent('E6');
        expect(translateDetailedEvent(event)).toBe('Error by shortstop');
      });

      it('should translate E7 (error by left fielder)', () => {
        const event = parseDetailedEvent('E7');
        expect(translateDetailedEvent(event)).toBe('Error by left fielder');
      });

      it('should translate E8 (error by center fielder)', () => {
        const event = parseDetailedEvent('E8');
        expect(translateDetailedEvent(event)).toBe('Error by center fielder');
      });

      it('should translate E9 (error by right fielder)', () => {
        const event = parseDetailedEvent('E9');
        expect(translateDetailedEvent(event)).toBe('Error by right fielder');
      });
    });

    // -------------------------------------------------------------------------
    // 2.8 Fielder's Choice Translation
    // -------------------------------------------------------------------------
    describe('fielders choice translation', () => {
      it('should translate FC5 (fielders choice to third)', () => {
        const event = parseDetailedEvent('FC5');
        expect(translateDetailedEvent(event)).toBe('Reached on a fielder\'s choice to third baseman');
      });

      it('should translate FC6 (fielders choice to shortstop)', () => {
        const event = parseDetailedEvent('FC6');
        expect(translateDetailedEvent(event)).toBe('Reached on a fielder\'s choice to shortstop');
      });

      it('should translate FC4 (fielders choice to second)', () => {
        const event = parseDetailedEvent('FC4');
        expect(translateDetailedEvent(event)).toBe('Reached on a fielder\'s choice to second baseman');
      });
    });

    // -------------------------------------------------------------------------
    // 2.9 Base Running Translation
    // -------------------------------------------------------------------------
    describe('base running translation', () => {
      it('should translate SB2 (stolen second)', () => {
        const event = parseDetailedEvent('SB2');
        expect(translateDetailedEvent(event)).toBe('Stole second base');
      });

      it('should translate SB3 (stolen third)', () => {
        const event = parseDetailedEvent('SB3');
        expect(translateDetailedEvent(event)).toBe('Stole third base');
      });

      it('should translate SBH (stolen home)', () => {
        const event = parseDetailedEvent('SBH');
        expect(translateDetailedEvent(event)).toBe('Stole home');
      });

      it('should translate CS2 (caught stealing second)', () => {
        const event = parseDetailedEvent('CS2');
        expect(translateDetailedEvent(event)).toBe('Caught stealing second base');
      });

      it('should translate CS3 (caught stealing third)', () => {
        const event = parseDetailedEvent('CS3');
        expect(translateDetailedEvent(event)).toBe('Caught stealing third base');
      });

      it('should translate CSH (caught stealing home)', () => {
        const event = parseDetailedEvent('CSH');
        expect(translateDetailedEvent(event)).toBe('Caught stealing home');
      });

      it('should translate PO1 (picked off first)', () => {
        const event = parseDetailedEvent('PO1');
        expect(translateDetailedEvent(event)).toBe('Picked off first base');
      });

      it('should translate PO2 (picked off second)', () => {
        const event = parseDetailedEvent('PO2');
        expect(translateDetailedEvent(event)).toBe('Picked off second base');
      });

      it('should translate PO3 (picked off third)', () => {
        const event = parseDetailedEvent('PO3');
        expect(translateDetailedEvent(event)).toBe('Picked off third base');
      });

      it('should translate POCS2 (pickoff caught stealing second)', () => {
        const event = parseDetailedEvent('POCS2');
        expect(translateDetailedEvent(event)).toBe('Picked off and caught stealing second base');
      });

      it('should translate POCS3 (pickoff caught stealing third)', () => {
        const event = parseDetailedEvent('POCS3');
        expect(translateDetailedEvent(event)).toBe('Picked off and caught stealing third base');
      });
    });

    // -------------------------------------------------------------------------
    // 2.10 Miscellaneous Events Translation
    // -------------------------------------------------------------------------
    describe('miscellaneous events translation', () => {
      it('should translate WP (wild pitch)', () => {
        const event = parseDetailedEvent('WP');
        expect(translateDetailedEvent(event)).toBe('Wild pitch');
      });

      it('should translate PB (passed ball)', () => {
        const event = parseDetailedEvent('PB');
        expect(translateDetailedEvent(event)).toBe('Passed ball');
      });

      it('should translate BK (balk)', () => {
        const event = parseDetailedEvent('BK');
        expect(translateDetailedEvent(event)).toBe('Balk');
      });

      it('should translate NP (no play)', () => {
        const event = parseDetailedEvent('NP');
        expect(translateDetailedEvent(event)).toBe('No play');
      });
    });

    // -------------------------------------------------------------------------
    // 2.11 Sacrifice Hit Translation
    // -------------------------------------------------------------------------
    describe('sacrifice hit translation', () => {
      it('should translate SH (basic sacrifice bunt)', () => {
        const event = parseDetailedEvent('SH');
        expect(translateDetailedEvent(event)).toBe('Sacrifice bunt');
      });

      it('should translate SH13 (sacrifice bunt, pitcher to first)', () => {
        const event = parseDetailedEvent('SH13');
        expect(translateDetailedEvent(event)).toBe('Sacrifice bunt, pitcher to first baseman');
      });

      it('should translate SH23 (sacrifice bunt, catcher to first)', () => {
        const event = parseDetailedEvent('SH23');
        expect(translateDetailedEvent(event)).toBe('Sacrifice bunt, catcher to first baseman');
      });

      it('should translate SH35 (sacrifice bunt, first baseman to third)', () => {
        const event = parseDetailedEvent('SH35');
        expect(translateDetailedEvent(event)).toBe('Sacrifice bunt, first baseman to third baseman');
      });
    });

    // -------------------------------------------------------------------------
    // 2.12 Sacrifice Fly Translation
    // -------------------------------------------------------------------------
    describe('sacrifice fly translation', () => {
      it('should translate SF (basic sacrifice fly)', () => {
        const event = parseDetailedEvent('SF');
        expect(translateDetailedEvent(event)).toBe('Sacrifice fly');
      });

      it('should translate SF7 (sacrifice fly to left)', () => {
        const event = parseDetailedEvent('SF7');
        expect(translateDetailedEvent(event)).toBe('Sacrifice fly to left fielder');
      });

      it('should translate SF8 (sacrifice fly to center)', () => {
        const event = parseDetailedEvent('SF8');
        expect(translateDetailedEvent(event)).toBe('Sacrifice fly to center fielder');
      });

      it('should translate SF9 (sacrifice fly to right)', () => {
        const event = parseDetailedEvent('SF9');
        expect(translateDetailedEvent(event)).toBe('Sacrifice fly to right fielder');
      });
    });

    // -------------------------------------------------------------------------
    // 2.13 Double Play Translation
    // -------------------------------------------------------------------------
    describe('double play translation', () => {
      it('should translate 643 (6-4-3 double play)', () => {
        const event = parseDetailedEvent('643');
        expect(translateDetailedEvent(event)).toBe('Grounded into a 6-4-3 double play');
      });

      it('should translate 463 (4-6-3 double play)', () => {
        const event = parseDetailedEvent('463');
        expect(translateDetailedEvent(event)).toBe('Grounded into a 4-6-3 double play');
      });

      it('should translate 543 (5-4-3 double play)', () => {
        const event = parseDetailedEvent('543');
        expect(translateDetailedEvent(event)).toBe('Grounded into a 5-4-3 double play');
      });
    });

    // -------------------------------------------------------------------------
    // 2.12 Triple Play Translation
    // -------------------------------------------------------------------------
    describe('triple play translation', () => {
      it('should translate 5643 triple play', () => {
        const event = parseDetailedEvent('5643');
        expect(translateDetailedEvent(event)).toBe('Grounded into a 5-6-4-3 triple play');
      });
    });

    // -------------------------------------------------------------------------
    // 2.13 Fielder-to-Fielder Play Translation
    // -------------------------------------------------------------------------
    describe('fielder-to-fielder play translation', () => {
      it('should translate 31 (first baseman to pitcher)', () => {
        const event = parseDetailedEvent('31');
        expect(translateDetailedEvent(event)).toBe('Groundout to first baseman, throw to pitcher');
      });

      it('should translate 41 (second baseman to pitcher)', () => {
        const event = parseDetailedEvent('41');
        expect(translateDetailedEvent(event)).toBe('Groundout to second baseman, throw to pitcher');
      });

      it('should translate 54 (third baseman to second baseman)', () => {
        const event = parseDetailedEvent('54');
        expect(translateDetailedEvent(event)).toBe('Groundout to third baseman, throw to second baseman');
      });
    });

    // -------------------------------------------------------------------------
    // 2.14 RBI in Translation
    // -------------------------------------------------------------------------
    describe('RBI in translation', () => {
      it('should include 1 RBI', () => {
        const event = parseDetailedEvent('S8+1');
        expect(translateDetailedEvent(event)).toBe('Single to center field, 1 RBI');
      });

      it('should include 2 RBI', () => {
        const event = parseDetailedEvent('D7+2');
        expect(translateDetailedEvent(event)).toBe('Double to left field, 2 RBI');
      });

      it('should include 3 RBI', () => {
        const event = parseDetailedEvent('T8+3');
        expect(translateDetailedEvent(event)).toBe('Triple to center field, 3 RBI');
      });

      it('should include 4 RBI (grand slam)', () => {
        const event = parseDetailedEvent('HR7+4');
        expect(translateDetailedEvent(event)).toBe('Home run to left field, 4 RBI');
      });
    });

    // -------------------------------------------------------------------------
    // 2.15 Single Fielder Plays Translation
    // -------------------------------------------------------------------------
    describe('single fielder plays translation', () => {
      it('should translate 7 (flyout to left fielder)', () => {
        const event = parseDetailedEvent('7');
        expect(translateDetailedEvent(event)).toBe('Flyout to left fielder');
      });

      it('should translate 8 (flyout to center fielder)', () => {
        const event = parseDetailedEvent('8');
        expect(translateDetailedEvent(event)).toBe('Flyout to center fielder');
      });

      it('should translate 9 (flyout to right fielder)', () => {
        const event = parseDetailedEvent('9');
        expect(translateDetailedEvent(event)).toBe('Flyout to right fielder');
      });

      it('should translate 7/F7D (deep flyout)', () => {
        const event = parseDetailedEvent('7/F7D');
        expect(translateDetailedEvent(event)).toBe('Flyout to left fielder');
      });

      it('should translate 5/L5 (lineout to third)', () => {
        const event = parseDetailedEvent('5/L5');
        expect(translateDetailedEvent(event)).toBe('Lineout to third baseman');
      });

      it('should translate 6/P6S (popup to shortstop)', () => {
        const event = parseDetailedEvent('6/P6S');
        expect(translateDetailedEvent(event)).toBe('Popup to shortstop');
      });
    });
  });

  // =============================================================================
  // SECTION 3: translateEvent Integration Tests
  // =============================================================================
  describe('translateEvent', () => {
    // -------------------------------------------------------------------------
    // 3.1 Singles with Various Modifiers
    // -------------------------------------------------------------------------
    describe('singles with modifiers', () => {
      it('should translate S8/G4M.3-H;2-H;1-3', () => {
        expect(translateEvent('S8/G4M.3-H;2-H;1-3')).toBe('Single to center field');
      });

      it('should translate S8', () => {
        expect(translateEvent('S8')).toBe('Single to center field');
      });

      it('should translate S7', () => {
        expect(translateEvent('S7')).toBe('Single to left field');
      });

      it('should translate S9', () => {
        expect(translateEvent('S9')).toBe('Single to right field');
      });

      it('should translate S7/G5.3-H;1-2', () => {
        expect(translateEvent('S7/G5.3-H;1-2')).toBe('Single to left field');
      });

      it('should translate S9/L9S.2-H;1-3', () => {
        expect(translateEvent('S9/L9S.2-H;1-3')).toBe('Single to right field');
      });

      it('should translate S8+2.3-H;2-H;1-3', () => {
        expect(translateEvent('S8+2.3-H;2-H;1-3')).toBe('Single to center field, 2 RBI');
      });
    });

    // -------------------------------------------------------------------------
    // 3.2 Doubles with Various Modifiers
    // -------------------------------------------------------------------------
    describe('doubles with modifiers', () => {
      it('should translate D8', () => {
        expect(translateEvent('D8')).toBe('Double to center field');
      });

      it('should translate D7', () => {
        expect(translateEvent('D7')).toBe('Double to left field');
      });

      it('should translate D9', () => {
        expect(translateEvent('D9')).toBe('Double to right field');
      });

      it('should translate D7/L7L.2-H;1-3', () => {
        expect(translateEvent('D7/L7L.2-H;1-3')).toBe('Double to left field');
      });

      it('should translate DGR', () => {
        expect(translateEvent('DGR')).toBe('Ground rule double');
      });
    });

    // -------------------------------------------------------------------------
    // 3.3 Triples
    // -------------------------------------------------------------------------
    describe('triples', () => {
      it('should translate T9', () => {
        expect(translateEvent('T9')).toBe('Triple to right field');
      });

      it('should translate T7', () => {
        expect(translateEvent('T7')).toBe('Triple to left field');
      });

      it('should translate T8', () => {
        expect(translateEvent('T8')).toBe('Triple to center field');
      });
    });

    // -------------------------------------------------------------------------
    // 3.4 Home Runs
    // -------------------------------------------------------------------------
    describe('home runs', () => {
      it('should translate HR/F78', () => {
        expect(translateEvent('HR/F78')).toBe('Home run to left-center field');
      });

      it('should translate HR/F7LD', () => {
        expect(translateEvent('HR/F7LD')).toBe('Home run to left field');
      });

      it('should translate HR/F7D.1-H;2-H', () => {
        expect(translateEvent('HR/F7D.1-H;2-H')).toBe('Home run to left field');
      });

      it('should translate HR/F7', () => {
        expect(translateEvent('HR/F7')).toBe('Home run to left field');
      });

      it('should translate HR/F8', () => {
        expect(translateEvent('HR/F8')).toBe('Home run to center field');
      });

      it('should translate HR/F9', () => {
        expect(translateEvent('HR/F9')).toBe('Home run to right field');
      });
    });

    // -------------------------------------------------------------------------
    // 3.5 Strikeouts and Walks
    // -------------------------------------------------------------------------
    describe('strikeouts and walks', () => {
      it('should translate K', () => {
        expect(translateEvent('K')).toBe('Struck out');
      });

      it('should translate W', () => {
        expect(translateEvent('W')).toBe('Walk');
      });

      it('should translate IW', () => {
        expect(translateEvent('IW')).toBe('Intentional walk');
      });

      it('should translate HP', () => {
        expect(translateEvent('HP')).toBe('Hit by pitch');
      });
    });

    // -------------------------------------------------------------------------
    // 3.6 Errors
    // -------------------------------------------------------------------------
    describe('errors', () => {
      it('should translate E6', () => {
        expect(translateEvent('E6')).toBe('Error by shortstop');
      });

      it('should translate E3', () => {
        expect(translateEvent('E3')).toBe('Error by first baseman');
      });

      it('should translate E5', () => {
        expect(translateEvent('E5')).toBe('Error by third baseman');
      });

      it('should translate E7', () => {
        expect(translateEvent('E7')).toBe('Error by left fielder');
      });

      it('should translate E8', () => {
        expect(translateEvent('E8')).toBe('Error by center fielder');
      });

      it('should translate E9', () => {
        expect(translateEvent('E9')).toBe('Error by right fielder');
      });
    });

    // -------------------------------------------------------------------------
    // 3.7 Fielder's Choice
    // -------------------------------------------------------------------------
    describe('fielders choice', () => {
      it('should translate FC5', () => {
        expect(translateEvent('FC5')).toBe('Reached on a fielder\'s choice to third baseman');
      });

      it('should translate FC6', () => {
        expect(translateEvent('FC6')).toBe('Reached on a fielder\'s choice to shortstop');
      });

      it('should translate FC4', () => {
        expect(translateEvent('FC4')).toBe('Reached on a fielder\'s choice to second baseman');
      });
    });

    // -------------------------------------------------------------------------
    // 3.8 Base Running
    // -------------------------------------------------------------------------
    describe('base running', () => {
      it('should translate SB2', () => {
        expect(translateEvent('SB2')).toBe('Stole second base');
      });

      it('should translate SB3', () => {
        expect(translateEvent('SB3')).toBe('Stole third base');
      });

      it('should translate SBH', () => {
        expect(translateEvent('SBH')).toBe('Stole home');
      });

      it('should translate CS2', () => {
        expect(translateEvent('CS2')).toBe('Caught stealing second base');
      });

      it('should translate CS3', () => {
        expect(translateEvent('CS3')).toBe('Caught stealing third base');
      });

      it('should translate CSH', () => {
        expect(translateEvent('CSH')).toBe('Caught stealing home');
      });

      it('should translate PO1', () => {
        expect(translateEvent('PO1')).toBe('Picked off first base');
      });

      it('should translate PO2', () => {
        expect(translateEvent('PO2')).toBe('Picked off second base');
      });

      it('should translate PO3', () => {
        expect(translateEvent('PO3')).toBe('Picked off third base');
      });
    });

    // -------------------------------------------------------------------------
    // 3.9 Miscellaneous
    // -------------------------------------------------------------------------
    describe('miscellaneous', () => {
      it('should translate WP', () => {
        expect(translateEvent('WP')).toBe('Wild pitch');
      });

      it('should translate PB', () => {
        expect(translateEvent('PB')).toBe('Passed ball');
      });

      it('should translate BK', () => {
        expect(translateEvent('BK')).toBe('Balk');
      });

      it('should translate NP', () => {
        expect(translateEvent('NP')).toBe('No play');
      });
    });

    // -------------------------------------------------------------------------
    // 3.10 Groundouts
    // -------------------------------------------------------------------------
    describe('groundouts', () => {
      it('should translate G63/G6M', () => {
        expect(translateEvent('G63/G6M')).toBe('Grounded into a 6-3 double play');
      });

      it('should translate 31/G3.2-3', () => {
        expect(translateEvent('31/G3.2-3')).toBe('Groundout to first baseman, throw to pitcher');
      });

      it('should translate G53', () => {
        expect(translateEvent('G53')).toBe('Grounded into a 5-3 double play');
      });

      it('should translate G43', () => {
        expect(translateEvent('G43')).toBe('Grounded into a 4-3 double play');
      });
    });

    // -------------------------------------------------------------------------
    // 3.11 Flyouts
    // -------------------------------------------------------------------------
    describe('flyouts', () => {
      it('should translate single fielder number 7', () => {
        expect(translateEvent('7')).toBe('Flyout to left fielder');
      });

      it('should translate single fielder number 8', () => {
        expect(translateEvent('8')).toBe('Flyout to center fielder');
      });

      it('should translate single fielder number 9', () => {
        expect(translateEvent('9')).toBe('Flyout to right fielder');
      });

      it('should translate 8/F8D', () => {
        expect(translateEvent('8/F8D')).toBe('Flyout to center fielder');
      });

      it('should translate F7', () => {
        expect(translateEvent('F7')).toBe('Flyout to left fielder');
      });

      it('should translate F8', () => {
        expect(translateEvent('F8')).toBe('Flyout to center fielder');
      });

      it('should translate F9', () => {
        expect(translateEvent('F9')).toBe('Flyout to right fielder');
      });
    });

    // -------------------------------------------------------------------------
    // 3.12 Lineouts and Popouts
    // -------------------------------------------------------------------------
    describe('lineouts and popouts', () => {
      it('should translate 5/L5', () => {
        expect(translateEvent('5/L5')).toBe('Lineout to third baseman');
      });

      it('should translate 6/P6S', () => {
        expect(translateEvent('6/P6S')).toBe('Popup to shortstop');
      });

      it('should translate L7', () => {
        expect(translateEvent('L7')).toBe('Lineout to left fielder');
      });

      it('should translate L8', () => {
        expect(translateEvent('L8')).toBe('Lineout to center fielder');
      });

      it('should translate P4', () => {
        expect(translateEvent('P4')).toBe('Popup to second baseman');
      });
    });

    // -------------------------------------------------------------------------
    // 3.13 Double Plays
    // -------------------------------------------------------------------------
    describe('double plays', () => {
      it('should translate 643/G6M', () => {
        expect(translateEvent('643/G6M')).toBe('Grounded into a 6-4-3 double play');
      });

      it('should translate 643', () => {
        expect(translateEvent('643')).toBe('Grounded into a 6-4-3 double play');
      });

      it('should translate 463', () => {
        expect(translateEvent('463')).toBe('Grounded into a 4-6-3 double play');
      });

      it('should translate 543', () => {
        expect(translateEvent('543')).toBe('Grounded into a 5-4-3 double play');
      });

      it('should translate 143', () => {
        expect(translateEvent('143')).toBe('Grounded into a 1-4-3 double play');
      });
    });

    // -------------------------------------------------------------------------
    // 3.14 Triple Plays
    // -------------------------------------------------------------------------
    describe('triple plays', () => {
      it('should translate 5643', () => {
        expect(translateEvent('5643')).toBe('Grounded into a 5-6-4-3 triple play');
      });
    });

    // -------------------------------------------------------------------------
    // 3.15 Sacrifice Hits and Flies
    // -------------------------------------------------------------------------
    describe('sacrifice hits and flies', () => {
      it('should translate SH', () => {
        expect(translateEvent('SH')).toBe('Sacrifice bunt');
      });

      it('should translate SH13', () => {
        expect(translateEvent('SH13')).toBe('Sacrifice bunt, pitcher to first baseman');
      });

      it('should translate SH23', () => {
        expect(translateEvent('SH23')).toBe('Sacrifice bunt, catcher to first baseman');
      });

      it('should translate SH/BG', () => {
        expect(translateEvent('SH/BG')).toBe('Sacrifice bunt');
      });

      it('should translate SF', () => {
        expect(translateEvent('SF')).toBe('Sacrifice fly');
      });

      it('should translate SF7', () => {
        expect(translateEvent('SF7')).toBe('Sacrifice fly to left fielder');
      });

      it('should translate SF8', () => {
        expect(translateEvent('SF8')).toBe('Sacrifice fly to center fielder');
      });

      it('should translate SF9', () => {
        expect(translateEvent('SF9')).toBe('Sacrifice fly to right fielder');
      });

      it('should translate SF/F9', () => {
        expect(translateEvent('SF/F9')).toBe('Sacrifice fly to right fielder');
      });

      it('should translate SF9.3-H', () => {
        expect(translateEvent('SF9.3-H')).toBe('Sacrifice fly to right fielder');
      });
    });

    // -------------------------------------------------------------------------
    // 3.16 Complex Events
    // -------------------------------------------------------------------------
    describe('complex events', () => {
      it('should translate complex single with advancements', () => {
        expect(translateEvent('S8.1-3;2-H')).toBe('Single to center field');
      });

      it('should translate complex double with advancements', () => {
        expect(translateEvent('D7.1-H;2-H')).toBe('Double to left field');
      });

      it('should translate complex home run with advancements', () => {
        expect(translateEvent('HR.1-H;2-H;3-H')).toBe('Home run');
      });
    });
  });
});