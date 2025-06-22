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
import { shuffleArray, shuffleOptionsInQuestions } from '../utils/shuffleUtils';

interface QuestionOption {
  option_id: number;
  option_text: string;
  option_order: number;
  // Added by shuffleArray function:
  originalIndex?: number;
  originalPreservedValue?: number;
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
  // Store answers as strings to match RadioGroup value expectations
  const [answers, setAnswers] = useState<Record<number, string>>({});
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
  // Add a state to track the current question with shuffled options
  const [currentShuffledQuestion, setCurrentShuffledQuestion] = useState<Question | null>(null);

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
        // NEW: Randomize the options for each question, preserving original option_order
      const questionsWithRandomizedOptions = shuffleOptionsInQuestions(normalizedQuestions);
      console.log('Options have been randomized for all questions');
      
      // Log the normalized version of the first question
      if (questionsWithRandomizedOptions.length > 0) {
        const firstQuestion = questionsWithRandomizedOptions[0];
        console.log('First question after normalization and randomization:', {
          id: firstQuestion.question_id,
          optionsLength: firstQuestion.options.length,
          sampleOption: firstQuestion.options[0],
          allOptions: firstQuestion.options
        });
      }
      
      // Update the state with normalized and randomized questions
      // Cast to Question[] as we've verified the structure through normalization
      setDisplayedQuestions(questionsWithRandomizedOptions as Question[]);
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
  }, [handleSubmitTest]);  const handleAnswerChange = async (questionId: number, optionIndex: number) => {
    if (isSubmitting || isSavingAnswer) return;
    
    try {
      setIsSavingAnswer(true);
      setError(null);
      
      // Use the shuffled question if available (which contains the current display state)
      // or fall back to finding the question in the original questions array
      const questionForSubmission = 
        (currentShuffledQuestion && currentShuffledQuestion.question_id === questionId)
          ? currentShuffledQuestion
          : displayedQuestions.find(q => q.question_id === questionId);
          
      if (!questionForSubmission) {
        throw new Error(`Question with ID ${questionId} not found`);
      }
      
      // Find the selected option to get its original order/index
      const selectedOption = questionForSubmission.options[optionIndex];
      if (!selectedOption) {
        throw new Error(`Option at index ${optionIndex} not found in question ${questionId}`);
      }
      
      // Get the original option_order value
      // This is what was stored in the backend, so we need to use this for submission
      let originalOptionIndex = optionIndex; // Default fallback
      
      if (typeof selectedOption === 'object') {
        if ('originalPreservedValue' in selectedOption) {
          // Get original value that was stored during shuffling
          originalOptionIndex = selectedOption.originalPreservedValue as number;
          console.log(`Using preserved original option index ${originalOptionIndex} for display index ${optionIndex}`);
        } else if ('option_order' in selectedOption) {
          // Use option_order as fallback 
          originalOptionIndex = selectedOption.option_order as number;
          console.log(`Using option_order ${originalOptionIndex} as original index for display index ${optionIndex}`);
        }
      }
      
      // Optimistically update UI - store as string to match RadioGroup expectations
      setAnswers((prev) => ({ ...prev, [questionId]: String(optionIndex) }));
      
      const submission: AnswerSubmission = {
        question_id: questionId,
        selected_option_index: originalOptionIndex, // Use the original index, not the displayed one
        time_taken_seconds: testDuration * 60 - timeLeft,
        is_marked_for_review: markedForReview.has(questionId)
      };

      console.log(`Submitting answer for question ${questionId}: displayed index ${optionIndex}, original index ${originalOptionIndex}`);
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
  };  // Get the current question - prioritize the shuffled version if available
  const currentQuestionRaw = displayedQuestions[currentQuestionIndex];
  
  // Get the current question to display - either the shuffled version or fallback to original
  const currentQuestion = (() => {
    // First priority: Use shuffled question if available
    if (currentShuffledQuestion) {
      return currentShuffledQuestion;
    }
    
    // Second priority: Use normalized version of raw question
    try {
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
    if (currentQuestion) {
      console.log('Current question being displayed:', {
        id: currentQuestion.question_id,
        text: currentQuestion.question_text?.substring(0, 50) + '...',
        optionsShuffled: currentQuestion === currentShuffledQuestion ? 'Yes' : 'No',
        optionsCount: currentQuestion.options?.length || 0
      });
    }
  }, [currentQuestionIndex, currentQuestion, currentShuffledQuestion]);
  // Effect to handle changing questions with shuffled options
  // This ensures that options are randomized every time a different question is displayed
  // Original indices are preserved for correct answer submission to the backend
  useEffect(() => {
    if (displayedQuestions.length === 0 || currentQuestionIndex < 0 || currentQuestionIndex >= displayedQuestions.length) {
      setCurrentShuffledQuestion(null);
      return;
    }
    
    try {
      // Get the current question
      const currentQuestion = displayedQuestions[currentQuestionIndex];
      
      if (!currentQuestion) {
        console.warn(`No question found at index ${currentQuestionIndex}`);
        setCurrentShuffledQuestion(null);
        return;
      }
      
      if (!currentQuestion.options) {
        console.warn(`Question at index ${currentQuestionIndex} has no options`);
        // Normalize the question without shuffling
        setCurrentShuffledQuestion({
          ...currentQuestion,
          options: []
        });
        return;
      }
      
      // Create a deep clone of the question to avoid mutating the original
      let questionCopy;
      try {
        questionCopy = JSON.parse(JSON.stringify(currentQuestion));
      } catch (jsonError) {
        console.error('Error creating deep copy of current question:', jsonError);
        questionCopy = {...currentQuestion};
      }
      
      // Make sure options is an array before shuffling
      if (!Array.isArray(questionCopy.options)) {
        console.warn('Options is not an array, normalizing before shuffle');
        questionCopy.options = [];
      }
      
      // Shuffle options for current question only
      // This adds originalIndex and originalPreservedValue properties to track the original positions
      const shuffledOptions = shuffleArray([...questionCopy.options], 'option_order');
      
      // Create new question object with shuffled options
      const questionWithShuffledOptions = {
        ...questionCopy,
        options: shuffledOptions
      };
      
      // Log shuffling for debugging
      console.log(`Shuffled options for question ${currentQuestionIndex+1}/${displayedQuestions.length}`);
      
      // Update current question with shuffled options
      setCurrentShuffledQuestion(questionWithShuffledOptions);
    } catch (error) {
      console.error('Error shuffling options for current question:', error);
      // Fallback to unshuffled question
      const fallbackQuestion = displayedQuestions[currentQuestionIndex] || {
        question_id: 0,
        question_text: 'Error loading question',
        options: []
      };
      setCurrentShuffledQuestion(fallbackQuestion);
    }
  }, [displayedQuestions, currentQuestionIndex]);

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
          onChange={(e) => {
            // Parse the option index back to a number for internal processing
            const optionIndex = parseInt(e.target.value, 10);
            if (!isNaN(optionIndex)) {
              handleAnswerChange(currentQuestion.question_id, optionIndex);
            }
          }}
        >{(() => {
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
                // Handle both string and object option formats with proper type checking
                let optionId: number;
                let optionOrder: number;
                let optionText: string;
                
                if (typeof option === 'string') {
                  // For string options, use index as id and order
                  optionId = index;
                  optionOrder = index;
                  optionText = option;
                } else {
                  // For object options, extract properties with fallbacks
                  optionId = option.option_id !== undefined ? option.option_id : index;
                  optionOrder = option.option_order !== undefined ? option.option_order : index;
                  optionText = option.option_text || (option as any).text || `Option ${index + 1}`;
                }
                
                // Create a truly unique key using both question ID and option ID
                const uniqueKey = `option-${currentQuestion.question_id}-${optionId}`;
                console.log(`Option ${index}:`, { optionId, optionText, uniqueKey });
                  return (
                  <FormControlLabel
                    key={uniqueKey}
                    value={String(index)} // Use display index as value, convert to string for RadioGroup
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
