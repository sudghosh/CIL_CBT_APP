import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Alert, 
  Chip, 
  CircularProgress,
  Button
} from '@mui/material';
import { Key, Warning, CheckCircle, Error } from '@mui/icons-material';
import { useApiKey, useMultipleApiKeys, useAvailableApiKeyTypes } from '../hooks/useApiKey';
import { ApiKeyType } from '../types/apiKey';

export const ApiKeyStatusDemo: React.FC = () => {
  const { availableTypes, loading: typesLoading, error: typesError } = useAvailableApiKeyTypes();
  const { availability, loading: availabilityLoading } = useMultipleApiKeys(['google', 'openrouter']);
  
  const { 
    apiKey: googleKey, 
    loading: googleLoading, 
    error: googleError, 
    usingFallback: googleFallback,
    retry: retryGoogle 
  } = useApiKey({ 
    keyType: 'google', 
    autoFetch: true,
    enableFallback: true,
    fallbackKey: process.env.REACT_APP_GOOGLE_API_KEY 
  });

  const { 
    apiKey: openRouterKey, 
    loading: openRouterLoading, 
    error: openRouterError, 
    usingFallback: openRouterFallback,
    retry: retryOpenRouter 
  } = useApiKey({ 
    keyType: 'openrouter', 
    autoFetch: true,
    enableFallback: true,
    fallbackKey: process.env.REACT_APP_OPENROUTER_API_KEY 
  });

  const renderKeyStatus = (
    keyType: ApiKeyType, 
    apiKey: string | null, 
    loading: boolean, 
    error: string | null, 
    usingFallback: boolean,
    retry: () => void
  ) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Box display="flex" alignItems="center">
            <Key sx={{ mr: 1 }} />
            <Typography variant="h6">{keyType} API Key</Typography>
          </Box>
          {loading && <CircularProgress size={20} />}
        </Box>

        {loading && (
          <Typography variant="body2" color="text.secondary">
            Retrieving API key...
          </Typography>
        )}

        {error && (
          <Alert 
            severity="error" 
            icon={<Error />}
            action={
              <Button size="small" onClick={retry}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {!loading && !error && apiKey && (
          <>
            <Alert 
              severity={usingFallback ? "warning" : "success"} 
              icon={usingFallback ? <Warning /> : <CheckCircle />}
            >
              API key available{usingFallback ? ' (using fallback)' : ' (from backend)'}
            </Alert>
            <Box mt={1}>
              <Chip 
                label={usingFallback ? "Fallback Key" : "Backend Key"} 
                color={usingFallback ? "warning" : "success"}
                size="small"
              />
              <Typography variant="caption" sx={{ ml: 1 }}>
                Key: {apiKey.substring(0, 8)}...{apiKey.substring(apiKey.length - 4)}
              </Typography>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        API Key Service Demo
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Available API Key Types</Typography>
          {typesLoading ? (
            <CircularProgress size={20} />
          ) : typesError ? (
            <Alert severity="error">{typesError}</Alert>
          ) : (
            <Box>
              {availableTypes.length > 0 ? (
                availableTypes.map(type => (
                  <Chip key={type} label={type} sx={{ mr: 1, mb: 1 }} />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No API keys configured in backend
                </Typography>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>API Key Availability Check</Typography>
          {availabilityLoading ? (
            <CircularProgress size={20} />
          ) : (
            <Box>
              {Object.entries(availability).map(([keyType, isAvailable]) => (
                <Box key={keyType} display="flex" alignItems="center" mb={1}>
                  <Typography variant="body1" sx={{ mr: 2, minWidth: 100 }}>
                    {keyType}:
                  </Typography>
                  <Chip 
                    label={isAvailable ? "Available" : "Not Available"} 
                    color={isAvailable ? "success" : "error"}
                    size="small"
                  />
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      <Typography variant="h5" gutterBottom>
        Individual API Key Status
      </Typography>

      {renderKeyStatus('google', googleKey, googleLoading, googleError, googleFallback, retryGoogle)}
      {renderKeyStatus('openrouter', openRouterKey, openRouterLoading, openRouterError, openRouterFallback, retryOpenRouter)}
    </Box>
  );
};

export default ApiKeyStatusDemo;
