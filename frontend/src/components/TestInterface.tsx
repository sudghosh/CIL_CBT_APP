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
  CardContent
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { testsAPI } from '../services/api';
import { ErrorAlert } from './ErrorAlert';

interface QuestionOption {
  option_id: number;
  option_text: string;
  option_order: number;
}

interface Question {
  question_id: number;
  question_text: string;
  options: QuestionOption[] | string[]; // Support both object format and string array format
}

interface TestProps {
  attemptId: number;
  questions: Question[];
  onComplete: () => void;
  testDuration?: number; // Duration in minutes, optional with default fallback
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
    // Deep clone the question to avoid mutating the original
    const normalizedQuestion = JSON.parse(JSON.stringify(question)) as Question;
    
    // Initialize options with an empty array as fallback
    if (!normalizedQuestion.options) {
      console.warn(`Question ID ${normalizedQuestion.question_id} has no options, setting to empty array`);
      normalizedQuestion.options = [];
      return normalizedQuestion;
    }
    
    // Handle different options formats
    if (Array.isArray(normalizedQuestion.options)) {
      if (normalizedQuestion.options.length > 0) {
        if (typeof normalizedQuestion.options[0] === 'string') {
          // Convert string array to QuestionOption objects
          console.log(`Converting options from string[] to QuestionOption[] for question ${normalizedQuestion.question_id}`);
          normalizedQuestion.options = (normalizedQuestion.options as string[]).map((optionText, index) => ({
            option_id: index,
            option_text: optionText || `Option ${index + 1}`,
            option_order: index
          }));
        } else if (typeof normalizedQuestion.options[0] === 'object') {
          // Already objects, but ensure all required fields are present
          normalizedQuestion.options = (normalizedQuestion.options as any[]).map((option, index) => ({
            ...option,
            option_id: option.option_id ?? option.id ?? index,
            option_text: option.option_text || `Option ${index + 1}`,
            option_order: option.option_order ?? index
          }));
        }
      }
    } else if (typeof normalizedQuestion.options === 'string') {
      // Handle edge case where options might be a JSON string
      try {
        console.warn("Options is a string, attempting to parse:", normalizedQuestion.options);
        const parsedOptions = JSON.parse(normalizedQuestion.options as unknown as string);
        if (Array.isArray(parsedOptions)) {
          // Recursively call normalizeQuestionFormat with parsed options
          const tempQuestion = {...normalizedQuestion, options: parsedOptions};
          return normalizeQuestionFormat(tempQuestion);
        }
      } catch (e) {
        console.error("Failed to parse options string:", e);
        normalizedQuestion.options = [];
      }
    } else {
      console.warn(`Question ID ${normalizedQuestion.question_id} has invalid options format:`, normalizedQuestion.options);
      normalizedQuestion.options = [];
    }

    // Add detailed logging about the normalized options
    if (Array.isArray(normalizedQuestion.options)) {
      console.log(`Normalized question ${normalizedQuestion.question_id || 'unknown'} options:`, {
        count: normalizedQuestion.options.length,
        isArray: Array.isArray(normalizedQuestion.options),
        sampleOption: normalizedQuestion.options.length > 0 ? normalizedQuestion.options[0] : null,
        allOptions: normalizedQuestion.options
      });
    } else {
      console.warn(`Question ${normalizedQuestion.question_id || 'unknown'} has non-array options after normalization:`, 
        normalizedQuestion.options);
      // Final safety check - ensure options is always an array
      normalizedQuestion.options = [];
    }
    
    return normalizedQuestion;
  } catch (error) {
    // Catch any unexpected errors during normalization
    console.error(`Error normalizing question ${question.question_id || 'unknown'}:`, error);
    return {
      ...question,
      options: []
    };  }
}

