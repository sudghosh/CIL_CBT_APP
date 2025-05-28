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
                </TableCell>
                <TableCell>
                  {result.duration_minutes} / {result.total_allotted_duration_minutes} minutes
                </TableCell>
                <TableCell>{result.score.toFixed(2)}%</TableCell>
                <TableCell>{result.weighted_score.toFixed(2)}%</TableCell>
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
        <DialogContent>
          {selectedTest && (
            <Box>
              {selectedTest.questions.map((q, index) => (
                <Paper key={q.question_id} sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Question {index + 1}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {q.question_text}
                  </Typography>
                  
                  {q.options.map((option) => (
                    <Typography
                      key={option.option_id}
                      variant="body2"
                      sx={{
                        color:
                          q.correct_option_index === option.option_order
                            ? 'success.main'
                            : q.selected_option_index === option.option_order
                            ? 'error.main'
                            : 'text.primary',
                      }}
                    >
                      {String.fromCharCode(65 + option.option_order)}. {option.option_text}
                    </Typography>
                  ))}

                  <Box sx={{ mt: 1 }}>
                    <Typography
                      variant="body2"
                      color={q.is_correct ? 'success.main' : 'error.main'}
                    >
                      {q.is_correct ? 'Correct' : 'Incorrect'}
                    </Typography>
                    {!q.is_correct && (
                      <Typography variant="body2" color="text.secondary">
                        Explanation: {q.explanation}
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
