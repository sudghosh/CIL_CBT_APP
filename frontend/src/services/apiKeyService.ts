import { 
  ApiKeyType, 
  ApiKey, 
  ApiKeyRetrievalOptions, 
  ApiKeyRetrievalResult 
} from '../types/apiKey.js';
import { api } from './api';

class ApiKeyService {
  private keyCache: Map<ApiKeyType, { key: string; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly API_URL = '/admin/api-keys';

  /**
   * Retrieves an API key for the specified type with fallback handling
   */
  async getApiKey(options: ApiKeyRetrievalOptions): Promise<ApiKeyRetrievalResult> {
    const { keyType, fallbackKey, enableFallback = true } = options;

    try {
      // Check cache first
      const cachedKey = this.getCachedKey(keyType);
      if (cachedKey) {
        return {
          success: true,
          apiKey: cachedKey,
          keyType,
          usingFallback: false
        };
      }

      // Fetch from backend
      const backendKey = await this.fetchFromBackend(keyType);
      if (backendKey) {
        this.cacheKey(keyType, backendKey);
        return {
          success: true,
          apiKey: backendKey,
          keyType,
          usingFallback: false
        };
      }

      // Fallback to provided key if enabled
      if (enableFallback && fallbackKey) {
        console.warn(`Using fallback API key for ${keyType}`);
        return {
          success: true,
          apiKey: fallbackKey,
          keyType,
          usingFallback: true
        };
      }

      return {
        success: false,
        keyType,
        error: `No API key available for ${keyType}`,
        usingFallback: false
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Try fallback on error if enabled
      if (enableFallback && fallbackKey) {
        console.warn(`Backend error, using fallback for ${keyType}:`, errorMessage);
        return {
          success: true,
          apiKey: fallbackKey,
          keyType,
          usingFallback: true,
          error: errorMessage
        };
      }

      return {
        success: false,
        keyType,
        error: errorMessage,
        usingFallback: false
      };
    }
  }

  /**
   * Retrieves multiple API keys in parallel
   */
  async getMultipleApiKeys(requests: ApiKeyRetrievalOptions[]): Promise<ApiKeyRetrievalResult[]> {
    return Promise.all(requests.map(request => this.getApiKey(request)));
  }

  /**
   * Checks if an API key is available for the specified type
   */
  async isApiKeyAvailable(keyType: ApiKeyType): Promise<boolean> {
    try {
      const response = await api.get(`/ai/api-key/${keyType}/status`);
      return response.data?.available || false;
    } catch (error) {
      console.warn(`Failed to check API key availability for ${keyType}:`, error);
      return false;
    }
  }

  /**
   * Gets all available API key types
   */
  async getAvailableKeyTypes(): Promise<ApiKeyType[]> {
    try {
      const response = await api.get('/ai/api-key-status');
      
      if (response.data?.availability) {
        const availability = response.data.availability;
        return Object.keys(availability)
          .filter(keyType => availability[keyType].available)
          .map(keyType => keyType as ApiKeyType);
      }
      
      return [];
    } catch (error) {
      console.warn('Failed to fetch available API key types:', error);
      return [];
    }
  }

  /**
   * Validates an API key by making a test call
   */
  async validateApiKey(keyType: ApiKeyType, apiKey: string): Promise<boolean> {
    try {
      switch (keyType) {
        case 'google':
          return await this.validateGoogleApiKey(apiKey);
        case 'openrouter':
          return await this.validateOpenRouterApiKey(apiKey);
        default:
          console.warn(`No validation method for API key type: ${keyType}`);
          return true; // Assume valid if no validation method
      }
    } catch (error) {
      console.error(`API key validation failed for ${keyType}:`, error);
      return false;
    }
  }

  /**
   * Clears cached keys (useful for testing or when keys are updated)
   */
  clearCache(): void {
    this.keyCache.clear();
  }

  /**
   * Gets cached key if valid and not expired
   */
  private getCachedKey(keyType: ApiKeyType): string | null {
    const cached = this.keyCache.get(keyType);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.keyCache.delete(keyType);
      return null;
    }

    return cached.key;
  }

  /**
   * Caches an API key with timestamp
   */
  private cacheKey(keyType: ApiKeyType, key: string): void {
    this.keyCache.set(keyType, {
      key,
      timestamp: Date.now()
    });
  }

  /**
   * Fetches API key from backend
   */
  private async fetchFromBackend(keyType: ApiKeyType): Promise<string | null> {
    try {
      // Use the configured axios instance that includes authentication
      const response = await api.get(`/admin/api-keys/type/${keyType}/key`);
      
      if (response.data && response.data.key) {
        return response.data.key;
      }
      
      console.warn(`No API key found for type: ${keyType}`);
      return null;

    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn(`No API key found for type: ${keyType}`);
        return null;
      }
      
      console.error(`Failed to fetch API key for ${keyType}:`, error);
      throw error;
    }
  }

  /**
   * Validates Google API key
   */
  private async validateGoogleApiKey(apiKey: string): Promise<boolean> {
    try {
      // Make a simple test call to Google API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`, {
        method: 'GET'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Validates OpenRouter API key
   */
  private async validateOpenRouterApiKey(apiKey: string): Promise<boolean> {
    try {
      // Make a test call to OpenRouter API
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const apiKeyService = new ApiKeyService();
export default apiKeyService;
