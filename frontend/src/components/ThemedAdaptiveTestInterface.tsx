import React, { useState, useEffect, useCallback } from 'react';
import type { JSX } from 'react';
import {
  Box,
  Paper,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  styled
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { testsAPI, api } from '../services/api';
import { ErrorAlert } from './ErrorAlert';
import { shuffleArray, WithOriginalValues } from '../utils/shuffleUtils';

// Reuse styled components from ThemedTestInterface
const TestContainer = styled(Box)({
  width: '100%',
  height: '100vh',
  fontFamily: 'Arial, sans-serif',
  backgroundColor: '#f5f5f5',
});

const TestHeader = styled(Box)({
  width: '100%',
  height: '80px',
  backgroundColor: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 20px',
  borderBottom: '1px solid #e0e0e0',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
});

const UserInfoText = styled(Typography)({
  fontFamily: 'Arial, sans-serif',
  fontSize: '14px',
  fontWeight: 400,
  lineHeight: '20px',
  color: '#333333',
});

const TestMainContent = styled(Box)({
  display: 'flex',
  width: '100%',
  height: 'calc(100vh - 80px)',
  padding: '20px',
  gap: '20px',
});

const QuestionArea = styled(Box)({
  width: '920px',
  height: '400px',
  backgroundColor: '#ffffff',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #e0e0e0',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
});

const QuestionTitle = styled(Typography)({
  fontSize: '18px',
  fontWeight: 700,
  fontFamily: 'Arial, sans-serif',
  color: '#333333',
  marginBottom: '8px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
});

const QuestionText = styled(Typography)({
  fontSize: '16px',
  fontWeight: 400,
  fontFamily: 'Arial, sans-serif',
  color: '#333333',
  lineHeight: '1.5',
  marginBottom: '16px',
});

const OptionsContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
});

const OptionItem = styled(FormControlLabel)({
  margin: '0',
  padding: '8px 12px',
  borderRadius: '4px',
  border: '1px solid #e0e0e0',
  '&:hover': {
    backgroundColor: '#f8f9fa',
  },
  '& .MuiFormControlLabel-label': {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    color: '#333333',
  },
});

const ActionButtonsContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  gap: '12px',
  justifyContent: 'center',
  marginTop: '20px',
  padding: '16px',
});

interface ActionButtonProps {
  actionType: 'save' | 'clear' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

const ActionButton = styled(Button)<ActionButtonProps>`
  min-width: 120px;
  height: 40px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  text-transform: none;
  transition: all 0.2s ease;
  
  ${({ actionType }) => {
    switch (actionType) {
      case 'save':
        return `
          background: #4CAF50;
          color: white;
          border: 2px solid #4CAF50;
          &:hover {
            background: #45a049;
            border-color: #45a049;
          }
          &:disabled {
            background: #cccccc;
            color: #666666;
            border-color: #cccccc;
          }
        `;
      case 'clear':
        return `
          background: #FF9800;
          color: white;
          border: 2px solid #FF9800;
          &:hover {
            background: #e68900;
            border-color: #e68900;
          }
        `;
      case 'submit':
        return `
          background: #f44336;
          color: white;
          border: 2px solid #f44336;
          &:hover {
            background: #d32f2f;
            border-color: #d32f2f;
          }
        `;
      default:
        return `
          background: #f5f5f5;
          color: #333;
          border: 2px solid #ddd;
        `;
    }
  }}
`;

const AdaptiveInfoSidebar = styled(Box)({
  width: '300px',
  height: 'fit-content',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  border: '1px solid #e0e0e0',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  padding: '16px',
});

const DifficultyIndicator = styled(Chip)<{ difficulty: string }>(({ difficulty }) => {
  const getDifficultyColor = () => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return { backgroundColor: 'rgb(41, 191, 69)', color: '#ffffff' };
      case 'medium':
        return { backgroundColor: 'rgb(255, 163, 0)', color: '#ffffff' };
      case 'hard':
        return { backgroundColor: 'rgb(255, 69, 0)', color: '#ffffff' };
      default:
        return { backgroundColor: '#e0e0e0', color: '#333333' };
    }
  };

