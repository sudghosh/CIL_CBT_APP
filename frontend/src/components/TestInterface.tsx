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
  Theme
} from '@mui/material';
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
  options: QuestionOption[];
}

interface TestProps {
  attemptId: number;
  questions: Question[];
  onComplete: () => void;
}

interface AnswerSubmission {
  question_id: number;
  selected_option_index: number;
  time_taken_seconds: number;
  is_marked_for_review: boolean;
}

export const TestInterface: React.FC<TestProps> = ({ attemptId, questions, onComplete }): ReactElement => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number>(180 * 60); // 3 hours in seconds
  const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSavingAnswer, setIsSavingAnswer] = useState<boolean>(false);

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
        time_taken_seconds: 180 * 60 - timeLeft,
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
    if (index < 0 || index >= questions.length || isSubmitting) return;
    setCurrentQuestionIndex(index);
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <Box sx={{ p: 3 }}>
      <ErrorAlert error={error} onClose={() => setError(null)} />

      {/* Timer and Progress */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Question {currentQuestionIndex + 1} of {questions.length}
        </Typography>
        <Chip
          label={`Time Left: ${formatTime(timeLeft)}`}
          color={timeLeft < 300 ? 'error' : 'default'}
        />
      </Paper>

      {/* Question and Options */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" gutterBottom>
          {currentQuestion.question_text}
        </Typography>
        <RadioGroup
          value={answers[currentQuestion.question_id] ?? ''}
          onChange={(e) => handleAnswerChange(currentQuestion.question_id, parseInt(e.target.value, 10))}
        >
          {currentQuestion.options.map((option) => (
            <FormControlLabel
              key={option.option_id}
              value={option.option_order}
              control={<Radio disabled={isSubmitting || isSavingAnswer} />}
              label={option.option_text}
            />
          ))}
        </RadioGroup>
      </Paper>

      {/* Navigation */}
      <Grid container spacing={2} justifyContent="space-between">
        <Grid item>
          <Button
            variant="contained"
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
          {currentQuestionIndex === questions.length - 1 ? (
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
              onClick={() => handleNavigateQuestion(currentQuestionIndex + 1)}
              disabled={isSubmitting}
            >
              Next
            </Button>
          )}
        </Grid>
      </Grid>

      {/* Question Palette */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Question Palette
        </Typography>
        <Grid container spacing={1}>
          {questions.map((q, index) => (
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
                sx={{ cursor: 'pointer' }}
                disabled={isSubmitting}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

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
            Unanswered Questions: {questions.length - Object.keys(answers).length}
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
    </Box>
  );
};
