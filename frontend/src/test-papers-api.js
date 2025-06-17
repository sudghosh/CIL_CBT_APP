/**
 * Test script for paper management API functions
 * 
 * This script tests all the paper-related API functions to ensure they
 * work correctly with authentication.
 */

import { papersAPI } from './src/services/api';

/**
 * Run a series of tests for the papers API
 */
async function testPapersAPI() {
  console.log('===== TESTING PAPERS API =====');
  
  // Test getting papers list
  try {
    console.log('1. Testing getPapers()...');
    const result = await papersAPI.getPapers();
    console.log(`✅ SUCCESS: Got ${result.data.total} papers`);
    console.log('Sample data:', result.data.items[0]);
  } catch (error) {
    console.error('❌ ERROR getting papers:', error);
  }
  
  // Find a paper to test with
  let testPaperId = 1; // Default to paper ID 1
  try {
    const papers = await papersAPI.getPapers();
    if (papers.data.items.length > 0) {
      testPaperId = papers.data.items[0].paper_id;
    }
  } catch (error) {
    console.log('Could not get papers to find test paper ID, using default ID 1');
  }
  
  // Test activating a paper
  try {
    console.log(`\n2. Testing activatePaper(${testPaperId})...`);
    const result = await papersAPI.activatePaper(testPaperId);
    console.log('✅ SUCCESS: Paper activated');
    console.log('Response:', result);
  } catch (error) {
    console.error('❌ ERROR activating paper:', error);
  }
  
  // Test deactivating a paper
  try {
    console.log(`\n3. Testing deactivatePaper(${testPaperId})...`);
    const result = await papersAPI.deactivatePaper(testPaperId);
    console.log('✅ SUCCESS: Paper deactivated');
    console.log('Response:', result);
  } catch (error) {
    console.error('❌ ERROR deactivating paper:', error);
  }
  
  // Test activating again to restore state
  try {
    console.log(`\n4. Testing activatePaper(${testPaperId}) again...`);
    const result = await papersAPI.activatePaper(testPaperId);
    console.log('✅ SUCCESS: Paper activated again');
  } catch (error) {
    console.error('❌ ERROR activating paper again:', error);
  }
  
  console.log('\n===== PAPER API TESTS COMPLETE =====');
}

// Bootstrap function to check token before running tests
function init() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ ERROR: No authentication token found in localStorage.');
    console.log('Please login first or set a token manually before running tests.');
    return;
  }
  
  console.log('Authentication token found:', token.substring(0, 20) + '...');
  testPapersAPI();
}

// Start the tests
init();
