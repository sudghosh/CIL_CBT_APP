import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { testsAPI } from '../services/api';

interface TestResult {
  attempt_id: number;
  test_type: string;
  start_time: string;
  end_time: string;
  score: number;
  weighted_score: number;
  duration_minutes: number;
  total_allotted_duration_minutes: number;
}

interface TestDetails {
  questions: Array<{
    question_id: number;
    question_text: string;
    selected_option_index: number | null;
    correct_option_index: number;
    is_correct: boolean;
    explanation: string;
    options: Array<{
      option_id: number;
      option_text: string;
      option_order: number;
    }>;
  }>;
}

export const ResultsPage: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const response = await testsAPI.getAttempts();
      setResults(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load test results');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (attemptId: number) => {
    try {
      const response = await testsAPI.getAttemptDetails(attemptId);
      setSelectedTest(response.data);
      setShowDetails(true);
    } catch (err) {
      console.error('Failed to load test details:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Test Results
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Test Type</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Raw Score</TableCell>
              <TableCell>Final Score</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.attempt_id}>
                <TableCell>{result.test_type}</TableCell>
                <TableCell>
                  {new Date(result.start_time).toLocaleDateString()}
                </TableCell>                <TableCell>
                  {result.duration_minutes || 0} / {result.total_allotted_duration_minutes || 0} minutes
                </TableCell>
                <TableCell>{result.score !== null && result.score !== undefined ? result.score.toFixed(2) : '0.00'}%</TableCell>
                <TableCell>{result.weighted_score !== null && result.weighted_score !== undefined ? result.weighted_score.toFixed(2) : '0.00'}%</TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleViewDetails(result.attempt_id)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {results.length === 0 && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body1" gutterBottom>
            You haven't taken any tests yet.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/tests/mock')}
          >
            Take a Mock Test
          </Button>
        </Box>
      )}

      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Test Details</DialogTitle>
        <DialogContent>          {selectedTest && (
            <Box>
              {/* Summary statistics */}
              <Paper sx={{ p: 3, mb: 4, backgroundColor: '#f5f5f5' }}>
                <Typography variant="h6" gutterBottom>Test Summary</Typography>
                
                {/* Calculate correct/incorrect counts */}
                {(() => {
                  const total = selectedTest.questions.length;
                  const correct = selectedTest.questions.filter(q => q.is_correct).length;
                  const incorrect = total - correct;
                  const correctPercent = total > 0 ? Math.round((correct / total) * 100) : 0;
                  
                  return (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>Total Questions:</Typography>
                        <Typography fontWeight="bold">{total}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography color="success.main">Correct Answers:</Typography>
                        <Typography fontWeight="bold" color="success.main">{correct}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography color="error.main">Incorrect Answers:</Typography>
                        <Typography fontWeight="bold" color="error.main">{incorrect}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography>Score:</Typography>
                        <Typography fontWeight="bold">{correctPercent}%</Typography>
                      </Box>
                    </Box>
                  );
                })()}
              </Paper>
              
              {/* Questions with answers */}
              {selectedTest.questions.map((q, index) => (
                <Paper key={q.question_id} sx={{ p: 2, mb: 2, borderLeft: q.is_correct ? '4px solid #4caf50' : '4px solid #f44336' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Question {index + 1}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {q.question_text}
                  </Typography>
                  
                  {q.options.map((option, optIndex) => (
                    <Box 
                      key={option.option_id || optIndex}
                      sx={{
                        p: 1,
                        my: 0.5,
                        borderRadius: 1,
                        backgroundColor: 
                          q.correct_option_index === option.option_order
                            ? 'rgba(76, 175, 80, 0.1)'
                            : q.selected_option_index === option.option_order && !q.is_correct
                            ? 'rgba(244, 67, 54, 0.1)'
                            : 'transparent',
                        border: '1px solid',
                        borderColor:
                          q.correct_option_index === option.option_order
                            ? 'success.main'
                            : q.selected_option_index === option.option_order && !q.is_correct
                            ? 'error.main'
                            : 'transparent',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          color:
                            q.correct_option_index === option.option_order
                              ? 'success.main'
                              : q.selected_option_index === option.option_order && !q.is_correct
                              ? 'error.main'
                              : 'text.primary',
                          fontWeight:
                            q.selected_option_index === option.option_order ||
                            q.correct_option_index === option.option_order
                              ? 'bold'
                              : 'normal',
                        }}
                      >
                        {String.fromCharCode(65 + option.option_order)}. {option.option_text}
                        {q.selected_option_index === option.option_order && (
                          <span style={{ marginLeft: '8px' }}>
                            (Your answer)
                          </span>
                        )}
                      </Typography>
                    </Box>
                  ))}

                  <Box sx={{ mt: 2, p: 1, backgroundColor: q.is_correct ? 'rgba(76, 175, 80, 0.05)' : 'rgba(244, 67, 54, 0.05)' }}>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={q.is_correct ? 'success.main' : 'error.main'}
                    >
                      {q.is_correct ? '✓ Correct' : '✗ Incorrect'}
                    </Typography>
                    {!q.is_correct && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        <b>Explanation:</b> {q.explanation || "No explanation available."}
                      </Typography>
                    )}
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};
