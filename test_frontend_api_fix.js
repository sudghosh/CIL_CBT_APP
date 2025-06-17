/**
 * Simple test script to verify that the frontend API functions are working
 * with the fixed apiRetry.ts file.
 * 
 * To run this test:
 * 1. Open the browser developer console
 * 2. Copy and paste this script
 * 3. Check the console output
 */

async function testFrontendAPI() {
  console.log('===== TESTING FRONTEND API WITH AUTH =====');
  
  // Check if token exists
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No token found in localStorage. Please login first.');
    return;
  }
  
  console.log('Token found in localStorage:', token.substring(0, 20) + '...');
  
  try {
    // Test papers GET endpoint
    console.log('Testing GET /api/papers/ endpoint...');
    const response = await fetch('/api/papers/', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Papers API response:', data);
    console.log('✓ Papers API GET endpoint working!');
    
    // Test if axiosWithRetry is working by making a call from the window object
    if (window.axiosWithRetry) {
      console.log('Testing axiosWithRetry GET...');
      const axiosResponse = await window.axiosWithRetry.get('/api/papers/');
      console.log('axiosWithRetry response:', axiosResponse);
      console.log('✓ axiosWithRetry GET working!');
    } else {
      console.warn('axiosWithRetry not available on window object');
    }
    
  } catch (error) {
    console.error('API test failed:', error);
  }
}

// Run the test
testFrontendAPI();