export const TestInterface: React.FC<TestProps> = ({ attemptId, questions, onComplete, testDuration = 60 }): ReactElement => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  // Get duration from props instead of hardcoding
  const [timeLeft, setTimeLeft] = useState<number>(0); // Initialize to 0, will be set based on props
  const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);
  const [showConfirmLeave, setShowConfirmLeave] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSavingAnswer, setIsSavingAnswer] = useState<boolean>(false);
  const [isLeaving, setIsLeaving] = useState<boolean>(false);  // Filter questions if needed
  const [displayedQuestions, setDisplayedQuestions] = useState<Question[]>(questions || []);
  // Effect to handle filtering questions if needed based on section selection
  useEffect(() => {
    if (!questions || questions.length === 0) {
      console.warn('No questions provided to TestInterface component');
      setDisplayedQuestions([]);
      return;
    }
    
    try {
      // Process all questions to normalize their format
      console.log(`Processing ${questions.length} questions for the test`);
      
      // Log sample of the first question to help with debugging
      const firstQuestion = questions[0];
      if (firstQuestion) {
        console.log('First question before normalization:', {
          id: firstQuestion.question_id,
          text: firstQuestion.question_text,
          optionsType: typeof firstQuestion.options,
          isArray: Array.isArray(firstQuestion.options),
          optionsLength: firstQuestion.options ? 
            (Array.isArray(firstQuestion.options) ? firstQuestion.options.length : 'not an array') : 0,
          firstOptionType: firstQuestion.options && 
            Array.isArray(firstQuestion.options) && 
            firstQuestion.options.length > 0 ? 
              typeof firstQuestion.options[0] : 'none',
          optionsRaw: firstQuestion.options
        });
      }
      
      // Create a deep copy to prevent any mutation issues and ensure safety
      let questionsCopy;
      try {
        questionsCopy = JSON.parse(JSON.stringify(questions));
      } catch (jsonError) {
        console.error('Error creating deep copy of questions, falling back to shallow copy:', jsonError);
        // Fallback to shallow copy if JSON serialization fails
        questionsCopy = [...questions];
      }
      
      // Normalize all questions to ensure consistent options format
      // Add extra safety with try-catch for each question
      const normalizedQuestions = questionsCopy.map((q: Question, index: number) => {
        try {
          return normalizeQuestionFormat(q);
        } catch (normError) {
          console.error(`Error normalizing question at index ${index}:`, normError);
          // Return a safe fallback question if normalization fails
          return {
            question_id: q.question_id || index,
            question_text: q.question_text || `Question ${index + 1} (Error loading)`,
            options: []
          };
        }
      });
      
      // Log the normalized version of the first question
      if (normalizedQuestions.length > 0) {
        console.log('First question after normalization:', {
          id: normalizedQuestions[0].question_id,
          optionsLength: normalizedQuestions[0].options.length,
          sampleOption: normalizedQuestions[0].options[0],
          allOptions: normalizedQuestions[0].options
        });
      }
      
      // Update the state with normalized questions
      setDisplayedQuestions(normalizedQuestions);
    } catch (error) {
      console.error('Error normalizing questions:', error);
      setError('Error processing questions. Please try refreshing the page.');
      // Set empty questions array as fallback
      setDisplayedQuestions([]);
    }
  }, [questions]);

  // Memoize handleSubmitTest to prevent infinite dependency loop
  const handleSubmitTest = useCallback(async () => {
    try {
      if (markedForReview.size > 0) {
        const confirmSubmit = window.confirm(
          `You have ${markedForReview.size} question(s) marked for review. Are you sure you want to submit?`
        );
        if (!confirmSubmit) {
          return;
        }
      }

      setIsSubmitting(true);
      setError(null);
      await testsAPI.finishTest(attemptId);
      onComplete();
    } catch (err) {
      setError('Failed to submit test. Please try again.');
      console.error('Test submission error:', err);
    } finally {
      setIsSubmitting(false);
      setShowConfirmSubmit(false);
    }
  }, [attemptId, markedForReview.size, onComplete]);

  // Handle leave test functionality
  const handleLeaveTest = useCallback(async () => {
    try {
      setIsLeaving(true);
      setError(null);
      await testsAPI.abandonTest(attemptId);
      onComplete(); // Return to the test selection page
    } catch (err) {
      setError('Failed to leave test. Please try again.');
      console.error('Test abandonment error:', err);
    } finally {
      setIsLeaving(false);
      setShowConfirmLeave(false);
    }
  }, [attemptId, onComplete]);
  
  // Initialize timer based on testDuration prop
  useEffect(() => {
    // Convert minutes to seconds
    const durationInSeconds = testDuration * 60;
    setTimeLeft(durationInSeconds);
    
    console.log(`Setting test duration to ${testDuration} minutes (${durationInSeconds} seconds)`);
  }, [testDuration]);

  // Timer effect with cleanup
  useEffect(() => {
    let isActive = true;
    const timer = setInterval(() => {
      if (!isActive) return;
      
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      isActive = false;
      clearInterval(timer);
    };
  }, [handleSubmitTest]);

  const handleAnswerChange = async (questionId: number, optionIndex: number) => {
    if (isSubmitting || isSavingAnswer) return;
    
    try {
      setIsSavingAnswer(true);
      setError(null);
      
      // Optimistically update UI
      setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
      
      const submission: AnswerSubmission = {
        question_id: questionId,
        selected_option_index: optionIndex,
        time_taken_seconds: testDuration * 60 - timeLeft,
        is_marked_for_review: markedForReview.has(questionId)
      };

      await testsAPI.submitAnswer(attemptId, submission);
    } catch (err) {
      setError('Failed to save answer. Please try again.');
      console.error('Answer submission error:', err);
      // Revert the answer in UI if save failed
      setAnswers((prev) => {
        const newAnswers = { ...prev };
        delete newAnswers[questionId];
        return newAnswers;
      });
    } finally {
      setIsSavingAnswer(false);
    }
  };

  const handleMarkForReview = async (questionId: number) => {
    if (isSubmitting) return;
    
    try {
      setError(null);
      setMarkedForReview((prev) => {
        const newSet = new Set(prev);
        if (prev.has(questionId)) {
          newSet.delete(questionId);
        } else {
          newSet.add(questionId);
        }
        return newSet;
      });

      await testsAPI.toggleMarkForReview(attemptId, questionId);
    } catch (err) {
      setError('Failed to mark question for review. Please try again.');
      console.error('Mark for review error:', err);
      // Revert UI state on error
      setMarkedForReview((prev) => new Set(prev));
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleNavigateQuestion = (index: number) => {
    if (index < 0 || index >= displayedQuestions.length || isSubmitting) return;
    setCurrentQuestionIndex(index);
  };  // Make sure we have a valid current question, use default if not
  const currentQuestionRaw = displayedQuestions[currentQuestionIndex];
  const currentQuestion = (() => {
    try {
      // Try to normalize the current question
      if (currentQuestionRaw) {
        return normalizeQuestionFormat(currentQuestionRaw);
      }
    } catch (error) {
      console.error('Error normalizing current question:', error);
    }
    
    // Fallback if question is missing or normalization fails
    return {
      question_id: currentQuestionRaw?.question_id || 0,
      question_text: currentQuestionRaw?.question_text || 'Loading question...',
      options: []
    };
  })();

  // Extra debug logging for current question
  useEffect(() => {
    if (currentQuestionRaw) {
      console.log('Current question raw data:', currentQuestionRaw);
      console.log('Current question normalized data:', currentQuestion);
    }
  }, [currentQuestionIndex, currentQuestionRaw, displayedQuestions]);
  return (
    <Box sx={{ maxWidth: '900px', mx: 'auto', mb: 4 }}>
      <ErrorAlert error={error} onClose={() => setError(null)} />

      {/* Timer and Progress */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Standard Test
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body1">
              Time Left: {formatTime(timeLeft)}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={(currentQuestionIndex + 1) / displayedQuestions.length * 100} 
            sx={{ height: 10, borderRadius: 5 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="caption">
              Question {currentQuestionIndex + 1} of {displayedQuestions.length}
            </Typography>
            <Typography variant="caption">Standard Test</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Question and Options */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Question {currentQuestionIndex + 1}
          </Typography>
          <Typography variant="body1">
            {currentQuestion.question_text}
          </Typography>
        </Box>
        
        <RadioGroup
          value={answers[currentQuestion.question_id] ?? ''}
          onChange={(e) => handleAnswerChange(currentQuestion.question_id, parseInt(e.target.value, 10))}
        >          {(() => {
            console.log('Rendering RadioGroup with options:', currentQuestion.options);
            
            if (!Array.isArray(currentQuestion.options)) {
              console.error(`Options for question ${currentQuestion.question_id} should be an array but got:`, typeof currentQuestion.options);
              return <Typography color="error">Invalid options format</Typography>;
            }
            
            if (currentQuestion.options.length === 0) {
              console.warn(`No options available for question ${currentQuestion.question_id}`);
              return <Typography color="error">No options available for this question</Typography>;
            }
            
            return (currentQuestion.options as QuestionOption[]).map((option, index) => {
              // Extra safety check for null/undefined options
              if (!option) {
                console.error(`Option at index ${index} for question ${currentQuestion.question_id} is null/undefined`);
                return null;
              }
              
              try {                
                const optionId = option.option_id !== undefined ? option.option_id : index;
                const optionOrder = option.option_order !== undefined ? option.option_order : index;
                // Use a more robust fallback chain for option text
                const optionText = typeof option === 'string' 
                  ? option 
                  : option.option_text || (option as any).text || `Option ${index + 1}`;
                
                // Create a truly unique key using both question ID and option ID
                const uniqueKey = `option-${currentQuestion.question_id}-${optionId}`;
                console.log(`Option ${index}:`, { optionId, optionText, uniqueKey });
                
                return (
                  <FormControlLabel
                    key={uniqueKey}
                    value={optionOrder}
                    control={<Radio disabled={isSubmitting || isSavingAnswer} />}
                    label={optionText}
                    sx={{ mb: 1, display: 'block' }}
                  />
                );
              } catch (error) {
                console.error(`Error rendering option at index ${index}:`, error, option);
                return (
                  <FormControlLabel
                    key={`error-option-${index}`}
                    value={index}
                    control={<Radio disabled={true} />}
                    label={`Error loading option ${index + 1}`}
                    sx={{ mb: 1, display: 'block' }}
                  />
                );              }
            }).filter(Boolean); // Filter out null entries if any
          })()}
        </RadioGroup>
      </Paper>
        {/* Navigation */}
      <Box sx={{ mt: 3 }}>
        <Grid container spacing={2} justifyContent="space-between">
          <Grid item>
            <Button
              variant="outlined"
              disabled={currentQuestionIndex === 0 || isSubmitting}
              onClick={() => handleNavigateQuestion(currentQuestionIndex - 1)}
            >
              Previous
            </Button>
          </Grid>
          <Grid item>
            <Button
              color={markedForReview.has(currentQuestion.question_id) ? 'secondary' : 'primary'}
              variant="outlined"
              onClick={() => handleMarkForReview(currentQuestion.question_id)}
              disabled={isSubmitting}
            >
              {markedForReview.has(currentQuestion.question_id)
                ? 'Unmark for Review'
                : 'Mark for Review'}
            </Button>
          </Grid>
          <Grid item>
            {currentQuestionIndex === displayedQuestions.length - 1 ? (
              <Button
                variant="contained"
                color="primary"
                onClick={() => setShowConfirmSubmit(true)}
                disabled={isSubmitting}
              >
                Submit Test
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleNavigateQuestion(currentQuestionIndex + 1)}
                disabled={isSubmitting}
              >
                Next
              </Button>
            )}
          </Grid>
        </Grid>
      </Box>      {/* Leave Test Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
        <Button
          variant="outlined"
          color="error"
          onClick={() => setShowConfirmLeave(true)}
          disabled={isSubmitting || isLeaving}
          sx={{ minWidth: '150px' }}
          startIcon={isLeaving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isLeaving ? 'Leaving...' : 'Leave Test'}
        </Button>
      </Box>{/* Question Palette */}
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Question Palette
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={1}>
            {displayedQuestions.map((q: Question, index: number) => (
              <Grid item key={q.question_id}>
                <Chip
                  label={index + 1}
                  color={
                    markedForReview.has(q.question_id)
                      ? 'secondary'
                      : answers[q.question_id] !== undefined
                      ? 'success'
                      : 'default'
                  }
                  onClick={() => handleNavigateQuestion(index)}
                  sx={{ 
                    cursor: 'pointer',
                    fontWeight: currentQuestionIndex === index ? 'bold' : 'normal',
                    border: currentQuestionIndex === index ? '2px solid' : 'none'
                  }}
                  disabled={isSubmitting}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip size="small" color="success" sx={{ width: 30 }} />
            <Typography variant="caption">Answered</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip size="small" color="secondary" sx={{ width: 30 }} />
            <Typography variant="caption">Marked for Review</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip size="small" color="default" sx={{ width: 30 }} />
            <Typography variant="caption">Not Answered</Typography>
          </Box>
        </Box>      </Paper>      {/* Debug information section removed */}
      
      {/* Confirm Submit Dialog */}
      <Dialog 
        open={showConfirmSubmit} 
        onClose={() => !isSubmitting && setShowConfirmSubmit(false)}
      >
        <DialogTitle>Submit Test?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to submit the test? This action cannot be undone.
          </Typography>          
          <Typography color="error" sx={{ mt: 2 }}>
            Unanswered Questions: {displayedQuestions.length - Object.keys(answers).length}
          </Typography>
          <Typography color="secondary">
            Questions Marked for Review: {markedForReview.size}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowConfirmSubmit(false)} 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitTest}
            variant="contained"
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Submit Test'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Leave Dialog */}
      <Dialog 
        open={showConfirmLeave} 
        onClose={() => !isLeaving && setShowConfirmLeave(false)}
      >
        <DialogTitle>Leave Test?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to leave the test? Your progress will be saved, but the test will be marked as abandoned and won't be fully scored.
          </Typography>
          <Typography color="error" sx={{ mt: 2 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowConfirmLeave(false)}
            disabled={isLeaving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleLeaveTest}
            color="error"
            disabled={isLeaving}
            variant="contained"
          >
            {isLeaving ? <CircularProgress size={24} /> : 'Leave Test'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
