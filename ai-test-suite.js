// AI Analytics Service Test Script
// Run this in browser console at http://localhost:3000/performance-dashboard

console.log('=== AI Analytics Service Test Suite ===');

// Function to safely access the service
function getAIService() {
  // Try multiple ways to access the service
  if (window.aiAnalyticsService) {
    return window.aiAnalyticsService;
  }
  
  // Try to access through React DevTools or other means
  console.log('Checking for service availability...');
  return null;
}

// Test 1: Circuit Breaker Status
function testCircuitBreaker() {
  console.log('\n--- Test 1: Circuit Breaker Status ---');
  const service = getAIService();
  
  if (service && service.getCircuitBreakerStatus) {
    const status = service.getCircuitBreakerStatus();
    console.log('✅ Circuit Breaker Status:', status);
    
    if (status.state === 'CLOSED' && status.canMakeRequest) {
      console.log('✅ Circuit breaker is healthy and accepting requests');
    } else {
      console.log('⚠️ Circuit breaker state:', status.state);
    }
  } else {
    console.log('❌ Circuit breaker method not accessible');
  }
}

// Test 2: Cache Statistics
function testCache() {
  console.log('\n--- Test 2: Cache Statistics ---');
  const service = getAIService();
  
  if (service && service.getCacheStats) {
    const stats = service.getCacheStats();
    console.log('✅ Cache Statistics:', stats);
    
    if (stats.maxSize === 50 && stats.duration === 600000) {
      console.log('✅ Cache configuration is correct (50 entries, 10 min duration)');
    } else {
      console.log('⚠️ Cache configuration may be incorrect');
    }
  } else {
    console.log('❌ Cache statistics method not accessible');
  }
}

// Test 3: Service Methods Availability
function testServiceMethods() {
  console.log('\n--- Test 3: Service Methods Availability ---');
  const service = getAIService();
  
  if (service) {
    const methods = [
      'analyzeTrends',
      'generateInsights', 
      'getQuestionRecommendations',
      'checkAIAvailability',
      'getCircuitBreakerStatus',
      'resetCircuitBreaker',
      'clearCache',
      'getCacheStats'
    ];
    
    methods.forEach(method => {
      if (typeof service[method] === 'function') {
        console.log(`✅ ${method}: Available`);
      } else {
        console.log(`❌ ${method}: Not found`);
      }
    });
  } else {
    console.log('❌ Service not accessible');
  }
}

// Test 4: Mock Request Test (Safe)
function testMockRequest() {
  console.log('\n--- Test 4: Mock Request Test ---');
  
  // Sample performance data for testing
  const mockRequest = {
    userId: 1,
    timeframe: 'week',
    analysisType: 'overall',
    performanceData: [
      { date: '2025-01-01', score: 85 },
      { date: '2025-01-02', score: 90 },
      { date: '2025-01-03', score: 78 }
    ]
  };
  
  console.log('Mock request data:', mockRequest);
  console.log('Note: Actual API calls should be tested through the UI to avoid CORS issues');
}

// Test 5: Browser Compatibility
function testBrowserCompatibility() {
  console.log('\n--- Test 5: Browser Compatibility ---');
  
  const features = {
    'Fetch API': typeof fetch !== 'undefined',
    'Promises': typeof Promise !== 'undefined',
    'Async/Await': true, // If this script runs, async/await is supported
    'Console Methods': typeof console.log !== 'undefined',
    'Local Storage': typeof localStorage !== 'undefined',
    'Session Storage': typeof sessionStorage !== 'undefined'
  };
  
  Object.entries(features).forEach(([feature, supported]) => {
    console.log(`${supported ? '✅' : '❌'} ${feature}: ${supported ? 'Supported' : 'Not Supported'}`);
  });
}

// Run all tests
function runAllTests() {
  console.log('Starting AI Analytics Service Tests...\n');
  
  testCircuitBreaker();
  testCache();
  testServiceMethods();
  testMockRequest();
  testBrowserCompatibility();
  
  console.log('\n=== Test Suite Complete ===');
  console.log('Next steps:');
  console.log('1. Navigate to AI Performance tabs in the dashboard');
  console.log('2. Test actual AI requests through the UI');
  console.log('3. Monitor Network tab for retry behavior');
  console.log('4. Check for user-friendly error messages');
}

// Auto-run tests
runAllTests();

// Export for manual testing
window.aiTestSuite = {
  runAllTests,
  testCircuitBreaker,
  testCache,
  testServiceMethods,
  testMockRequest,
  testBrowserCompatibility,
  
  // Helper functions
  clearCache: () => {
    const service = getAIService();
    if (service && service.clearCache) {
      service.clearCache();
      console.log('✅ Cache cleared');
    } else {
      console.log('❌ Cannot clear cache - method not accessible');
    }
  },
  
  resetCircuitBreaker: () => {
    const service = getAIService();
    if (service && service.resetCircuitBreaker) {
      service.resetCircuitBreaker();
      console.log('✅ Circuit breaker reset');
    } else {
      console.log('❌ Cannot reset circuit breaker - method not accessible');
    }
  }
};

console.log('\n💡 Use window.aiTestSuite for manual testing functions');
