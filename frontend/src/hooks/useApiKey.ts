import { useState, useEffect, useCallback } from 'react';
import { ApiKeyType, ApiKeyRetrievalResult } from '../types/apiKey';
import { apiKeyService } from '../services/apiKeyService';

interface UseApiKeyOptions {
  keyType: ApiKeyType;
  fallbackKey?: string;
  enableFallback?: boolean;
  autoFetch?: boolean;
}

interface UseApiKeyResult {
  apiKey: string | null;
  loading: boolean;
  error: string | null;
  usingFallback: boolean;
  retry: () => Promise<void>;
  isAvailable: boolean;
}

/**
 * React hook for retrieving and managing API keys
 */
export const useApiKey = (options: UseApiKeyOptions): UseApiKeyResult => {
  const { keyType, fallbackKey, enableFallback = true, autoFetch = true } = options;
  
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  const fetchApiKey = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result: ApiKeyRetrievalResult = await apiKeyService.getApiKey({
        keyType,
        fallbackKey,
        enableFallback
      });

      if (result.success && result.apiKey) {
        setApiKey(result.apiKey);
        setUsingFallback(result.usingFallback);
        setIsAvailable(true);
        setError(null);
      } else {
        setApiKey(null);
        setUsingFallback(false);
        setIsAvailable(false);
        setError(result.error || `No API key available for ${keyType}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setApiKey(null);
      setUsingFallback(false);
      setIsAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [keyType, fallbackKey, enableFallback]);

  useEffect(() => {
    if (autoFetch) {
      fetchApiKey();
    }
  }, [fetchApiKey, autoFetch]);

  return {
    apiKey,
    loading,
    error,
    usingFallback,
    retry: fetchApiKey,
    isAvailable
  };
};

/**
 * Hook for checking multiple API key types availability
 */
export const useMultipleApiKeys = (keyTypes: ApiKeyType[]) => {
  const [availability, setAvailability] = useState<Record<ApiKeyType, boolean>>({} as Record<ApiKeyType, boolean>);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAvailability = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        keyTypes.map(async (keyType) => {
          const isAvailable = await apiKeyService.isApiKeyAvailable(keyType);
          return { keyType, isAvailable };
        })
      );

      const availabilityMap = results.reduce((acc, { keyType, isAvailable }) => {
        acc[keyType] = isAvailable;
        return acc;
      }, {} as Record<ApiKeyType, boolean>);

      setAvailability(availabilityMap);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [keyTypes]);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  return {
    availability,
    loading,
    error,
    retry: checkAvailability
  };
};

/**
 * Hook for getting available API key types
 */
export const useAvailableApiKeyTypes = () => {
  const [availableTypes, setAvailableTypes] = useState<ApiKeyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableTypes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const types = await apiKeyService.getAvailableKeyTypes();
      setAvailableTypes(types);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setAvailableTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailableTypes();
  }, [fetchAvailableTypes]);

  return {
    availableTypes,
    loading,
    error,
    retry: fetchAvailableTypes
  };
};
