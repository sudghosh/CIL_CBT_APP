// Simple test to check API key availability and performance data
// Open browser console and paste this to debug AI trend analysis issues

async function debugAITrendAnalysis() {
  console.log('=== Debugging AI Trend Analysis ===');
  
  try {
    // 1. Test API key retrieval
    console.log('\n1. Testing API key retrieval...');
    
    const apiKeyTypes = ['google', 'openrouter', 'a4f'];
    
    for (const keyType of apiKeyTypes) {
      try {
        const response = await fetch(`/api/keys/${keyType}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || 'test'}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ ${keyType}: Available = ${data.success}`);
        } else {
          console.log(`❌ ${keyType}: HTTP ${response.status}`);
        }
      } catch (err) {
        console.log(`❌ ${keyType}: Error - ${err.message}`);
      }
    }
    
    // 2. Check user performance data
    console.log('\n2. Checking user performance data...');
    
    // Try to get current user ID from local storage or context
    const userId = localStorage.getItem('user_id') || '1';
    console.log(`Using user ID: ${userId}`);
    
    // Check if there's performance data available
    try {
      const performanceResponse = await fetch(`/api/user-performance/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'test'}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (performanceResponse.ok) {
        const perfData = await performanceResponse.json();
        console.log(`✅ Performance data available: ${perfData.length || 0} records`);
        if (perfData.length > 0) {
          console.log('Sample data:', perfData.slice(0, 2));
        }
      } else {
        console.log(`❌ Performance data: HTTP ${performanceResponse.status}`);
      }
    } catch (err) {
      console.log(`❌ Performance data error: ${err.message}`);
    }
    
    // 3. Test AI analytics service directly (if available in browser context)
    console.log('\n3. Testing AI service availability...');
    
    if (window.aiAnalyticsService || window.aiAnalyticsServiceInstance) {
      console.log('✅ AI Analytics Service is available in browser context');
    } else {
      console.log('❌ AI Analytics Service not found in browser context');
    }
    
    // 4. Check for common issues
    console.log('\n4. Common issue checks...');
    
    // Check if React app is fully loaded
    if (document.getElementById('root') && document.getElementById('root').children.length > 0) {
      console.log('✅ React app is loaded');
    } else {
      console.log('❌ React app may not be fully loaded');
    }
    
    // Check for JavaScript errors
    const errorCount = window.performance?.getEntriesByType('navigation')?.[0]?.type === 'reload' ? 'Page was reloaded' : 'No reload detected';
    console.log(`Page status: ${errorCount}`);
    
    console.log('\n=== Debug Complete ===');
    console.log('Next steps to manually check:');
    console.log('1. Navigate to Performance Dashboard');
    console.log('2. Look for AI Trend Analysis tab');
    console.log('3. Check browser network tab for failed requests');
    console.log('4. Check for specific error messages in console');
    
  } catch (error) {
    console.error('Debug script error:', error);
  }
}

// Auto-run the debug
debugAITrendAnalysis();