  return {
    ...getDifficultyColor(),
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    fontWeight: 600,
  };
});

const ProgressContainer = styled(Box)({
  marginBottom: '16px',
});

const ProgressText = styled(Typography)({
  fontFamily: 'Arial, sans-serif',
  fontSize: '14px',
  fontWeight: 600,
  color: '#333333',
  marginBottom: '8px',
});

interface QuestionOption {
  id?: number;
  option_id?: number;
  option_text: string;
  option_order: number;
  originalIndex?: number;
  originalPreservedValue?: number;
}

interface Question {
  id?: number;
  question_id?: number;
  question_text: string;
  difficulty_level?: string;
  topic?: string;
  options: QuestionOption[] | string[];
}

interface ThemedAdaptiveTestInterfaceProps {
  attemptId: number;
  onComplete: () => void;
  adaptiveStrategy: string;
  testDuration?: number;
  userInfo?: {
    candidateName?: string;
    examName?: string;
    subject?: string;
  };
}

export const ThemedAdaptiveTestInterface = ({ 
  attemptId, 
  onComplete,
  adaptiveStrategy,
  testDuration = 60,
  userInfo = {}
}: ThemedAdaptiveTestInterfaceProps): JSX.Element => {
  // Current question state
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [testProgress, setTestProgress] = useState<number>(0);
  const [questionsAnswered, setQuestionsAnswered] = useState<number>(0);
  const [maxQuestions, setMaxQuestions] = useState<number | null>(null);
  const [isTestComplete, setIsTestComplete] = useState<boolean>(false);
  const [showDifficultyIndicator, setShowDifficultyIndicator] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<number>(testDuration * 60);

  // Timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmitTest();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Monitor test completion state for debugging
  useEffect(() => {
    console.log('[AdaptiveTest] State update:', {
      isTestComplete,
      questionsAnswered,
      maxQuestions,
      isLoading,
      selectedOption,
      buttonShouldBeDisabled: isLoading || selectedOption === null || isTestComplete || (maxQuestions !== null && questionsAnswered >= maxQuestions)
    });
  }, [isTestComplete, questionsAnswered, maxQuestions, isLoading, selectedOption]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle final test submission
  const handleSubmitTest = useCallback(async () => {
    try {
      setIsSubmitting(true);
      setIsTestComplete(true);
      setError(null);
      
      await testsAPI.finishTest(attemptId);
      onComplete();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to submit test');
    } finally {
      setIsSubmitting(false);
      setShowConfirmSubmit(false);
    }
  }, [attemptId, onComplete]);

  // Fetch next question from adaptive engine
  const fetchNextQuestion = useCallback(async () => {
    // Prevent fetching if test is already complete
    if (isTestComplete) {
      console.log('[AdaptiveTest] Test is already complete, preventing additional question fetch');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[AdaptiveTest] Fetching next question for attempt:', attemptId);
      const response = await api.get(`/tests/attempts/${attemptId}/next-question`);
      
      console.log('[AdaptiveTest] Response received:', response.data);
      
      if (response.data && response.data.question) {
        const question = response.data.question;
        
        // Normalize question format
        const normalizedQuestion: Question = {
          question_id: question.question_id || question.id,
          question_text: question.question_text,
          difficulty_level: question.difficulty_level || 'Medium',
          topic: question.topic,
          options: Array.isArray(question.options) ? question.options : []
        };

        // Shuffle options for security
        if (Array.isArray(normalizedQuestion.options) && normalizedQuestion.options.length > 0) {
          if (typeof normalizedQuestion.options[0] === 'object') {
            // Options are objects, shuffle them
            const shuffledOptions = shuffleArray([...normalizedQuestion.options] as QuestionOption[], 'option_order');
            normalizedQuestion.options = shuffledOptions;
          } else if (typeof normalizedQuestion.options[0] === 'string') {
            // Options are strings, convert to objects and shuffle
            const stringOptions = normalizedQuestion.options as string[];
            const optionObjects = stringOptions.map((text, index) => ({
              option_text: text,
              option_order: index
            }));
            const shuffledOptions = shuffleArray(optionObjects, 'option_order');
            normalizedQuestion.options = shuffledOptions;
          }
        }

        setCurrentQuestion(normalizedQuestion);
        setSelectedOption(null);
        setQuestionStartTime(Date.now());
        
        // Update progress
        const answeredCount = response.data.questions_answered || 0;
        const maxCount = response.data.max_questions || null;
        
        setQuestionsAnswered(answeredCount);
        setMaxQuestions(maxCount);
        setTestProgress(response.data.progress || 0);
        
        // Check if test should be complete (but don't auto-submit)
        if (maxCount !== null && answeredCount >= maxCount) {
          console.log('[AdaptiveTest] Test should be complete:', { answeredCount, maxCount });
          setIsTestComplete(true);
        }
      } else if (response.data && (response.data.test_complete || response.data.status === 'complete')) {
        // Test is complete - update progress info first
        const answeredCount = response.data.questions_answered || 0;
        const maxCount = response.data.max_questions || null;
        
        setQuestionsAnswered(answeredCount);
        setMaxQuestions(maxCount);
        setTestProgress(response.data.progress || 0);
        
        console.log('[AdaptiveTest] Test completed by backend:', { answeredCount, maxCount, status: response.data.status });
        setIsTestComplete(true);
        // Don't auto-submit - let user manually submit
      } else {
        // Handle unexpected response format
        console.error('[AdaptiveTest] Unexpected response format:', response.data);
        // Still check if we can extract progress information
        const answeredCount = response.data?.questions_answered || 0;
        const maxCount = response.data?.max_questions || null;
        
        if (answeredCount && maxCount && answeredCount >= maxCount) {
          console.log('[AdaptiveTest] Test should be complete based on progress:', { answeredCount, maxCount });
          setQuestionsAnswered(answeredCount);
          setMaxQuestions(maxCount);
          setIsTestComplete(true);
          // Don't auto-submit - let user manually submit
        } else {
          throw new Error('Invalid response format');
        }
      }
    } catch (error: any) {
      console.error('[AdaptiveTest] Error fetching next question:', error);
      
      // Check if the error response indicates test completion
      if (error.response?.status === 404 || 
          error.response?.data?.detail?.includes('complete') ||
          error.response?.data?.status === 'complete') {
        console.log('[AdaptiveTest] Test is complete (from error response)');
        setIsTestComplete(true);
        // Don't auto-submit - let user manually submit
      } else {
        setError(error.response?.data?.detail || 'Failed to load next question');
      }
    } finally {
      setIsLoading(false);
    }
  }, [attemptId, adaptiveStrategy, handleSubmitTest, isTestComplete]);

  // Submit answer and get next question
  const submitAnswer = useCallback(async () => {
    if (!currentQuestion || selectedOption === null) {
      setError('Please select an answer before proceeding');
      return;
    }

    // Prevent submission if test is already complete
    if (isTestComplete) {
      console.log('[AdaptiveTest] Test is already complete, preventing additional submission');
      return;
    }

    // Check if we've reached the maximum questions
    if (maxQuestions !== null && questionsAnswered >= maxQuestions) {
      console.log('[AdaptiveTest] Maximum questions reached, test complete. User must manually submit:', { questionsAnswered, maxQuestions });
      setIsTestComplete(true);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[AdaptiveTest] Submitting answer for question:', currentQuestion.question_id);

      const timeTaken = Math.round((Date.now() - questionStartTime) / 1000);
      
      // Calculate the correct option index for submission
      let submissionIndex = parseInt(selectedOption);
      
      // If options were shuffled, we need to get the original index
      if (Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0) {
        const selectedOptionData = currentQuestion.options[submissionIndex];
        if (selectedOptionData && typeof selectedOptionData === 'object' && 'originalIndex' in selectedOptionData) {
          submissionIndex = (selectedOptionData as any).originalIndex;
        }
      }
      
      const submission = {
        question_id: currentQuestion.question_id,
        selected_option_index: submissionIndex,
        time_taken_seconds: timeTaken,
        is_marked_for_review: false
      };

      await testsAPI.submitAnswer(attemptId, submission);
      
      // Fetch next question
      await fetchNextQuestion();
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      setError(error.response?.data?.detail || 'Failed to submit answer');
      setIsLoading(false);
    }
  }, [currentQuestion, selectedOption, questionStartTime, attemptId, fetchNextQuestion, isTestComplete, maxQuestions, questionsAnswered, handleSubmitTest]);

  // Clear selected answer
  const clearAnswer = () => {
    setSelectedOption(null);
  };

  // Initialize by fetching first question
  useEffect(() => {
    fetchNextQuestion();
  }, [fetchNextQuestion]);

  // Handle option selection
  const handleOptionChange = (optionIndex: string) => {
    setSelectedOption(optionIndex);
  };

  // Loading state
  if (isLoading && !currentQuestion) {
    return (
      <TestContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
          <Typography sx={{ ml: 2, fontFamily: 'Arial, sans-serif' }}>
            Loading adaptive test...
          </Typography>
        </Box>
      </TestContainer>
    );
  }

  // No question state
  if (!currentQuestion) {
    return (
      <TestContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Typography sx={{ fontFamily: 'Arial, sans-serif' }}>
            No question available. Please try again.
          </Typography>
        </Box>
      </TestContainer>
    );
  }

  return (
    <TestContainer>
      {/* Header */}
      <TestHeader>
        <UserInfoText>
          Candidate Name: {userInfo.candidateName || 'Test User'} | 
          Exam Name: {userInfo.examName || 'Adaptive Test'} | 
          Subject: {userInfo.subject || 'General'} | 
          Remaining Time: {formatTime(timeLeft)}
        </UserInfoText>
        {isLoading && <CircularProgress size={20} sx={{ color: '#666' }} />}
      </TestHeader>

      {/* Main Content */}
      <TestMainContent>
        {/* Question Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <QuestionArea>
            <QuestionTitle>
              Question {questionsAnswered + 1}:
              {showDifficultyIndicator && currentQuestion.difficulty_level && (
                <DifficultyIndicator 
                  difficulty={currentQuestion.difficulty_level} 
                  label={currentQuestion.difficulty_level}
                  size="small"
                />
              )}
            </QuestionTitle>
            
            <QuestionText>
              {currentQuestion.question_text}
            </QuestionText>

            <OptionsContainer>
              <RadioGroup value={selectedOption || ''} onChange={(e) => handleOptionChange(e.target.value)}>
                {Array.isArray(currentQuestion.options) && (() => {
                  // Check if this is a True/False question by looking for TRUE/FALSE in options
                  const allOptions = currentQuestion.options as (QuestionOption | string)[];
                  const trueFalseOptions = allOptions.filter((opt: QuestionOption | string) => {
                    const text = typeof opt === 'string' ? opt : opt.option_text;
                    return text && (text.toLowerCase().includes('true') || text.toLowerCase().includes('false'));
                  });
                  
                  const isTrueFalseQuestion = trueFalseOptions.length >= 2;
                  
                  // Use only TRUE/FALSE options for True/False questions, all options otherwise
                  const optionsToDisplay = isTrueFalseQuestion ? trueFalseOptions : allOptions;
                  
                  return optionsToDisplay.map((option: QuestionOption | string, index: number) => {
                    const optionText = typeof option === 'string' ? option : option.option_text;
                    
                    // For True/False questions, find the original index in the full options array
                    let valueToUse = index.toString();
                    if (isTrueFalseQuestion) {
                      const originalIndex = allOptions.findIndex((opt: QuestionOption | string) => {
                        const text = typeof opt === 'string' ? opt : opt.option_text;
                        return text === optionText;
                      });
                      valueToUse = originalIndex.toString();
                    }
                    
                    return (
                      <OptionItem
                        key={isTrueFalseQuestion ? valueToUse : index}
                        value={valueToUse}
                        control={<Radio sx={{ color: '#666' }} />}
                        label={isTrueFalseQuestion ? optionText : `${String.fromCharCode(65 + index)}. ${optionText}`}
                      />
                    );
                  });
                })()}
              </RadioGroup>
            </OptionsContainer>
          </QuestionArea>

          {/* Action Buttons */}
          <ActionButtonsContainer>
            <ActionButton 
              actionType="save" 
              onClick={submitAnswer}
              disabled={isLoading || selectedOption === null || isTestComplete || (maxQuestions !== null && questionsAnswered >= maxQuestions)}
            >
              {isLoading ? 'SUBMITTING...' : isTestComplete ? 'TEST COMPLETE' : 'SAVE & NEXT'}
            </ActionButton>
            
            <ActionButton actionType="clear" onClick={clearAnswer} disabled={isLoading}>
              CLEAR
            </ActionButton>
            
            <ActionButton actionType="submit" onClick={() => setShowConfirmSubmit(true)} disabled={isLoading}>
              SUBMIT TEST
            </ActionButton>
          </ActionButtonsContainer>
        </Box>

        {/* Adaptive Info Sidebar */}
        <AdaptiveInfoSidebar>
          <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: 600 }}>
            Test Progress
          </Typography>
          
          {/* Progress Info */}
          <ProgressContainer>
            <ProgressText>
              Questions Answered: {questionsAnswered}
              {maxQuestions && ` / ${maxQuestions}`}
            </ProgressText>
            {testProgress > 0 && (
              <LinearProgress 
                variant="determinate" 
                value={testProgress} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: '#e0e0e0',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: 'rgb(41, 191, 69)'
                  }
                }} 
              />
            )}
          </ProgressContainer>

          {/* Current Question Info */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: 600 }}>
              Current Question
            </Typography>
            
            {currentQuestion.difficulty_level && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#666' }}>
                  Difficulty:
                </Typography>
                <DifficultyIndicator 
                  difficulty={currentQuestion.difficulty_level} 
                  label={currentQuestion.difficulty_level}
                  size="small"
                />
              </Box>
            )}
            
            {currentQuestion.topic && (
              <Box>
                <Typography variant="body2" sx={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#666' }}>
                  Topic: {currentQuestion.topic}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Adaptive Strategy Info */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: 600 }}>
              Adaptive Strategy
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#666' }}>
              {adaptiveStrategy || 'Progressive'}
            </Typography>
          </Box>
        </AdaptiveInfoSidebar>
      </TestMainContent>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showConfirmSubmit} onClose={() => setShowConfirmSubmit(false)}>
        <DialogTitle>Confirm Test Submission</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to submit your adaptive test? You won't be able to make any changes after submission.
          </Typography>
          <Typography sx={{ mt: 1, color: '#666' }}>
            Questions answered: {questionsAnswered}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmSubmit(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmitTest} 
            disabled={isSubmitting}
            sx={{ backgroundColor: 'rgb(41, 191, 69)', color: 'white' }}
          >
            {isSubmitting ? <CircularProgress size={20} /> : 'Submit Test'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Alert */}
      {error && (
        <ErrorAlert 
          error={error} 
          onClose={() => setError(null)} 
        />
      )}

    </TestContainer>
  );
};
