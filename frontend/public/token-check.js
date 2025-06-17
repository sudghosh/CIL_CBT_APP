/**
 * Utility to verify token handling in the frontend
 * 
 * This script checks if the frontend is correctly handling authentication tokens:
 * 1. Verifies token is stored in localStorage
 * 2. Verifies token is included in API requests
 * 3. Simulates API calls and checks response
 * 
 * To use: include in the frontend index.html or run from the browser console
 */

(function() {
    // Configuration
    const validTokenPattern = /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/;
    const TOKEN_KEY = 'token';
    
    // Helper functions
    function log(message, type = 'info') {
        const styles = {
            info: 'color: #0275d8; font-weight: bold',
            success: 'color: #5cb85c; font-weight: bold',
            error: 'color: #d9534f; font-weight: bold',
            warning: 'color: #f0ad4e; font-weight: bold'
        };
        console.log(`%c[TokenCheck] ${message}`, styles[type]);
    }
    
    function checkToken() {
        const token = localStorage.getItem(TOKEN_KEY);
        
        if (!token) {
            log('No token found in localStorage', 'error');
            return null;
        }
        
        // Validate token format (simple check)
        if (!validTokenPattern.test(token)) {
            log(`Token format appears invalid: ${token.substring(0, 10)}...`, 'error');
            return null;
        }
        
        log(`Token found: ${token.substring(0, 10)}...`, 'success');
        return token;
    }
    
    async function testApiCall(url, requiresAuth = true) {
        const token = checkToken();
        if (requiresAuth && !token) {
            log(`Cannot test ${url} without a valid token`, 'error');
            return false;
        }
        
        try {
            const headers = requiresAuth ? 
                { 'Authorization': `Bearer ${token}` } : 
                {};
                
            log(`Testing API call to ${url}`, 'info');
            const response = await fetch(url, { headers });
            
            if (response.ok) {
                log(`API call to ${url} succeeded (${response.status})`, 'success');
                const data = await response.json();
                console.log('Response data:', data);
                return true;
            } else {
                log(`API call to ${url} failed with status ${response.status}`, 'error');
                if (response.status === 401) {
                    log('Authentication failed - token may be expired or invalid', 'error');
                }
                try {
                    const errorData = await response.json();
                    console.error('Error details:', errorData);
                } catch (e) {
                    // In case response is not JSON
                    console.error('Response text:', await response.text());
                }
                return false;
            }
        } catch (error) {
            log(`API call to ${url} failed: ${error.message}`, 'error');
            return false;
        }
    }
    
    // Main verification function
    async function verifyTokenHandling() {
        log('===== Starting Token Verification =====');
        
        // Step 1: Check if token exists
        const token = checkToken();
        if (!token) {
            log('No valid token found. Please log in or set a token manually.', 'error');
            return;
        }
        
        // Step 2: Test health endpoint (public)
        await testApiCall('http://localhost:8000/health', false);
        
        // Step 3: Test authenticated endpoints
        await testApiCall('http://localhost:8000/auth/me');
        await testApiCall('http://localhost:8000/api/papers/');
        
        log('===== Token Verification Complete =====');
    }
    
    // Manual token setting utility
    function setToken(token) {
        localStorage.setItem(TOKEN_KEY, token);
        log(`Token manually set: ${token.substring(0, 10)}...`, 'success');
    }
    
    // Command to load token from the token.js file
    async function loadTokenFromFile() {
        try {
            log('Attempting to load token from token.js', 'info');
            const response = await fetch('token.js');
            if (response.ok) {
                const text = await response.text();
                // Extract token from the file content
                const tokenMatch = text.match(/TOKEN\s*=\s*['"](.+)['"]/);
                if (tokenMatch && tokenMatch[1]) {
                    const token = tokenMatch[1];
                    localStorage.setItem(TOKEN_KEY, token);
                    log(`Token loaded from file: ${token.substring(0, 10)}...`, 'success');
                    return token;
                } else {
                    log('Could not extract token from token.js file', 'error');
                }
            } else {
                log(`Failed to load token.js: ${response.status}`, 'error');
            }
        } catch (error) {
            log(`Error loading token: ${error.message}`, 'error');
        }
        return null;
    }
    
    // Expose utilities to the window object for console access
    window.tokenUtils = {
        verify: verifyTokenHandling,
        check: checkToken,
        set: setToken,
        test: testApiCall,
        load: loadTokenFromFile
    };
    
    // Auto-run if in development mode
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        log('Development environment detected, token utilities available via window.tokenUtils', 'info');
    }
})();
