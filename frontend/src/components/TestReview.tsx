import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';

interface Option {
  option_id: number;
  option_text: string;
  option_order: number;
}

interface Question {
  question_id: number;
  question_text: string;
  selected_option_index: number | null;
  correct_option_index: number;
  is_correct: boolean;
  explanation: string;
  options: Option[];
}

interface TestReviewProps {
  questions: Question[];
}

export const TestReview: React.FC<TestReviewProps> = ({ questions }) => {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Test Review
      </Typography>
      
      <Grid container spacing={3}>
        {/* Statistics */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2">Total Questions</Typography>
                <Typography variant="h6">{questions.length}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2">Correct Answers</Typography>
                <Typography variant="h6" color="success.main">
                  {questions.filter(q => q.is_correct).length}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2">Incorrect Answers</Typography>
                <Typography variant="h6" color="error.main">
                  {questions.filter(q => !q.is_correct && q.selected_option_index !== null).length}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Questions Review */}
        {questions.map((question, index) => (
          <Grid item xs={12} key={question.question_id}>
            <Paper sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Typography variant="subtitle1">
                  Question {index + 1}
                </Typography>
                {question.selected_option_index !== null && (
                  question.is_correct ? (
                    <Chip
                      icon={<CheckCircle />}
                      label="Correct"
                      color="success"
                      size="small"
                    />
                  ) : (
                    <Chip
                      icon={<Cancel />}
                      label="Incorrect"
                      color="error"
                      size="small"
                    />
                  )
                )}
              </Box>

              <Typography variant="body1" gutterBottom>
                {question.question_text}
              </Typography>

              <RadioGroup
                value={question.selected_option_index}
                sx={{ mt: 2, mb: 2 }}
              >
                {question.options.map((option) => (
                  <FormControlLabel
                    key={option.option_id}
                    value={option.option_order}
                    control={<Radio />}
                    label={
                      <Box component="span" sx={{
                        color: option.option_order === question.correct_option_index
                          ? 'success.main'
                          : option.option_order === question.selected_option_index && !question.is_correct
                            ? 'error.main'
                            : 'text.primary'
                      }}>
                        {option.option_text}
                      </Box>
                    }
                    disabled
                  />
                ))}
              </RadioGroup>

              {!question.is_correct && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="error">
                    Explanation:
                  </Typography>
                  <Typography variant="body2">
                    {question.explanation}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
