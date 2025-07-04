import { api } from './api';
import { logError } from '../utils/errorHandler';
import { DEV_TOKEN, isDevToken, isDevMode } from '../utils/devMode';

export interface TokenRefreshConfig {
  refreshIntervalMs: number;
  warningBeforeExpiryMs: number;
  autoRefreshEnabled: boolean;
}

export interface TokenInfo {
  token: string;
  expiresAt: number;
  issuedAt: number;
}

export class TokenRefreshService {
  private config: TokenRefreshConfig;
  private refreshTimer: NodeJS.Timeout | null = null;
  private warningTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(event: TokenRefreshEvent) => void> = new Set();
  private isRunning: boolean = false;

  constructor(config: Partial<TokenRefreshConfig> = {}) {
    this.config = {
      refreshIntervalMs: 15 * 60 * 1000, // 15 minutes
      warningBeforeExpiryMs: 5 * 60 * 1000, // 5 minutes before expiry
      autoRefreshEnabled: true,
      ...config,
    };
  }

  /**
   * Start the token refresh service
   */
  start(): void {
    if (this.isRunning) {
      console.log('[TokenRefresh] Service already running, ignoring start request');
      return;
    }

    if (this.config.autoRefreshEnabled) {
      // Set running flag immediately to prevent race conditions
      this.isRunning = true;
      
      // Clear any existing timers before starting new ones
      this.clearTimers();
      this.scheduleNextRefresh();
      this.scheduleExpiryWarning();
      console.log('[TokenRefresh] Service started');
    }
  }

  /**
   * Stop the token refresh service
   */
  stop(): void {
    this.clearTimers();
    this.isRunning = false;
    console.log('[TokenRefresh] Service stopped');
  }

  /**
   * Add event listener for token refresh events
   */
  addEventListener(listener: (event: TokenRefreshEvent) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: TokenRefreshEvent) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Get current token information
   */
  getCurrentTokenInfo(): TokenInfo | null {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) return null;

    try {
      // For development tokens, return mock info
      if (isDevToken(token) && isDevMode()) {
        return {
          token,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
          issuedAt: Date.now() - 60 * 1000, // 1 minute ago
        };
      }

      // Parse JWT token to get expiry
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        token,
        expiresAt: payload.exp * 1000, // Convert to milliseconds
        issuedAt: payload.iat * 1000, // Convert to milliseconds
      };
    } catch (error) {
      logError(error, { context: 'Failed to parse token' });
      return null;
    }
  }

  /**
   * Check if token needs refresh
   */
  needsRefresh(): boolean {
    const tokenInfo = this.getCurrentTokenInfo();
    if (!tokenInfo) return true;

    const now = Date.now();
    const timeUntilExpiry = tokenInfo.expiresAt - now;
    return timeUntilExpiry < this.config.refreshIntervalMs;
  }

  /**
   * Check if token is close to expiry
   */
  isCloseToExpiry(): boolean {
    const tokenInfo = this.getCurrentTokenInfo();
    if (!tokenInfo) return true;

    const now = Date.now();
    const timeUntilExpiry = tokenInfo.expiresAt - now;
    return timeUntilExpiry < this.config.warningBeforeExpiryMs;
  }

  /**
   * Refresh token silently
   */
  async refreshToken(): Promise<boolean> {
    try {
      this.emitEvent({ type: 'refresh-started' });

      // For development mode, just refresh the dev token
      if (isDevMode()) {
        const currentToken = localStorage.getItem('token');
        if (currentToken && isDevToken(currentToken)) {
          console.log('[TokenRefresh] Refreshing development token');
          localStorage.setItem('token', DEV_TOKEN);
          this.emitEvent({ type: 'refresh-success', token: DEV_TOKEN });
          return true;
        }
      }

      // Try to refresh token via backend endpoint
      const response = await this.attemptTokenRefresh();
      
      if (response && response.access_token) {
        // Store new token
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('token', response.access_token); // Backward compatibility

        this.emitEvent({ 
          type: 'refresh-success', 
          token: response.access_token 
        });

        // Schedule next refresh only if service is still running and no timer exists
        if (this.isRunning && !this.refreshTimer) {
          this.scheduleNextRefresh();
        }
        if (this.isRunning && !this.warningTimer) {
          this.scheduleExpiryWarning();
        }

        return true;
      }

      throw new Error('No access token in refresh response');

    } catch (error) {
      logError(error, { context: 'Token refresh failed' });
      this.emitEvent({ 
        type: 'refresh-failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  /**
   * Attempt to refresh token via API
   */
  private async attemptTokenRefresh(): Promise<any> {
    // Try different refresh strategies
    
    // Strategy 1: Use refresh endpoint if available
    try {
      const response = await api.post('/auth/refresh');
      return response.data;
    } catch (error) {
      console.log('[TokenRefresh] Refresh endpoint not available, trying alternative');
    }

    // Strategy 2: Re-validate current token
    try {
      const response = await api.get('/auth/me');
      if (response.data) {
        // Current token is still valid, return it
        const currentToken = localStorage.getItem('access_token') || localStorage.getItem('token');
        return { access_token: currentToken };
      }
    } catch (error) {
      console.log('[TokenRefresh] Token validation failed');
    }

    throw new Error('All refresh strategies failed');
  }

  /**
   * Schedule next token refresh
   */
  private scheduleNextRefresh(): void {
    // Don't schedule if service is not running
    if (!this.isRunning) {
      console.log('[TokenRefresh] Service not running, skipping refresh scheduling');
      return;
    }

    // Clear any existing timer first
    this.clearRefreshTimer();

    const tokenInfo = this.getCurrentTokenInfo();
    if (!tokenInfo) {
      console.log('[TokenRefresh] No token info available, skipping refresh scheduling');
      return;
    }

    const now = Date.now();
    const timeUntilRefresh = Math.max(
      this.config.refreshIntervalMs,
      tokenInfo.expiresAt - now - this.config.refreshIntervalMs
    );

    // Only schedule if we don't already have a timer
    if (!this.refreshTimer) {
      this.refreshTimer = setTimeout(() => {
        this.refreshToken().then(() => {
          // Don't reschedule here - let the refresh success handler do it
        }).catch(error => {
          console.error('[TokenRefresh] Token refresh failed:', error);
        });
      }, timeUntilRefresh);

      console.log(`[TokenRefresh] Next refresh scheduled in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`);
    }
  }

  /**
   * Schedule expiry warning
   */
  private scheduleExpiryWarning(): void {
    this.clearWarningTimer();

    const tokenInfo = this.getCurrentTokenInfo();
    if (!tokenInfo) return;

    const now = Date.now();
    const timeUntilWarning = tokenInfo.expiresAt - now - this.config.warningBeforeExpiryMs;

    if (timeUntilWarning > 0) {
      this.warningTimer = setTimeout(() => {
        this.emitEvent({ type: 'expiry-warning' });
      }, timeUntilWarning);
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    this.clearRefreshTimer();
    this.clearWarningTimer();
  }

  /**
   * Clear refresh timer
   */
  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Clear warning timer
   */
  private clearWarningTimer(): void {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(event: TokenRefreshEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in token refresh event listener:', error);
      }
    });
  }
}

export type TokenRefreshEvent = 
  | { type: 'refresh-started' }
  | { type: 'refresh-success'; token: string }
  | { type: 'refresh-failed'; error: string }
  | { type: 'expiry-warning' };

// Singleton instance
export const tokenRefreshService = new TokenRefreshService();

export default tokenRefreshService;
