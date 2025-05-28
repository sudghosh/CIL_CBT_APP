import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TextField,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { testsAPI } from '../services/api';
import { TestInterface } from '../components/TestInterface';

interface Section {
  section_id: number;
  section_name: string;
  paper_id: number;
}

interface Paper {
  paper_id: number;
  paper_name: string;
  sections: Section[];
}

export const PracticeTestPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testStarted, setTestStarted] = useState(false);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [questions, setQuestions] = useState([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<number | ''>('');
  const [selectedSection, setSelectedSection] = useState<number | ''>('');
  const [questionCount, setQuestionCount] = useState('10');
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPapers = async () => {
      try {
        const response = await fetch('/api/papers');
        const data = await response.json();
        setPapers(data);
      } catch (err) {
        setError('Failed to load papers and sections');
      }
    };
    fetchPapers();
  }, []);

  const startTest = async () => {
    if (!selectedPaper || !selectedSection || !questionCount) {
      setError('Please select all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Create practice test template
      const template = await testsAPI.createTemplate({
        template_name: 'Practice Test',
        test_type: 'Practice',
        sections: [
          {
            paper_id: selectedPaper,
            section_id: selectedSection,
            question_count: parseInt(questionCount),
          },
        ],
      });

      // Start the test
      const response = await testsAPI.startTest(template.data.template_id);
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

  const availableSections = selectedPaper
    ? papers.find(p => p.paper_id === selectedPaper)?.sections || []
    : [];

  return (
    <Box>
      {!testStarted ? (
        <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto', mt: 4 }}>
          <Typography variant="h4" gutterBottom>
            Practice Test
          </Typography>
          <Typography variant="body1" paragraph>
            Create a custom practice test by selecting specific papers and sections.
            You can choose the number of questions you want to practice.
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Paper</InputLabel>
                <Select
                  value={selectedPaper}
                  onChange={(e) => {
                    setSelectedPaper(e.target.value as number);
                    setSelectedSection('');
                  }}
                  label="Paper"
                >
                  {papers.map((paper) => (
                    <MenuItem key={paper.paper_id} value={paper.paper_id}>
                      {paper.paper_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Section</InputLabel>
                <Select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value as number)}
                  label="Section"
                  disabled={!selectedPaper}
                >
                  {availableSections.map((section) => (
                    <MenuItem key={section.section_id} value={section.section_id}>
                      {section.section_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Number of Questions"
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                inputProps={{ min: 1, max: 100 }}
              />
            </Grid>
          </Grid>

          <Button
            variant="contained"
            color="primary"
            onClick={startTest}
            disabled={loading || !selectedPaper || !selectedSection || !questionCount}
            fullWidth
            sx={{ mt: 3 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Start Practice Test'}
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
