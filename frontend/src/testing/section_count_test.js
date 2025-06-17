/**
 * API Test for the section count issue
 * 
 * This runs from the frontend but accesses backend directly.
 */

// Set up a test token - either grab from localStorage or insert a working token here
const token = localStorage.getItem('token') || 'YOUR_TOKEN_HERE';

// Testing parameters
const paperId = 1;
const sectionId = 4; // The problematic section
const apiUrl = 'http://localhost:8000';

// Helper function to send API requests
async function sendApiRequest(endpoint, params = {}) {
  const url = new URL(endpoint, apiUrl);
  
  // Add parameters to URL
  Object.keys(params).forEach(key => {
    url.searchParams.append(key, params[key]);
  });
  
  console.log(`Sending request to ${url.toString()}`);
  
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const status = response.status;
    const statusText = response.statusText;
    
    // Try to parse response as JSON
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }
    
    console.log(`Response status: ${status} ${statusText}`);
    console.log('Response data:', data);
    
    return { status, data };
  } catch (error) {
    console.error('Request error:', error);
    return { status: 0, error };
  }
}

// Run tests
async function runTests() {
  console.log('=== API Test for Section Count Issue ===');
  
  // Test 1: Check if paper exists
  console.log('\nTest 1: Check if paper exists');
  const paperResult = await sendApiRequest(`/papers/${paperId}`);
  
  if (paperResult.status !== 200) {
    console.log(`❌ Paper ${paperId} does not exist or can't be accessed`);
    return;
  }
  console.log(`✅ Paper ${paperId} exists`);
  
  // Test 2: Check sections in paper
  console.log('\nTest 2: Check sections in paper');
  const sections = paperResult.data?.sections || [];
  const sectionExists = sections.some(s => s.section_id === sectionId);
  
  if (sectionExists) {
    console.log(`✅ Section ${sectionId} exists in paper ${paperId}`);
  } else {
    console.log(`❌ Section ${sectionId} does NOT exist in paper ${paperId}`);
    console.log(`Available sections: ${sections.map(s => s.section_id).join(', ')}`);
  }
  
  // Test 3: Get questions with max page size
  console.log('\nTest 3: Get questions with page_size=100');
  const questionsResult = await sendApiRequest('/questions/', {
    paper_id: paperId,
    section_id: sectionId,
    page: 1,
    page_size: 100
  });
  
  if (questionsResult.status === 200) {
    const count = questionsResult.data?.total || 0;
    console.log(`✅ Success! Found ${count} questions`);
  } else if (questionsResult.status === 404) {
    console.log(`✅ Correct error handling: 404 for non-existent section`);
  } else {
    console.log(`❌ Unexpected response: ${questionsResult.status}`);
  }
  
  // Test 4: Get questions with too large page size
  console.log('\nTest 4: Get questions with page_size=1000 (too large)');
  const largePageResult = await sendApiRequest('/questions/', {
    paper_id: paperId,
    section_id: sectionId,
    page: 1,
    page_size: 1000
  });
  
  if (largePageResult.status === 422) {
    console.log(`✅ Correct validation: 422 for too large page_size`);
  } else {
    console.log(`❓ Unexpected response: ${largePageResult.status}`);
  }
  
  console.log('\n=== Tests Complete ===');
}

// Execute tests
runTests().catch(console.error);
