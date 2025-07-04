import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Grid,
  Chip,
  Alert
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import QuizIcon from '@mui/icons-material/Quiz';
import NavigationIcon from '@mui/icons-material/Navigation';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

interface SelectedPaper {
  paper_id: number;
  paper_name: string;
}

interface TestInstructionsProps {
  selectedPapers: SelectedPaper[];
  timeLimit: number; // in minutes
  onStartTest: () => void;
  onBack: () => void;
}

export const TestInstructionsComponent: React.FC<TestInstructionsProps> = ({
  selectedPapers,
  timeLimit,
  onStartTest,
  onBack
}) => {
  // Calculate estimated questions (rough estimate based on typical CBT pattern)
  const estimatedQuestions = selectedPapers.length * 100; // Assuming ~100 questions per paper
  const timeInHours = Math.floor(timeLimit / 60);
  const timeInMinutes = timeLimit % 60;

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (mins === 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
      } else {
        return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`;
      }
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center" color="primary">
          Mock Test Instructions
        </Typography>
        
        <Typography variant="body1" paragraph align="center" color="text.secondary">
          Please read the following instructions carefully before starting your mock test.
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Test Summary Section */}
        <Card variant="outlined" sx={{ mb: 4, bgcolor: 'primary.50' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Test Summary
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <QuizIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Selected Papers
                  </Typography>
                  <Typography variant="h6">
                    {selectedPapers.length}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {selectedPapers.map((paper) => (
                      <Chip 
                        key={paper.paper_id}
                        label={paper.paper_name}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <AccessTimeIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Time Limit
                  </Typography>
                  <Typography variant="h6">
                    {formatTime(timeLimit)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <CheckCircleIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Est. Questions
                  </Typography>
                  <Typography variant="h6">
                    ~{estimatedQuestions}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (Approximate)
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Navigation Instructions */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            <NavigationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Navigation Instructions
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Question Navigation"
                secondary="Use 'Next' and 'Previous' buttons to navigate between questions. You can also use the question palette at the bottom."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Mark for Review"
                secondary="Click 'Mark for Review' to flag questions you want to revisit later. These will be highlighted in the question palette."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Question Status"
                secondary="Questions are color-coded: Green (Answered), Red (Not Answered), Blue (Marked for Review), Orange (Answered & Marked for Review)."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Submit Test"
                secondary="You can submit your test at any time using the 'Submit Test' button. The test will auto-submit when time expires."
              />
            </ListItem>
          </List>
        </Box>

        {/* Important Guidelines */}
        <Alert severity="warning" sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Important Guidelines
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText primary="• Ensure you have a stable internet connection throughout the test." />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Do not refresh the browser page or navigate away during the test." />
            </ListItem>
            <ListItem>
              <ListItemText primary="• The test will auto-save your answers as you progress." />
            </ListItem>
            <ListItem>
              <ListItemText primary="• You cannot pause the test once started - the timer will continue counting down." />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Make sure you're in a quiet environment where you won't be disturbed." />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Review your answers before final submission - you cannot change them afterward." />
            </ListItem>
          </List>
        </Alert>

        {/* Pre-Test Checklist */}
        <Card variant="outlined" sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pre-Test Checklist
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="I have read and understood all the instructions" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="I have a stable internet connection" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="I am in a quiet environment" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="I have sufficient time to complete the test" />
              </ListItem>
            </List>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            size="large"
          >
            Back to Customization
          </Button>
          
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={onStartTest}
            size="large"
            color="success"
            sx={{ 
              minWidth: 200,
              fontSize: '1.1rem',
              py: 1.5
            }}
          >
            Start Mock Test
          </Button>
        </Box>

        {/* Final Notice */}
        <Box sx={{ mt: 4, p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
          <Typography variant="body2" color="info.dark" align="center">
            <strong>Ready to begin?</strong> Once you click "Start Mock Test", the timer will begin and you won't be able to return to this page. 
            Make sure you've read all instructions carefully.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};
