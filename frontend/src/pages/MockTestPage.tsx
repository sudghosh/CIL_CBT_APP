import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { testsAPI } from '../services/api';
import { TestInterface } from '../components/TestInterface';
import { ThemedTestInterface } from '../components/ThemedTestInterface';
import { TestCustomizationComponent } from '../components/TestCustomizationComponent';
import { TestInstructionsComponent } from '../components/TestInstructionsComponent';
import { CreateTestTemplateRequest, DifficultyStrategy } from '../types';

interface SelectedPaper {
  paper_id: number;
  paper_name: string;
}

type MockTestPhase = 'customization' | 'instructions' | 'test';

export const MockTestPage: React.FC = () => {
  const [phase, setPhase] = useState<MockTestPhase>('customization');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [questions, setQuestions] = useState([]);
  
  // Test configuration state
  const [selectedPapers, setSelectedPapers] = useState<SelectedPaper[]>([]);
  const [timeLimit, setTimeLimit] = useState<number>(180); // Default 3 hours
  const [difficultyStrategy, setDifficultyStrategy] = useState<string>('balanced'); // Default strategy
  const [actualQuestionCounts, setActualQuestionCounts] = useState<{[paperId: number]: number}>({});
  
  const navigate = useNavigate();

  const handleCustomizationNext = (papers: SelectedPaper[], timeLimitMinutes: number, strategy: string) => {
    setSelectedPapers(papers);
    setTimeLimit(timeLimitMinutes);
    setDifficultyStrategy(strategy);
    setPhase('instructions');
  };

  const handleCustomizationCancel = () => {
    navigate('/dashboard');
  };

  const handleInstructionsBack = () => {
    setPhase('customization');
  };

  const startTest = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check available questions for each paper before creating template
      const sectionsWithAvailableCounts = await Promise.all(
        selectedPapers.map(async (paper) => {
          try {
            // Get available question count for this paper (all sections) - for UI information only
            const availableCount = await testsAPI.getAvailableQuestionCount(paper.paper_id);
            
            // For Mock tests, always request 100 questions per paper to enable backend repetition logic
            // The backend will handle repeating questions if fewer than 100 are available
            const questionCount = 100;
            
            console.log(`Paper ${paper.paper_id}: Available questions: ${availableCount}, Requesting: ${questionCount} (Mock test - backend will repeat if needed)`);
            
            // Store available count for UI feedback (to show user what's actually available)
            setActualQuestionCounts(prev => ({
              ...prev,
              [paper.paper_id]: availableCount
            }));
            
            return {
              paper_id: paper.paper_id,
              section_id: null, // All sections
              subsection_id: null, // All subsections
              question_count: questionCount, // Always 100 for mock tests
            };
          } catch (error) {
            console.error(`Failed to get question count for paper ${paper.paper_id}:`, error);
            // For mock tests, still request 100 questions even if API fails
            const questionCount = 100;
            setActualQuestionCounts(prev => ({
              ...prev,
              [paper.paper_id]: 0 // Unknown available count
            }));
            return {
              paper_id: paper.paper_id,
              section_id: null,
              subsection_id: null,
              question_count: questionCount, // Always 100 for mock tests
            };
          }
        })
      );

      // Create dynamic mock test template based on selected papers with available question counts
      const sections = sectionsWithAvailableCounts;

      const templateRequest: CreateTestTemplateRequest = {
        template_name: `Custom Mock Test - ${selectedPapers.map(p => p.paper_name).join(', ')}`,
        test_type: 'Mock',
        sections: sections,
        difficulty_strategy: difficultyStrategy as DifficultyStrategy, // Pass difficulty strategy for personalized question selection
      };

      const mockTemplate = await testsAPI.createTemplate(templateRequest);

      // Start the test with custom time limit
      const response = await testsAPI.startTest(
        mockTemplate.data.template_id, 
        timeLimit // Pass time limit in minutes
      );
      setAttemptId(response.data.attempt_id);
      
      // Get questions for this attempt
      const questionsResponse = await testsAPI.getQuestions(response.data.attempt_id);
      setQuestions(questionsResponse.data);
      
      setPhase('test');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start test');
    } finally {
      setLoading(false);
    }
  };

  const handleTestComplete = () => {
    navigate('/results');
  };

  // Render different phases of the mock test workflow
  const renderPhase = () => {
    switch (phase) {
      case 'customization':
        return (
          <TestCustomizationComponent
            onNext={handleCustomizationNext}
            onCancel={handleCustomizationCancel}
          />
        );
      
      case 'instructions':
        return (
          <TestInstructionsComponent
            selectedPapers={selectedPapers}
            timeLimit={timeLimit}
            onStartTest={startTest}
            onBack={handleInstructionsBack}
          />
        );
      
      case 'test':
        return attemptId ? (
          <ThemedTestInterface
            attemptId={attemptId}
            questions={questions}
            onComplete={handleTestComplete}
            testDuration={timeLimit}
            userInfo={{
              candidateName: 'Test User',
              examName: 'Mock Test',
              subject: selectedPapers.map(p => p.paper_name).join(', ')
            }}
          />
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Preparing your test...</Typography>
          </Box>
        );
      
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Loading overlay for test start */}
      {loading && phase === 'instructions' && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6">Starting your mock test...</Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while we prepare your questions
            </Typography>
          </Paper>
        </Box>
      )}

      {/* Error display */}
      {error && phase === 'instructions' && (
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 2, px: 2 }}>
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Box>
      )}

      {/* Question count info display */}
      {phase === 'instructions' && Object.keys(actualQuestionCounts).length > 0 && (
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 2, px: 2 }}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Mock Test Question Distribution:</strong>
              {selectedPapers.map(paper => {
                const availableCount = actualQuestionCounts[paper.paper_id];
                if (availableCount === 0) {
                  return ` ${paper.paper_name}: 100 questions (availability unknown)`;
                } else if (availableCount >= 100) {
                  return ` ${paper.paper_name}: 100 questions available`;
                } else {
                  return ` ${paper.paper_name}: 100 questions (${availableCount} unique + ${100 - availableCount} repeated)`;
                }
              }).filter(Boolean).join(', ')}
            </Typography>
          </Alert>
        </Box>
      )}

      {/* Render current phase */}
      {renderPhase()}
    </Box>
  );
};
