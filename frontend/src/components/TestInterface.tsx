import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { testsAPI } from '../services/api';

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

export const TestInterface: React.FC<TestProps> = ({ attemptId, questions, onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number | null }>({});
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(180 * 60); // 3 hours in seconds
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const handleSubmitTest = async () => {
    try {
      await testsAPI.finishTest(attemptId);
      onComplete();
    } catch (error) {
      console.error('Failed to submit test:', error);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [handleSubmitTest]);

  const handleAnswerChange = async (questionId: number, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));

    try {
      await testsAPI.submitAnswer(attemptId, {
        question_id: questionId,
        selected_option_index: optionIndex,
        time_taken_seconds: 180 * 60 - timeLeft,
        is_marked_for_review: markedForReview.has(questionId),
      });
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  const toggleMarkForReview = async (questionId: number) => {
    const newMarkedForReview = new Set(markedForReview);
    if (markedForReview.has(questionId)) {
      newMarkedForReview.delete(questionId);
    } else {
      newMarkedForReview.add(questionId);
    }
    setMarkedForReview(newMarkedForReview);

    try {
      await testsAPI.submitAnswer(attemptId, {
        question_id: questionId,
        selected_option_index: answers[questionId] ?? null,
        time_taken_seconds: 180 * 60 - timeLeft,
        is_marked_for_review: !markedForReview.has(questionId),
      });
    } catch (error) {
      console.error('Failed to update review status:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <Box sx={{ p: 3 }}>
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
          onChange={(e) =>
            handleAnswerChange(currentQuestion.question_id, parseInt(e.target.value))
          }
        >
          {currentQuestion.options.map((option) => (
            <FormControlLabel
              key={option.option_id}
              value={option.option_order}
              control={<Radio />}
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
            disabled={currentQuestionIndex === 0}
            onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
          >
            Previous
          </Button>
        </Grid>
        <Grid item>
          <Button
            color={markedForReview.has(currentQuestion.question_id) ? 'secondary' : 'primary'}
            variant="outlined"
            onClick={() => toggleMarkForReview(currentQuestion.question_id)}
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
            >
              Submit Test
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
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
                onClick={() => setCurrentQuestionIndex(index)}
                sx={{ cursor: 'pointer' }}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Confirm Submit Dialog */}
      <Dialog open={showConfirmSubmit} onClose={() => setShowConfirmSubmit(false)}>
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
          <Button onClick={() => setShowConfirmSubmit(false)}>Cancel</Button>
          <Button onClick={handleSubmitTest} variant="contained" color="primary">
            Submit Test
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
