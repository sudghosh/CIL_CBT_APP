import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BugReportIcon from '@mui/icons-material/BugReport';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import { chartErrorLogger, ChartError, ChartErrorSummary } from '../../utils/chartErrorLogger';

interface ChartErrorMonitorProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Development tool for monitoring chart errors in real-time
 * Only available in development mode
 */
const ChartErrorMonitor: React.FC<ChartErrorMonitorProps> = ({ open, onClose }) => {
  const [errorSummary, setErrorSummary] = useState<ChartErrorSummary | null>(null);
  const [selectedError, setSelectedError] = useState<ChartError | null>(null);

  // Refresh error data
  const refreshData = () => {
    setErrorSummary(chartErrorLogger.getErrorSummary());
  };

  // Subscribe to new errors
  useEffect(() => {
    if (!open) return;

    refreshData();
    
    const unsubscribe = chartErrorLogger.subscribeToErrors((error) => {
      console.log('📊 New chart error logged:', error.errorId);
      refreshData();
    });

    return unsubscribe;
  }, [open]);

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get error type color
  const getErrorTypeColor = (errorType: string) => {
    const colors: Record<string, 'error' | 'warning' | 'info' | 'success'> = {
      'api_error': 'error',
      'rendering_error': 'error',
      'data_error': 'warning',
      'auth_error': 'warning',
      'network_error': 'info',
      'unknown_error': 'error'
    };
    return colors[errorType] || 'error';
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BugReportIcon />
        Chart Error Monitor
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={refreshData} size="small">
          <RefreshIcon />
        </IconButton>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {!errorSummary ? (
          <Typography>Loading error data...</Typography>
        ) : errorSummary.totalErrors === 0 ? (
          <Alert severity="success">
            🎉 No chart errors detected! All charts are running smoothly.
          </Alert>
        ) : (
          <Box>
            {/* Error Summary */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Error Summary
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip 
                  label={`Total Errors: ${errorSummary.totalErrors}`} 
                  color="error" 
                  variant="filled" 
                />
              </Box>

              {/* Errors by Chart */}
              <Typography variant="subtitle1" gutterBottom>
                Errors by Chart:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {Object.entries(errorSummary.errorsByChart).map(([chart, count]) => (
                  <Chip 
                    key={chart}
                    label={`${chart}: ${count}`}
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>

              {/* Errors by Type */}
              <Typography variant="subtitle1" gutterBottom>
                Errors by Type:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(errorSummary.errorsByType).map(([type, count]) => (
                  <Chip 
                    key={type}
                    label={`${type}: ${count}`}
                    color={getErrorTypeColor(type)}
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </Box>

            {/* Recent Errors Table */}
            <Typography variant="h6" gutterBottom>
              Recent Errors
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Chart</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {errorSummary.recentErrors.map((error) => (
                    <TableRow key={error.errorId}>
                      <TableCell>
                        <Typography variant="caption">
                          {formatTimestamp(error.timestamp)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={error.chartName}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={error.errorType}
                          color={getErrorTypeColor(error.errorType)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 300 }}>
                          {error.message.substring(0, 100)}
                          {error.message.length > 100 ? '...' : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="small" 
                          onClick={() => setSelectedError(error)}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Error Details Modal */}
            {selectedError && (
              <Dialog 
                open={!!selectedError} 
                onClose={() => setSelectedError(null)}
                maxWidth="md"
                fullWidth
              >
                <DialogTitle>
                  Error Details: {selectedError.chartName}
                </DialogTitle>
                <DialogContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Error ID:</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {selectedError.errorId}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Message:</Typography>
                    <Typography variant="body2">{selectedError.message}</Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Type:</Typography>
                    <Chip 
                      label={selectedError.errorType}
                      color={getErrorTypeColor(selectedError.errorType)}
                      size="small"
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Timestamp:</Typography>
                    <Typography variant="body2">
                      {formatTimestamp(selectedError.timestamp)}
                    </Typography>
                  </Box>

                  {selectedError.stack && (
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle2">Stack Trace</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace', 
                            fontSize: '0.75rem',
                            whiteSpace: 'pre-wrap',
                            backgroundColor: 'grey.100',
                            p: 1,
                            borderRadius: 1
                          }}
                        >
                          {selectedError.stack}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  )}

                  {selectedError.additionalContext && (
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle2">Additional Context</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace', 
                            fontSize: '0.75rem',
                            whiteSpace: 'pre-wrap',
                            backgroundColor: 'grey.100',
                            p: 1,
                            borderRadius: 1
                          }}
                        >
                          {JSON.stringify(selectedError.additionalContext, null, 2)}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  )}
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setSelectedError(null)}>Close</Button>
                </DialogActions>
              </Dialog>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={() => chartErrorLogger.clearErrors()} color="warning">
          Clear All Errors
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChartErrorMonitor;
