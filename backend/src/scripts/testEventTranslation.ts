#!/usr/bin/env ts-node

/**
 * Test script for event translation functionality
 * 
 * This script runs the event translation test to verify that Retrosheet event codes
 * are correctly translated into human-readable descriptions.
 * 
 * Usage:
 *   npx ts-node src/scripts/testEventTranslation.ts
 */

import '../services/eventTranslation/tests/translateEvent.test';

// The test is automatically executed when the module is imported
console.log('Test script completed. See output above for results.');