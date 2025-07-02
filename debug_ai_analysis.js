// Debug script to test AI analysis functionality
const fetch = require('node-fetch');

const TEST_PERFORMANCE_DATA = [
  {
    date: '2025-01-01',
    score: 85,
    topic: 'Mathematics',
    difficulty: 7,
    timeSpent: 30,
    questionCount: 20
  },
  {
    date: '2025-01-02',
    score: 78,
    topic: 'Science',
    difficulty: 6,
    timeSpent: 25,
    questionCount: 15
  },
  {
    date: '2025-01-03',
    score: 92,
    topic: 'Mathematics',
    difficulty: 8,
    timeSpent: 35,
    questionCount: 25
  },
  {
    date: '2025-01-04',
    score: 88,
    topic: 'English',
    difficulty: 5,
    timeSpent: 20,
    questionCount: 18
  },
  {
    date: '2025-01-05',
    score: 75,
    topic: 'Science',
    difficulty: 9,
    timeSpent: 40,
    questionCount: 22
  }
];

async function testAIService() {
  console.log('=== Testing AI Analytics Service ===\n');
  
  try {
    // Test the backend API endpoint
    console.log('1. Testing backend API health...');
    const healthResponse = await fetch('http://localhost:8000/health');
    if (healthResponse.ok) {
      console.log('✅ Backend is healthy');
    } else {
      console.log('❌ Backend health check failed:', healthResponse.status);
    }
    
    // Test API key retrieval
    console.log('\n2. Testing API key retrieval...');
    const apiKeyResponse = await fetch('http://localhost:8000/api/keys/google', {
      headers: {
        'Authorization': 'Bearer test-token', // You may need to adjust this
        'Content-Type': 'application/json'
      }
    });
    
    if (apiKeyResponse.ok) {
      const keyData = await apiKeyResponse.json();
      console.log('✅ API key endpoint accessible');
      console.log('Google API key available:', keyData.success);
    } else {
      console.log('❌ API key retrieval failed:', apiKeyResponse.status);
    }
    
    // Test frontend service directly
    console.log('\n3. Testing AI analysis with sample data...');
    
    // Simulate the AI analysis request
    const analysisRequest = {
      userId: 1,
      performanceData: TEST_PERFORMANCE_DATA,
      timeframe: 'month',
      analysisType: 'overall'
    };
    
    console.log('Sample performance data:', JSON.stringify(analysisRequest, null, 2));
    console.log('\n4. Checking if frontend can access the AI service...');
    
    // Test the frontend app endpoint
    const frontendResponse = await fetch('http://localhost:3000');
    if (frontendResponse.ok) {
      console.log('✅ Frontend is accessible');
    } else {
      console.log('❌ Frontend not accessible:', frontendResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Error testing AI service:', error.message);
  }
}

// Additional function to check browser console logs
function checkBrowserConsole() {
  console.log('\n5. Manual checks to perform in browser:');
  console.log('📋 Open browser DevTools and check:');
  console.log('   - Console tab for JavaScript errors');
  console.log('   - Network tab for failed API requests');
  console.log('   - Look for 404, 401, or 500 errors');
  console.log('   - Check if API keys are being fetched correctly');
  console.log('\n📋 Navigate to Performance Dashboard and:');
  console.log('   - Check if "AI Trend Analysis" tab loads');
  console.log('   - Look for API key status messages');
  console.log('   - Check if performance data exists');
  console.log('   - Try refreshing the analysis manually');
}

// Run the tests
testAIService().then(() => {
  checkBrowserConsole();
});
