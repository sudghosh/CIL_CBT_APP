import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Tooltip,
  Divider,
  Chip,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import { testsAPI, papersAPI } from '../services/api';
import { TestInterface } from '../components/TestInterface';
import { AdaptiveTestInterface } from '../components/AdaptiveTestInterface';
import { CreateTestTemplateRequest } from '../types';

interface Section {
  section_id: number;
  section_name: string;
  paper_id: number;
}

interface Paper {
  paper_id: number;
  paper_name: string;
  sections: Section[];
}

interface SectionSelection {
  paper_id: number;
  paper_name: string;
  section_id: number;
  section_name: string;
  question_count: number;
}

export const PracticeTestPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testStarted, setTestStarted] = useState(false);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<number | ''>('');
  const [selectedSection, setSelectedSection] = useState<number | ''>('');
  const [questionCount, setQuestionCount] = useState('10');
  const [selectedSections, setSelectedSections] = useState<SectionSelection[]>([]);
  const [availableQuestionCounts, setAvailableQuestionCounts] = useState<{[key: string]: number}>({});
  const [loadingCount, setLoadingCount] = useState(false);
  const [currentAvailableCount, setCurrentAvailableCount] = useState<number | null>(null);
  const [testDuration, setTestDuration] = useState<number>(60); // Default: 60 minutes
  
  // New states for adaptive testing
  const [isAdaptiveMode, setIsAdaptiveMode] = useState<boolean>(false);
  const [adaptiveStrategy, setAdaptiveStrategy] = useState<string>('progressive');
  const [isAdaptiveTestActive, setIsAdaptiveTestActive] = useState<boolean>(false);
  
  // Fetch available question count for a given paper and section
  const fetchAvailableQuestionCount = async (paperId: number, sectionId: number): Promise<number> => {
    setLoadingCount(true);
    try {
      // Don't proceed with invalid parameters
      if (!paperId || paperId <= 0) {
        console.error('[UI] Invalid paperId provided to fetchAvailableQuestionCount:', paperId);
        setCurrentAvailableCount(0);
        setError('Invalid paper selection. Please select a valid paper.');
        return 0;
      }

      const cacheKey = `${paperId}-${sectionId}`;
      
      console.log(`[UI] Fetching available count for paper=${paperId}, section=${sectionId}, cacheKey=${cacheKey}`);
      
      // Reset the error state when starting a new fetch
      setError(null);
      
      // Check if we already have this count cached (and it's not 0)
      if (availableQuestionCounts[cacheKey] !== undefined && availableQuestionCounts[cacheKey] > 0) {
        console.log(`[UI] Using cached count: ${availableQuestionCounts[cacheKey]}`);
        setCurrentAvailableCount(availableQuestionCounts[cacheKey]);
        return availableQuestionCounts[cacheKey];
      }
      
      // Wrap the API call in a timeout to prevent long waits
      const count = await Promise.race([
        testsAPI.getAvailableQuestionCount(paperId, sectionId),
        new Promise<number>((resolve) => {
          // After 5 seconds, return 0 if the API call is too slow
          setTimeout(() => {
            console.warn('[UI] Request timeout for available count');
            resolve(0);
          }, 5000);
        })
      ]);
      
      console.log(`[UI] Received count from API: ${count}`);
      
      // Update both the current value and the cache
      setCurrentAvailableCount(count);
      setAvailableQuestionCounts(prev => ({
        ...prev,
        [cacheKey]: count
      }));
        // If no questions are available, show a warning with more details
      if (count === 0) {
        // Check for specific error cases
        const cacheKey = `${paperId}-${sectionId}`;
        
        // If this was caused by an error (which is stored in a hidden UI state)
        const knownErrors = window.sessionStorage.getItem('section_errors') || '{}';
        const sectionErrors = JSON.parse(knownErrors);
        
        if (sectionErrors[cacheKey] === 404) {
          setError(`This section doesn't exist in the selected paper. Please select another section.`);
        } else if (sectionErrors[cacheKey] === 422) {
          setError(`Unable to load questions for this section (validation error). Please select another section.`);
        } else {
          setError('No active questions available in this section. Please select another section.');
        }
      } else {
        // Clear any previous error message if we have questions
        setError(null);
        
        // Also clear any stored error for this section
        const cacheKey = `${paperId}-${sectionId}`;
        const knownErrors = window.sessionStorage.getItem('section_errors') || '{}';
        const sectionErrors = JSON.parse(knownErrors);
        if (sectionErrors[cacheKey]) {
          delete sectionErrors[cacheKey];
          window.sessionStorage.setItem('section_errors', JSON.stringify(sectionErrors));
        }
      }
      
      return count;
    } catch (err) {
      console.error('[UI] Failed to fetch available question count:', err);
      setCurrentAvailableCount(0);
      setError('Failed to fetch available questions. Please try again or select a different section.');
      return 0;
    } finally {
      setLoadingCount(false);
    }
  };
  const fetchPapersData = async () => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      const response = await papersAPI.getPapers();
      let papersData: Paper[] = [];
      if (response.data && typeof response.data === 'object' && 'items' in response.data && Array.isArray(response.data.items)) {
        papersData = response.data.items;
      } else if (response.data && Array.isArray(response.data)) { // Fallback for direct array response
        papersData = response.data;
      } else {
        console.warn('Unexpected papers response structure:', response.data);
        setError('Failed to load papers: Unexpected data format.');
      }
      setPapers(papersData);    } catch (err: any) {
      console.error('Error fetching papers:', err);
      const errorMessage = err.response?.data?.detail || 
                           err.message || 
                           'Failed to load papers and sections';
      setError(errorMessage);
      setPapers([]); // Ensure papers is an empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Calculate available sections based on selected paper
  const availableSections = React.useMemo(() => {
    if (!selectedPaper) return [];
    const paperObj = papers.find(p => p.paper_id === selectedPaper);
    return paperObj?.sections || [];
  }, [selectedPaper, papers]);

  useEffect(() => {
    fetchPapersData();
  }, []); // Fetch papers on component mount
    const startTest = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validation - can't create a test with no sections
      if (selectedSections.length === 0) {
        setError('Please select at least one paper and section before starting the test.');
        setLoading(false);
        return;
      }
      
      // Validation for test duration
      if (!testDuration || testDuration <= 0) {
        setError('Please enter a valid test duration greater than 0 minutes.');
        setLoading(false);
        return;
      }
      
      // Additional validation - reasonable upper limit
      if (testDuration > 480) { // 8 hours
        const confirmLongDuration = window.confirm(
          `You've set a test duration of ${testDuration} minutes (${(testDuration / 60).toFixed(1)} hours). Are you sure this is correct?`
        );
        if (!confirmLongDuration) {
          setLoading(false);
          return;
        }
      }

      // Advanced validation - check that we have enough questions
      let totalQuestionsRequested = 0;
      const invalidSections: string[] = [];
      
      selectedSections.forEach(section => {
        const cacheKey = `${section.paper_id}-${section.section_id}`;
        const availableCount = availableQuestionCounts[cacheKey] || 0;
        
        if (section.question_count > availableCount) {
          invalidSections.push(`${section.paper_name} - ${section.section_name}`);
        }
        
        totalQuestionsRequested += section.question_count;
      });
      
      if (invalidSections.length > 0) {
        setError(`Not enough questions available in: ${invalidSections.join(', ')}. Please reduce the question count or select different sections.`);
        setLoading(false);
        return;
      }      // Create a template from the selected sections
      const templateData: CreateTestTemplateRequest = {
        template_name: `Practice Test - ${new Date().toISOString()}`,
        test_type: "Practice",
        sections: selectedSections.map(section => ({
          paper_id: section.paper_id,
          section_id: section.section_id,
          question_count: section.question_count
        }))
      };

      // Create the template
      const templateResponse = await testsAPI.createTemplate(templateData);
      const templateId = templateResponse.data.template_id;

      // Start the test with the template ID      // Get total requested questions for passing to adaptive tests
      const totalRequestedQuestions = selectedSections.reduce((total, section) => total + section.question_count, 0);
      
      const adaptiveOptions = isAdaptiveMode ? {
        adaptive: true,
        adaptiveStrategy: adaptiveStrategy as 'progressive' | 'easy-first' | 'hard-first' | 'random',
        questionCount: totalRequestedQuestions // Add question count to adaptive options
      } : undefined;
      
      const testResponse = await testsAPI.startTest(templateId, testDuration, adaptiveOptions);
      
      // Extract test data from response
      const attemptId = testResponse.data.attempt_id;
      setAttemptId(attemptId);
      
      // For adaptive tests, we don't get all questions upfront
      if (isAdaptiveMode) {
        setIsAdaptiveTestActive(true);
        setTestStarted(true);      } else {
        // For regular tests, get all questions
        const questionsResponse = await testsAPI.getQuestions(attemptId);
        
        // Get the total question count requested from selectedSections
        const totalRequestedQuestions = selectedSections.reduce((total, section) => total + section.question_count, 0);
        
        // Filter questions if we got more than requested
        let filteredQuestions = questionsResponse.data;
        if (filteredQuestions.length > totalRequestedQuestions) {
          console.log(`Received ${filteredQuestions.length} questions, but only ${totalRequestedQuestions} were requested. Limiting the questions displayed.`);
          filteredQuestions = filteredQuestions.slice(0, totalRequestedQuestions);
        }
        
        setQuestions(filteredQuestions);
        setTestStarted(true);
      }
      
    } catch (err: any) {
      setError(`Failed to start test: ${err.message || 'Unknown error'}`);
      console.error('Test start error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to retry loading papers if there was an error
  const handleRetryLoad = () => {
    fetchPapersData(); // Call the refactored data fetching function
  };

  // Function to add a section to the selection
  const handleAddSection = async () => {
    if (!selectedPaper || !selectedSection || !questionCount) {
      setError('Please select a paper, section, and specify the number of questions.');
      return;
    }

    const numQuestions = parseInt(questionCount, 10);
    if (isNaN(numQuestions) || numQuestions < 1) {
      setError('Please enter a valid number of questions (minimum 1).');
      return;
    }

    const paperObj = papers.find(p => p.paper_id === selectedPaper);
    const sectionObj = paperObj?.sections.find(s => s.section_id === selectedSection);
    
    if (!paperObj || !sectionObj) {
      setError('Invalid paper or section selection.');
      return;
    }

    // Check if section is already selected
    const isDuplicate = selectedSections.some(
      s => s.paper_id === selectedPaper && s.section_id === selectedSection
    );

    if (isDuplicate) {
      setError('This section has already been added to your test.');
      return;
    }

    // Check available question count if we haven't already
    const cacheKey = `${selectedPaper}-${selectedSection}`;
    let availableCount = availableQuestionCounts[cacheKey];
    
    if (availableCount === undefined) {
      setLoading(true);
      try {
        availableCount = await fetchAvailableQuestionCount(selectedPaper, selectedSection);
      } finally {
        setLoading(false);
      }
    }
    
    // Verify we have enough questions available
    if (availableCount === 0) {
      setError('There are no active questions available in this section.');
      return;
    }
    
    if (numQuestions > availableCount) {
      setError(`Only ${availableCount} active questions are available for this section. Please reduce your request.`);
      setQuestionCount(availableCount.toString());
      return;
    }

    // Add to selected sections
    setSelectedSections([
      ...selectedSections, 
      {
        paper_id: selectedPaper,
        paper_name: paperObj.paper_name,
        section_id: selectedSection,
        section_name: sectionObj.section_name,
        question_count: numQuestions
      }
    ]);

    // Clear error if any
    setError(null);
  };

  // Function to remove a section from the selection
  const handleRemoveSection = (paperID: number, sectionID: number) => {
    setSelectedSections(
      selectedSections.filter(
        s => !(s.paper_id === paperID && s.section_id === sectionID)
      )
    );
  };

  // Helper component to display available question count with proper styling
  const AvailableCountInfo = ({ count }: { count: number | null }) => {
    // If actively loading, always show spinner.
    if (loadingCount) {
      return <CircularProgress size={16} />;
    }
    
    // If not loading, and count is null (meaning data isn't available/applicable yet for display by this component)
    if (count === null) { 
      return null; // Render nothing, TextField label/helperText will provide context
    }
    
    // If count is 0 (and not loading)
    if (count === 0) {
      return (
        <Typography variant="body2" color="error" sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
          <WarningIcon fontSize="small" sx={{ mr: 0.5 }} />
          No questions available
        </Typography>
      );
    }
    // If count > 0 (and not loading)
    return (
      <Typography variant="body2" color="success.main" sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
        <CheckCircleIcon fontSize="small" sx={{ mr: 0.5 }} />
        {count} questions available
      </Typography>
    );
  };

  // If initial papers loading is happening
  if (loading && papers.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
        <CircularProgress size={40} />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading papers and sections...</Typography>
      </Box>
    );
  }

  // If there was an error loading the data and no papers are available
  if (error && papers.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 2, maxWidth: 500, mx: 'auto' }}
          action={
            <Button color="inherit" size="small" onClick={handleRetryLoad}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
        <Typography variant="body1" sx={{ mt: 2 }}>
          Unable to load papers and sections. Please try again.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Practice Test</Typography>
      
      {!testStarted ? (
        <Box>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Test Configuration</Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Add Sections to Your Test
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Paper</InputLabel>
                  <Select
                    value={selectedPaper}
                    onChange={(e) => {
                      setSelectedPaper(e.target.value as number);
                      setSelectedSection('');
                      setCurrentAvailableCount(null);
                    }}
                    label="Paper"
                  >
                    {papers.map((paper) => (
                      <MenuItem key={paper.paper_id} value={paper.paper_id}>
                        {paper.paper_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Section</InputLabel>
                  <Select
                    value={selectedSection}
                    onChange={(e) => {
                      const sectionId = e.target.value as number;
                      setSelectedSection(sectionId);
                      if (selectedPaper && sectionId) {
                        fetchAvailableQuestionCount(selectedPaper, sectionId);
                      }
                    }}
                    label="Section"
                    disabled={!selectedPaper}
                  >
                    {availableSections.map((section) => (
                      <MenuItem key={section.section_id} value={section.section_id}>
                        {section.section_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label={loadingCount 
                    ? "Loading available count..." 
                    : `Questions (max ${currentAvailableCount || 100})`}
                  type="number"
                  value={questionCount}
                  onChange={(e) => {
                    // Limit to available questions if we know the count
                    if (currentAvailableCount !== null) {
                      const newValue = Math.min(
                        parseInt(e.target.value) || 0, 
                        currentAvailableCount
                      );
                      setQuestionCount(newValue.toString());
                    } else {
                      setQuestionCount(e.target.value);
                    }
                  }}
                  disabled={loadingCount}
                  error={currentAvailableCount !== null && currentAvailableCount === 0}
                  helperText={currentAvailableCount !== null && currentAvailableCount === 0 
                    ? "No active questions available in this section" 
                    : ""}
                  inputProps={{ 
                    min: 1, 
                    max: currentAvailableCount !== null ? currentAvailableCount : 100
                  }}
                />
                
                {/* Display available question count information */}
                <AvailableCountInfo count={currentAvailableCount} />
              </Grid>
              
              <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={handleAddSection}
                  fullWidth
                  disabled={loading || loadingCount || !selectedPaper || !selectedSection || !questionCount || 
                           (currentAvailableCount !== null && currentAvailableCount === 0)}
                >
                  {loading || loadingCount ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      Working...
                    </Box>
                  ) : 'Add Section'}
                </Button>
              </Grid>
            </Grid>
            
            {/* Adaptive Test Options */}
            <Box sx={{ mt: 3, mb: 2 }}>
              <Divider sx={{ my: 2 }}>
                <Chip label="Advanced Options" />
              </Divider>
              
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isAdaptiveMode}
                        onChange={(e) => setIsAdaptiveMode(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography>Enable Adaptive Test Mode</Typography>
                        <Tooltip title="Adaptive mode dynamically adjusts question difficulty based on your performance">
                          <InfoIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} />
                        </Tooltip>
                      </Box>
                    }
                  />
                </Grid>
                
                {isAdaptiveMode && (
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel id="adaptive-strategy-label">Adaptive Strategy</InputLabel>
                      <Select
                        labelId="adaptive-strategy-label"
                        id="adaptive-strategy"
                        value={adaptiveStrategy}
                        label="Adaptive Strategy"
                        onChange={(e) => setAdaptiveStrategy(e.target.value)}
                      >
                        <MenuItem value="progressive">Progressive (Balanced)</MenuItem>
                        <MenuItem value="easy-first">Start Easy, Get Harder</MenuItem>
                        <MenuItem value="hard-first">Start Hard, Get Easier</MenuItem>
                        <MenuItem value="random">Random Difficulty</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>
            </Box>
              {/* Test Duration Selection */}
            <Box sx={{ mt: 4, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Test Duration
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel id="test-duration-label">Predefined Duration</InputLabel>
                    <Select
                      labelId="test-duration-label"
                      id="test-duration-select"
                      value={testDuration}
                      label="Predefined Duration"
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (value >= 1) {
                          setTestDuration(value);
                        }
                      }}
                    >
                      <MenuItem value={15}>15 minutes</MenuItem>
                      <MenuItem value={30}>30 minutes</MenuItem>
                      <MenuItem value={60}>60 minutes (1 hour)</MenuItem>
                      <MenuItem value={90}>90 minutes (1.5 hours)</MenuItem>
                      <MenuItem value={120}>120 minutes (2 hours)</MenuItem>
                      <MenuItem value={180}>180 minutes (3 hours)</MenuItem>
                      <MenuItem value={240}>240 minutes (4 hours)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Custom Duration (minutes)"
                    type="number"
                    InputProps={{ inputProps: { min: 1 } }}
                    value={testDuration}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (value > 0) {
                        setTestDuration(value);
                      } else if (e.target.value === '') {
                        // Allow empty field during typing
                        setTestDuration(0);
                      } else {
                        // Show error for negative or zero values
                        alert('Please enter a valid duration greater than 0 minutes');
                        setTestDuration(1);
                      }
                    }}
                    onBlur={() => {
                      // Ensure value is at least 1 when user finishes editing
                      if (testDuration <= 0) {
                        setTestDuration(1);
                        alert('Test duration must be at least 1 minute. Setting to minimum value.');
                      }
                    }}                    helperText="Enter custom duration in minutes (minimum 1 minute)"
                  />
                </Grid>
              </Grid>
            </Box>
            
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={startTest}
                disabled={loading || selectedSections.length === 0}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {loading ? 'Starting Test...' : 'Start Test'}
              </Button>
            </Box>
          </Paper>
          
          {/* Selected Sections Table - existing code */}
          <Box sx={{ mt: 4, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Selected Sections ({selectedSections.length})
            </Typography>
            
            {selectedSections.length === 0 ? (
              <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
                <Typography variant="body2" color="textSecondary" align="center">
                  No sections added yet. Use the form above to add sections to your test.
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Paper</TableCell>
                      <TableCell>Section</TableCell>
                      <TableCell align="center">Questions</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedSections.map((section) => (
                      <TableRow key={`${section.paper_id}-${section.section_id}`}>
                        <TableCell>{section.paper_name}</TableCell>
                        <TableCell>{section.section_name}</TableCell>
                        <TableCell align="center">
                          {section.question_count}
                          {availableQuestionCounts[`${section.paper_id}-${section.section_id}`] !== undefined && (
                            <Typography variant="caption" display="block" color="textSecondary">
                              (of {availableQuestionCounts[`${section.paper_id}-${section.section_id}`]} available)
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleRemoveSection(section.paper_id, section.section_id)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Box>
      ) : (
        attemptId && (          isAdaptiveTestActive ? (
            <AdaptiveTestInterface 
              attemptId={attemptId as number} 
              onComplete={() => {
                setTestStarted(false);
                setIsAdaptiveTestActive(false);
                navigate('/performance-dashboard');
              }}
              adaptiveStrategy={adaptiveStrategy}
              testDuration={testDuration}
            />
          ) : (
            <TestInterface 
              attemptId={attemptId as number} 
              questions={questions} 
              onComplete={() => {
                setTestStarted(false);
                navigate('/results');
              }}
              testDuration={testDuration}
            />
          )
        )
      )}
    </Box>
  );
};
