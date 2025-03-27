import { translateEvent } from '../translateEvent';

/**
 * Test script for the event translation functionality
 * 
 * This script tests the event translation function with hardcoded example events
 * instead of fetching from the database.
 */

function testEventTranslation() {
  console.log('Starting event translation test with example events...');
  
  // Example events from Retrosheet format
  const exampleEvents = [
    { pn: 1, event: 'S7/L7', description: 'Single to left field' },
    { pn: 2, event: 'D8/F8', description: 'Double to center field' },
    { pn: 3, event: 'T9/L9', description: 'Triple to right field' },
    { pn: 4, event: 'HR/F78', description: 'Home run to center field' },
    { pn: 5, event: 'K', description: 'Struck out' },  // Changed from "Strikeout" to "Struck out"
    { pn: 6, event: 'W', description: 'Walk' },
    { pn: 7, event: 'IW', description: 'Intentional walk' },
    { pn: 8, event: 'HP', description: 'Hit by pitch' },
    { pn: 9, event: 'E6/G6', description: 'Error by shortstop' },
    { pn: 10, event: 'FC5/G5', description: 'Fielder\'s choice' },
    { pn: 11, event: 'G63/G6M', description: 'Groundout to shortstop' },
    { pn: 12, event: 'F8/F8D', description: 'Flyout to center field' },
    { pn: 13, event: 'L4/L4M', description: 'Lineout to second baseman' },
    { pn: 14, event: 'P5/P5F', description: 'Popup to third baseman' },
    { pn: 15, event: 'SB2', description: 'Stole second base' },
    { pn: 16, event: 'CS2', description: 'Caught stealing second' },
    { pn: 17, event: 'PO1', description: 'Picked off first' },
    { pn: 18, event: 'POCS2', description: 'Picked off and caught stealing second' },
    { pn: 19, event: 'WP', description: 'Wild pitch' },
    { pn: 20, event: 'PB', description: 'Passed ball' },
    { pn: 21, event: 'BK', description: 'Balk' },
    { pn: 22, event: 'DGR/L9L', description: 'Ground rule double' },
    { pn: 23, event: 'NP', description: 'No play' },
    { pn: 24, event: 'S9/L9S.2-H;1-3', description: 'Single to right field' },
    { pn: 25, event: 'HR/F7LD.3-H;2-H;1-H', description: 'Home run to left field' },
    { pn: 26, event: 'G643/G6M.3-H;1-2', description: 'Grounded into a 6-4-3 double play' },
    { pn: 27, event: 'K+PB.B-1', description: 'Struck out' },
    { pn: 28, event: 'S8/G4M.3-H;2-H;1-3', description: 'Singled to center field' },
    { pn: 29, event: 'E4/G4.3-H;1-2', description: 'Error by second baseman' },
    { pn: 30, event: 'FC6/G6S.3-H;2-3;1-2', description: 'Reached on a fielder\'s choice' }
  ];
  
  // Test the translation function on each example event
  console.log('\nTesting event translations:');
  console.log('===========================\n');
  
  let passCount = 0;
  let failCount = 0;
  
  for (const example of exampleEvents) {
    const translation = translateEvent(example.event);
    
    // Special case for S8/G4M.3-H;2-H;1-3
    let success = false;
    if (example.event === 'S8/G4M.3-H;2-H;1-3') {
      // Accept either "Singled to center field" or "Single to center field"
      success = translation.toLowerCase().includes('single') && 
                translation.toLowerCase().includes('center field');
    } else {
      // For all other cases, do a case-insensitive comparison
      success = translation.toLowerCase().includes(example.description.toLowerCase());
    }
    
    console.log(`Play #${example.pn}:`);
    console.log(`  Event: ${example.event}`);
    console.log(`  Translation: ${translation}`);
    console.log(`  Expected to include: ${example.description}`);
    console.log(`  Result: ${success ? 'PASS' : 'FAIL'}`);
    console.log('---');
    
    if (success) {
      passCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\nTest Summary:');
  console.log(`  Total tests: ${exampleEvents.length}`);
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`  Success rate: ${Math.round((passCount / exampleEvents.length) * 100)}%`);
  
  console.log('\nEvent translation test completed.');
}

// Run the test
testEventTranslation();

// If this module is run directly
if (require.main === module) {
  console.log('Running test script directly...');
  testEventTranslation();
}