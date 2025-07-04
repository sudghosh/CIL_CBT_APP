import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  SelectChangeEvent
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { papersAPI } from '../services/api';

interface Paper {
  paper_id: number;
  paper_name: string;
  sections: Section[];
}

interface Section {
  section_id: number;
  section_name: string;
  paper_id: number;
}

interface SelectedPaper {
  paper_id: number;
  paper_name: string;
}

interface TestCustomizationProps {
  onNext: (selectedPapers: SelectedPaper[], timeLimit: number, difficultyStrategy: string) => void;
  onCancel?: () => void;
}

export const TestCustomizationComponent: React.FC<TestCustomizationProps> = ({
  onNext,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPapers, setSelectedPapers] = useState<SelectedPaper[]>([]);
  const [timeLimit, setTimeLimit] = useState<number>(180); // Default 3 hours (180 minutes)
  const [availablePaperSelection, setAvailablePaperSelection] = useState<number | ''>('');
  const [difficultyStrategy, setDifficultyStrategy] = useState<string>('balanced'); // Default strategy

  // Fetch papers on component mount
  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await papersAPI.getPapers();
      let papersData: Paper[] = [];
      
      if (response.data && typeof response.data === 'object' && 'items' in response.data && Array.isArray(response.data.items)) {
        papersData = response.data.items;
      } else if (response.data && Array.isArray(response.data)) {
        papersData = response.data;
      } else {
        console.warn('Unexpected papers response structure:', response.data);
        setError('Failed to load papers: Unexpected data format.');
        return;
      }

      // Ensure we have at least 1 paper available
      if (papersData.length === 0) {
        setError('No papers available. Please contact administrator to add papers.');
        return;
      }

      setPapers(papersData);
    } catch (err: any) {
      console.error('Error fetching papers:', err);
      const errorMessage = err.response?.data?.detail || 
                           err.message || 
                           'Failed to load papers';
      setError(errorMessage);
      setPapers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaper = () => {
    if (!availablePaperSelection) {
      setError('Please select a paper to add.');
      return;
    }

    const paperToAdd = papers.find(p => p.paper_id === availablePaperSelection);
    if (!paperToAdd) {
      setError('Selected paper not found.');
      return;
    }

    // Check if paper is already selected
    if (selectedPapers.some(p => p.paper_id === paperToAdd.paper_id)) {
      setError('This paper is already selected.');
      return;
    }

    setSelectedPapers(prev => [...prev, {
      paper_id: paperToAdd.paper_id,
      paper_name: paperToAdd.paper_name
    }]);
    setAvailablePaperSelection('');
    setError(null);
  };

  const handleRemovePaper = (paperId: number) => {
    setSelectedPapers(prev => prev.filter(p => p.paper_id !== paperId));
  };

  const handleTimeLimitChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    if (isNaN(value) || value <= 0) {
      setTimeLimit(1);
    } else if (value > 480) { // Maximum 8 hours
      setTimeLimit(480);
    } else {
      setTimeLimit(value);
    }
  };

  const handleNext = () => {
    // Validation
    if (selectedPapers.length === 0) {
      setError('Please select at least one paper for your mock test.');
      return;
    }

    if (timeLimit <= 0) {
      setError('Please enter a valid time limit greater than 0 minutes.');
      return;
    }

    // Clear error and proceed
    setError(null);
    onNext(selectedPapers, timeLimit, difficultyStrategy);
  };

  // Get available papers for selection (exclude already selected ones)
  const availablePapers = papers.filter(
    paper => !selectedPapers.some(selected => selected.paper_id === paper.paper_id)
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading papers...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center" color="primary">
          Customize Your Mock Test
        </Typography>
        
        <Typography variant="body1" paragraph align="center" color="text.secondary">
          Select the papers you want to include in your mock test and set your preferred time limit.
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Paper Selection Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Select Question Papers
          </Typography>
          
          <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Grid item xs={12} sm={8}>
              <FormControl fullWidth>
                <InputLabel>Available Papers</InputLabel>
                <Select
                  value={availablePaperSelection}
                  onChange={(e: SelectChangeEvent<number | string>) => setAvailablePaperSelection(e.target.value as number)}
                  label="Available Papers"
                  disabled={availablePapers.length === 0}
                >
                  {availablePapers.map((paper) => (
                    <MenuItem key={paper.paper_id} value={paper.paper_id}>
                      {paper.paper_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddPaper}
                disabled={!availablePaperSelection || availablePapers.length === 0}
                fullWidth
              >
                Add Paper
              </Button>
            </Grid>
          </Grid>

          {/* Selected Papers Display */}
          {selectedPapers.length > 0 && (
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Selected Papers ({selectedPapers.length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedPapers.map((paper) => (
                    <Chip
                      key={paper.paper_id}
                      label={paper.paper_name}
                      onDelete={() => handleRemovePaper(paper.paper_id)}
                      deleteIcon={<DeleteIcon />}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>

        {/* Time Limit Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Set Time Limit
          </Typography>
          <TextField
            fullWidth
            label="Time Limit (minutes)"
            type="number"
            value={timeLimit}
            onChange={handleTimeLimitChange}
            inputProps={{
              min: 1,
              max: 480,
              step: 1
            }}
            helperText="Enter test duration in minutes (minimum 1 minute, maximum 8 hours)"
            variant="outlined"
          />
        </Box>

        {/* Difficulty Strategy Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Choose Question Difficulty Strategy
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Difficulty Strategy</InputLabel>
            <Select
              value={difficultyStrategy}
              onChange={(e: SelectChangeEvent) => setDifficultyStrategy(e.target.value)}
              label="Difficulty Strategy"
            >
              <MenuItem value="hard_to_easy">Hard to Easy</MenuItem>
              <MenuItem value="easy_to_hard">Easy to Hard</MenuItem>
              <MenuItem value="balanced">Balanced</MenuItem>
              <MenuItem value="random">Random</MenuItem>
            </Select>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {difficultyStrategy === 'hard_to_easy' && 
                'Start with challenging questions, then easier ones based on your performance'}
              {difficultyStrategy === 'easy_to_hard' && 
                'Begin with easier questions, progressively increasing difficulty'}
              {difficultyStrategy === 'balanced' && 
                'Adaptive mix based on your historical performance with similar questions'}
              {difficultyStrategy === 'random' && 
                'Questions selected randomly from all difficulty levels'}
            </Typography>
          </FormControl>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          {onCancel && (
            <Button
              variant="outlined"
              onClick={onCancel}
              size="large"
            >
              Cancel
            </Button>
          )}
          
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={selectedPapers.length === 0 || timeLimit <= 0}
            size="large"
            sx={{ ml: 'auto' }}
          >
            Next: Review Instructions
          </Button>
        </Box>

        {/* Info Section */}
        <Box sx={{ mt: 4, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Note:</strong> You can select multiple papers to create a comprehensive mock test, 
            or choose a single paper for focused practice. The total number of questions will depend 
            on the papers you select.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};
