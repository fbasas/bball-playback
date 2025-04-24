import { translateEvent } from '../services/eventTranslation';

// Test cases
const testCases = [
  { event: '8/L8XD', expected: 'Lineout to center fielder' },
  { event: '7/F7D', expected: 'Flyout to left fielder' },
  { event: '9/G9S', expected: 'Groundout to right fielder' },
  { event: '5/L5', expected: 'Lineout to third baseman' },
  { event: '6/P6S', expected: 'Popup to shortstop' },
  { event: '3', expected: 'Groundout to first baseman' },
  { event: '8', expected: 'Flyout to center fielder' }
];

// Run tests
console.log('Testing outfielder event translations:');
console.log('======================================');

let passCount = 0;
let failCount = 0;

for (const test of testCases) {
  const result = translateEvent(test.event);
  const passed = result === test.expected;
  
  console.log(`Event: ${test.event}`);
  console.log(`Expected: ${test.expected}`);
  console.log(`Actual: ${result}`);
  console.log(`Result: ${passed ? 'PASS' : 'FAIL'}`);
  console.log('--------------------------------------');
  
  if (passed) {
    passCount++;
  } else {
    failCount++;
  }
}

console.log(`Summary: ${passCount} passed, ${failCount} failed`);

// Exit with non-zero code if any tests failed
if (failCount > 0) {
  process.exit(1);
}