# AI Dashboard Timeout Fixes - Testing Guide

## Overview
This guide helps verify the implemented AI timeout fixes in the Docker environment.

## Implemented Fixes Summary
✅ **Exponential Backoff Retry Logic**: 3 retries with 2s base delay for 503/502/504/429 errors
✅ **Intelligent Caching**: 10-minute cache with max 50 entries and automatic cleanup
✅ **Enhanced Error Handling**: Better UI feedback, retry buttons, loading states
✅ **Circuit Breaker Pattern**: CLOSED/OPEN/HALF_OPEN states with failure thresholds

## Testing Steps

### 1. Access Application
- Open: http://localhost:3000
- Login using development login or Google Auth
- Navigate to Performance Dashboard

### 2. Test AI Features
Navigate to each AI tab and test:
- **AI Trend Analysis**: Should show trends with retry capability
- **AI Performance Insights**: Should display formatted insights
- **AI Question Recommendations**: Should provide actionable recommendations

### 3. Browser Console Testing
Open browser DevTools (F12) and run these tests:

```javascript
// Test 1: Check Circuit Breaker Status
window.aiAnalyticsService?.getCircuitBreakerStatus();
// Expected: Object with state: "CLOSED", failureCount: 0, canMakeRequest: true

// Test 2: Check Cache Statistics
window.aiAnalyticsService?.getCacheStats();
// Expected: Object with size, maxSize: 50, duration: 600000 (10 min)

// Test 3: Clear Cache (optional)
window.aiAnalyticsService?.clearCache();
// Expected: Console log "[AI Cache] All cached responses cleared"

// Test 4: Reset Circuit Breaker (optional)
window.aiAnalyticsService?.resetCircuitBreaker();
// Expected: Console log "[Circuit Breaker] Manually reset to CLOSED state"
```

### 4. Error Scenarios Testing

#### Test Retry Logic:
1. Temporarily disable internet or block AI endpoints
2. Try to load AI sections
3. **Expected Behavior**:
   - Should show retry attempts in console
   - Error messages should be user-friendly
   - Retry buttons should appear in UI

#### Test Circuit Breaker:
1. Simulate 5+ consecutive failures (by blocking network)
2. **Expected Behavior**:
   - Circuit breaker should OPEN after 5 failures
   - Further requests should be blocked immediately
   - Error message should show circuit breaker status and wait time

#### Test Caching:
1. Load AI analysis once successfully
2. Reload the same analysis
3. **Expected Behavior**:
   - Second request should return cached data instantly
   - Console should show "[AI Cache] Using cached response for key: ..."

### 5. Network Tab Monitoring
Monitor Network tab in DevTools for:
- **Retry attempts**: Should see multiple requests for 503/502/504 errors
- **Request timing**: Cached responses should be instant
- **Headers**: Retry requests should have increasing delays

### 6. UI/UX Validation
Check that the interface:
- Shows loading states during AI requests
- Displays retry count when retrying
- Shows last successful analysis timestamp
- Has working retry and manual retry buttons
- Displays appropriate error messages with severity indicators

## Expected Console Logs
```
[AI Cache] Cached response for key: abcd1234...
[AI Cache] Using cached response for key: abcd1234...
[Circuit Breaker] Moving to HALF_OPEN state - testing service availability
[Circuit Breaker] Service failing consistently (5 failures) - OPENING circuit
[Circuit Breaker] Service recovered - moving to CLOSED state
```

## Success Criteria
✅ No compilation errors in frontend build
✅ AI Dashboard loads without crashes
✅ Circuit breaker status can be checked via console
✅ Cache statistics are accessible
✅ Retry logic activates on 503/502/504 errors
✅ Error messages are user-friendly
✅ UI shows appropriate loading/error states
✅ Caching works for duplicate requests

## Common Issues & Solutions

### Issue: "window.aiAnalyticsService is undefined"
**Solution**: The service might not be exposed globally. Access it via:
```javascript
// Alternative access method
console.log("Testing from Performance Dashboard");
```

### Issue: Circuit breaker not triggering
**Solution**: Ensure 5+ consecutive 503/502/504 errors occur within threshold time

### Issue: Cache not working
**Solution**: Check that requests have identical parameters (userId, timeframe, analysisType, data)

## Docker Health Check
If frontend shows unhealthy but works:
```bash
docker logs cil_cbt_app-frontend-1 --tail 50
```
Look for compilation warnings but ensure no critical errors.

## Test Results Recording
Document your findings:
- [ ] Circuit breaker functions correctly
- [ ] Retry logic works with exponential backoff
- [ ] Caching reduces redundant requests
- [ ] Error handling provides good UX
- [ ] Performance improved during failures
- [ ] No breaking changes to existing functionality

---
**Testing Date**: ${new Date().toISOString().split('T')[0]}
**Tested By**: [Your Name]
**Environment**: Docker (Frontend: cil_cbt_app-frontend-1, Backend: cil_cbt_app-backend-1)
