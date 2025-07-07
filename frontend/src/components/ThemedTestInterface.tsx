import React, { useState, useEffect, useCallback, ReactElement } from 'react';
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
  Theme,
  Card,
  CardContent,
  styled
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { testsAPI } from '../services/api';
import { ErrorAlert } from './ErrorAlert';
import { shuffleArray, shuffleOptionsInQuestions } from '../utils/shuffleUtils';
import { useSession } from '../contexts/SessionContext';

// Styled components for the new CBT theme
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
  actionType: 'save' | 'clear' | 'saveReview' | 'markNext' | 'submit';
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
      case 'saveReview':
        return `
          background: #2196F3;
          color: white;
          border: 2px solid #2196F3;
          &:hover {
            background: #1976D2;
            border-color: #1976D2;
          }
        `;
      case 'markNext':
        return `
          background: #9C27B0;
          color: white;
          border: 2px solid #9C27B0;
          &:hover {
            background: #7B1FA2;
            border-color: #7B1FA2;
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

const NavigationSidebar = styled(Box)({
  width: '300px',
  height: 'fit-content',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  border: '1px solid #e0e0e0',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  padding: '16px',
});

const NavigationGrid = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginBottom: '20px',
});

const QuestionButton = styled(Button)<{ status: 'notVisited' | 'notAnswered' | 'answered' | 'markedForReview' }>(
  ({ status }) => {
    const getStatusStyles = () => {
      switch (status) {
        case 'notVisited':
          return {
            backgroundColor: '#ffffff',
            color: '#333333',
            border: '1px solid #e0e0e0',
          };
        case 'notAnswered':
          return {
            backgroundColor: 'rgb(255, 69, 0)',
            color: '#ffffff',
          };
        case 'answered':
          return {
            backgroundColor: 'rgb(41, 191, 69)',
            color: '#ffffff',
          };
        case 'markedForReview':
          return {
            backgroundColor: 'rgb(128, 0, 128)',
            color: '#ffffff',
          };
        default:
          return {};
      }
    };

    return {
      ...getStatusStyles(),
      minWidth: '32px',
      minHeight: '32px',
      width: '32px',
      height: '32px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 600,
      fontFamily: 'Arial, sans-serif',
      '&:hover': {
        opacity: 0.8,
      },
    };
  }
);

const StatusLegend = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
});

const LegendItem = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '12px',
  fontFamily: 'Arial, sans-serif',
  color: '#666666',
});

const LegendColor = styled(Box)<{ color: string }>(({ color }) => ({
  width: '16px',
  height: '16px',
  backgroundColor: color,
  borderRadius: '2px',
  border: color === '#ffffff' ? '1px solid #e0e0e0' : 'none',
}));

interface QuestionOption {
  option_id: number;
  option_text: string;
  option_order: number;
  originalIndex?: number;
  originalPreservedValue?: number;
}

interface Question {
  question_id: number;
  question_text: string;
  options: QuestionOption[] | string[];
}

interface ThemedTestInterfaceProps {
  attemptId: number;
  questions: Question[];
  onComplete: () => void;
  testDuration?: number;
  userInfo?: {
    candidateName?: string;
    examName?: string;
    subject?: string;
  };
}

interface AnswerSubmission {
  question_id: number;
  selected_option_index: number;
  time_taken_seconds: number;
  is_marked_for_review: boolean;
}

// Helper function to normalize question options format
const normalizeQuestionFormat = (question: Question): Question => {
  try {
    const normalizedQuestion = JSON.parse(JSON.stringify(question)) as Question;
    
    if (!normalizedQuestion.options) {
      console.warn(`Question ID ${normalizedQuestion.question_id} has no options, setting to empty array`);
      normalizedQuestion.options = [];
      return normalizedQuestion;
    }
    
    if (Array.isArray(normalizedQuestion.options)) {
      if (normalizedQuestion.options.length > 0) {
        if (typeof normalizedQuestion.options[0] === 'string') {
          normalizedQuestion.options = (normalizedQuestion.options as string[]).map((optionText, index) => ({
            option_id: index,
            option_text: optionText || `Option ${index + 1}`,
            option_order: index
          }));
        } else if (typeof normalizedQuestion.options[0] === 'object') {
          normalizedQuestion.options = (normalizedQuestion.options as any[]).map((option, index) => ({
            ...option,
            option_id: option.option_id ?? option.id ?? index,
            option_text: option.option_text || `Option ${index + 1}`,
            option_order: option.option_order ?? index
          }));
        }
      }
    } else {
      console.warn(`Question ID ${normalizedQuestion.question_id} has invalid options format`);
      normalizedQuestion.options = [];
    }
    
    return normalizedQuestion;
  } catch (error) {
    console.error(`Error normalizing question ${question.question_id || 'unknown'}:`, error);
    return {
      ...question,
      options: []
    };
  }
};

export const ThemedTestInterface: React.FC<ThemedTestInterfaceProps> = ({ 
  attemptId, 
  questions, 
  onComplete, 
  testDuration = 60,
  userInfo = {}
}): ReactElement => {
  // Session management for activity tracking
  const { markActivity } = useSession();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number>(testDuration * 60); // Convert minutes to seconds
  const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSavingAnswer, setIsSavingAnswer] = useState<boolean>(false);
  const [displayedQuestions, setDisplayedQuestions] = useState<Question[]>(questions || []);
  const [currentShuffledQuestion, setCurrentShuffledQuestion] = useState<Question | null>(null);

  // Effect to handle filtering questions
  useEffect(() => {
    if (!questions || questions.length === 0) {
      console.warn('No questions provided to ThemedTestInterface component');
      setDisplayedQuestions([]);
      return;
    }
    
    try {
      let questionsCopy;
      try {
        questionsCopy = JSON.parse(JSON.stringify(questions));
      } catch (jsonError) {
        console.error('Error creating deep copy of questions, falling back to shallow copy:', jsonError);
        questionsCopy = [...questions];
      }
      
      const normalizedQuestions = questionsCopy.map((q: Question) => {
        try {
          return normalizeQuestionFormat(q);
        } catch (error) {
          console.error(`Failed to normalize question ${q.question_id}:`, error);
          return { ...q, options: [] };
        }
      });

      console.log(`Processed ${normalizedQuestions.length} questions for themed test`);
      setDisplayedQuestions(normalizedQuestions);
    } catch (error) {
      console.error('Error processing questions for themed test:', error);
      setDisplayedQuestions([]);
      setError('Failed to process test questions. Please try again.');
    }
  }, [questions]);

  // Effect to shuffle options for current question
  useEffect(() => {
    if (displayedQuestions.length > 0 && currentQuestionIndex < displayedQuestions.length) {
      const currentQuestion = displayedQuestions[currentQuestionIndex];
      if (currentQuestion && Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0) {
        try {
          // Create a unique key for this question instance
          const questionKey = `${currentQuestion.question_id}-${currentQuestionIndex}`;
          
          // Create a copy of the current question to shuffle
          const questionCopy = { ...currentQuestion };
          
          // Ensure options is an array before shuffling
          if (!Array.isArray(questionCopy.options)) {
            console.warn('Options is not an array, normalizing before shuffle');
            questionCopy.options = [];
          }
          
          // Handle mixed option types (string[] or QuestionOption[])
          if (questionCopy.options.length > 0 && typeof questionCopy.options[0] === 'object') {
            // Options are QuestionOption objects
            const shuffledOptions = shuffleArray([...questionCopy.options] as QuestionOption[], 'option_order');
            const shuffledQuestion = { ...questionCopy, options: shuffledOptions };
            setCurrentShuffledQuestion(shuffledQuestion);
          } else {
            // Options are strings, no shuffling needed
            setCurrentShuffledQuestion(questionCopy);
          }
        } catch (error) {
          console.error('Error shuffling options for current question:', error);
          setCurrentShuffledQuestion(currentQuestion);
        }
      } else {
        setCurrentShuffledQuestion(currentQuestion);
      }
    } else {
      setCurrentShuffledQuestion(null);
    }
  }, [displayedQuestions, currentQuestionIndex]);

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

  // Format time display
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get question status for navigation
  const getQuestionStatus = (questionIndex: number): 'notVisited' | 'notAnswered' | 'answered' | 'markedForReview' => {
    const question = displayedQuestions[questionIndex];
    if (!question) return 'notVisited';
    
    const questionKey = `${question.question_id}-${questionIndex}`;
    const isMarked = markedForReview.has(questionIndex);
    const hasAnswer = answers[questionKey];
    
    if (questionIndex > currentQuestionIndex) {
      return 'notVisited';
    } else if (isMarked) {
      return 'markedForReview';
    } else if (hasAnswer) {
      return 'answered';
    } else {
      return 'notAnswered';
    }
  };

  // Handle answer selection
  const handleAnswerChange = useCallback(async (optionIndex: string) => {
    if (!currentShuffledQuestion) return;
    
    const questionKey = `${currentShuffledQuestion.question_id}-${currentQuestionIndex}`;
    setAnswers(prev => ({
      ...prev,
      [questionKey]: optionIndex
    }));

    // Mark user activity
    markActivity();

    // Auto-save answer
    try {
      setIsSavingAnswer(true);
      const submission: AnswerSubmission = {
        question_id: currentShuffledQuestion.question_id,
        selected_option_index: parseInt(optionIndex),
        time_taken_seconds: Math.round((testDuration * 60 - timeLeft)),
        is_marked_for_review: markedForReview.has(currentQuestionIndex)
      };
      
      await testsAPI.submitAnswer(attemptId, submission);
    } catch (error) {
      console.error('Failed to save answer:', error);
    } finally {
      setIsSavingAnswer(false);
    }
  }, [currentShuffledQuestion, currentQuestionIndex, attemptId, testDuration, timeLeft, markedForReview, markActivity]);

  // Navigation functions
  const goToNextQuestion = () => {
    if (currentQuestionIndex < displayedQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < displayedQuestions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  // Action handlers
  const handleSaveNext = () => {
    goToNextQuestion();
  };

  const handleClear = () => {
    if (!currentShuffledQuestion) return;
    const questionKey = `${currentShuffledQuestion.question_id}-${currentQuestionIndex}`;
    setAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[questionKey];
      return newAnswers;
    });
  };

  const handleSaveMarkReview = () => {
    setMarkedForReview(prev => new Set([...Array.from(prev), currentQuestionIndex]));
    goToNextQuestion();
  };

  const handleMarkReviewNext = () => {
    setMarkedForReview(prev => new Set([...Array.from(prev), currentQuestionIndex]));
    goToNextQuestion();
  };

  const handleSubmitTest = useCallback(async () => {
    try {
      setIsSubmitting(true);
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

  if (displayedQuestions.length === 0) {
    return (
      <TestContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading test questions...</Typography>
        </Box>
      </TestContainer>
    );
  }

  if (!currentShuffledQuestion) {
    return (
      <TestContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Preparing question...</Typography>
        </Box>
      </TestContainer>
    );
  }

  const currentAnswer = answers[`${currentShuffledQuestion.question_id}-${currentQuestionIndex}`] || '';

  return (
    <TestContainer>
      {/* Header */}
      <TestHeader>
        <UserInfoText>
          Candidate Name: {userInfo.candidateName || 'Test User'} | 
          Exam Name: {userInfo.examName || 'Practice Test'} | 
          Subject: {userInfo.subject || 'General'} | 
          Remaining Time: {formatTime(timeLeft)}
        </UserInfoText>
        {isSavingAnswer && <CircularProgress size={20} sx={{ color: '#666' }} />}
      </TestHeader>

      {/* Main Content */}
      <TestMainContent>
        {/* Question Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <QuestionArea>
            <QuestionTitle>
              Question {currentQuestionIndex + 1}:
            </QuestionTitle>
            
            <QuestionText>
              {currentShuffledQuestion.question_text}
            </QuestionText>

            <OptionsContainer>
              <RadioGroup value={currentAnswer} onChange={(e) => handleAnswerChange(e.target.value)}>
                {Array.isArray(currentShuffledQuestion.options) && 
                  currentShuffledQuestion.options.map((option, index) => {
                    const optionText = typeof option === 'string' ? option : option.option_text;
                    return (
                      <OptionItem
                        key={index}
                        value={index.toString()}
                        control={<Radio sx={{ color: '#666' }} />}
                        label={optionText}
                      />
                    );
                  })}
              </RadioGroup>
            </OptionsContainer>
          </QuestionArea>

          {/* Action Buttons */}
          <ActionButtonsContainer>
            <ActionButton 
              actionType="save" 
              onClick={handleSaveNext}
              disabled={currentQuestionIndex >= displayedQuestions.length - 1}
            >
              SAVE & NEXT
            </ActionButton>
            
            <ActionButton actionType="clear" onClick={handleClear}>
              CLEAR
            </ActionButton>
            
            <ActionButton actionType="saveReview" onClick={handleSaveMarkReview}>
              SAVE & MARK FOR REVIEW
            </ActionButton>
            
            <ActionButton actionType="markNext" onClick={handleMarkReviewNext}>
              MARK FOR REVIEW & NEXT
            </ActionButton>
            
            <ActionButton actionType="submit" onClick={() => setShowConfirmSubmit(true)}>
              SUBMIT
            </ActionButton>
          </ActionButtonsContainer>
        </Box>

        {/* Navigation Sidebar */}
        <NavigationSidebar>
          <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: 600 }}>
            Question Navigation
          </Typography>
          
          <NavigationGrid>
            {displayedQuestions.map((_, index) => (
              <QuestionButton
                key={index}
                status={getQuestionStatus(index)}
                onClick={() => goToQuestion(index)}
              >
                {index + 1}
              </QuestionButton>
            ))}
          </NavigationGrid>

          {/* Status Legend */}
          <Typography variant="subtitle2" sx={{ mb: 1, fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: 600 }}>
            Status Legend
          </Typography>
          
          <StatusLegend>
            <LegendItem>
              <LegendColor color="#ffffff" />
              <span>Not Visited</span>
            </LegendItem>
            <LegendItem>
              <LegendColor color="rgb(255, 69, 0)" />
              <span>Not Answered</span>
            </LegendItem>
            <LegendItem>
              <LegendColor color="rgb(41, 191, 69)" />
              <span>Answered</span>
            </LegendItem>
            <LegendItem>
              <LegendColor color="rgb(128, 0, 128)" />
              <span>Marked for Review</span>
            </LegendItem>
          </StatusLegend>
        </NavigationSidebar>
      </TestMainContent>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showConfirmSubmit} onClose={() => setShowConfirmSubmit(false)}>
        <DialogTitle>Confirm Test Submission</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to submit your test? You won't be able to make any changes after submission.
          </Typography>
          {markedForReview.size > 0 && (
            <Typography sx={{ mt: 1, color: 'orange' }}>
              Note: You have {markedForReview.size} question(s) marked for review.
            </Typography>
          )}
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
