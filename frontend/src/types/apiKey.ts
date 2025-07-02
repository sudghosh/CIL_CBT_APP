export type ApiKeyType = 'google' | 'openrouter' | 'a4f';

export interface ApiKey {
  id: number;
  key_type: ApiKeyType;
  description?: string;
  created_by_admin_id: number;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyForm {
  key_type: ApiKeyType;
  key: string;
  description?: string;
}

export interface ApiKeyRetrievalOptions {
  keyType: ApiKeyType;
  fallbackKey?: string;
  enableFallback?: boolean;
}

export interface ApiKeyRetrievalResult {
  success: boolean;
  apiKey?: string;
  keyType: ApiKeyType;
  error?: string;
  usingFallback: boolean;
  rateLimitInfo?: {
    remainingCalls: number;
    resetTime: string;
  };
}

export const API_KEY_TYPES: Array<{ value: ApiKeyType; label: string }> = [
  { value: 'google', label: 'Google' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'a4f', label: 'A4F.co' },
];
