import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { testsAPI } from '../services/api';
import { TestInterface } from '../components/TestInterface';

export const MockTestPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testStarted, setTestStarted] = useState(false);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [questions, setQuestions] = useState([]);
  const navigate = useNavigate();

  const startTest = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get or create mock test template
      const templates = await testsAPI.getTemplates();
      let mockTemplate = templates.data.find((t: any) => t.test_type === 'Mock');
        if (!mockTemplate) {
        // Create mock test template if it doesn't exist
        mockTemplate = await testsAPI.createTemplate({
          template_name: 'Standard Mock Test',
          test_type: 'Mock',
          sections: [
            {
              paper_id: 1, // Paper I
              section_id: null, // All sections
              subsection_id: null, // All subsections
              question_count: 100,
            },
            {
              paper_id: 2, // Paper II
              question_count: 100,
            },
          ],
        });
      }

      // Start the test
      const response = await testsAPI.startTest(mockTemplate.template_id);
      setAttemptId(response.data.attempt_id);
      
      // Get questions for this attempt
      const questionsResponse = await testsAPI.getQuestions(response.data.attempt_id);
      setQuestions(questionsResponse.data);
      
      setTestStarted(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start test');
    } finally {
      setLoading(false);
    }
  };

  const handleTestComplete = () => {
    navigate('/results');
  };

  return (
    <Box>
      {!testStarted ? (
        <Paper sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>
          <Typography variant="h4" gutterBottom>
            Mock Test
          </Typography>
          <Typography variant="body1" paragraph>
            This is a full-length mock test that simulates the actual CIL CBT environment.
            The test consists of 200 questions (100 from Paper-I and 100 from Paper-II)
            and has a duration of 3 hours.
          </Typography>
          <Typography variant="body1" paragraph color="warning.main">
            Please ensure you have a stable internet connection and won't be disturbed
            for the next 3 hours.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={startTest}
            disabled={loading}
            fullWidth
          >
            {loading ? <CircularProgress size={24} /> : 'Start Mock Test'}
          </Button>
        </Paper>
      ) : (
        attemptId && (
          <TestInterface
            attemptId={attemptId}
            questions={questions}
            onComplete={handleTestComplete}
          />
        )
      )}
    </Box>
  );
};
