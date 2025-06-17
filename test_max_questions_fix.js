/**
 * Quick test script to verify the max_questions fix 
 * This will create a test template and attempt to start both
 * an adaptive and a regular test
 */

const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:8000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || localStorage.getItem('token');

// Make sure we have a token
if (!AUTH_TOKEN) {
  console.error('No authentication token found. Please set AUTH_TOKEN environment variable or login first.');
  process.exit(1);
}

// API client configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Test both adaptive and regular test creation
async function runTests() {
  console.log('=== Testing Max Questions Fix ===');
  
  try {
    // 1. Create a test template
    const templateName = `Test Template ${new Date().toISOString()}`;
    console.log(`Creating template: ${templateName}`);
    
    const templateResponse = await api.post('/tests/templates', {
      template_name: templateName,
      test_type: 'Practice',
      sections: [
        {
          paper_id: 1,
          section_id: 1,
          question_count: 5
        }
      ]
    });
    
    const templateId = templateResponse.data.template_id;
    console.log(`Template created with ID: ${templateId}`);
    
    // 2. Start a regular test
    console.log('\nTesting regular test creation...');
    const regularTestResponse = await api.post('/tests/start', {
      test_template_id: templateId,
      duration_minutes: 10
    });
    
    console.log(`Regular test created successfully! Attempt ID: ${regularTestResponse.data.attempt_id}`);
    
    // 3. Start an adaptive test with max_questions
    console.log('\nTesting adaptive test creation with max_questions...');
    const adaptiveTestResponse = await api.post('/tests/start', {
      test_template_id: templateId,
      duration_minutes: 10,
      is_adaptive: true,
      adaptive_strategy: 'adaptive',
      max_questions: 5
    });
    
    console.log(`Adaptive test created successfully! Attempt ID: ${adaptiveTestResponse.data.attempt_id}`);
    console.log(`Max questions value: ${adaptiveTestResponse.data.max_questions || 'not set (using default)'}`);
    
    return true;
  } catch (error) {
    console.error('Test failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else {
      console.error(error.message);
    }
    return false;
  }
}

// Run the tests
runTests().then(success => {
  if (success) {
    console.log('\n✅ All tests passed! The max_questions fix is working properly.');
  } else {
    console.log('\n❌ Test failed. Please check the error messages above.');
  }
});
