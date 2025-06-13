import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Snackbar,
  AlertProps,
  AlertColor,
  Tooltip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { questionsAPI, papersAPI } from '../services/api';
import { Loading } from '../components/Loading';
import Pagination from '@mui/material/Pagination';
import InfoIcon from '@mui/icons-material/Info';
import GetAppIcon from '@mui/icons-material/GetApp';

interface ExamPaper {
  paper_id: number;
  paper_name: string;
  sections: Array<{
    section_id: number;
    section_name: string;
  }>;
}

interface Question {
  question_id: number;
  question_text: string;
  paper_id: number;
  section_id: number;
  default_difficulty_level: string;
  valid_until: string; // new field
}

// Search parameters interface
interface SearchParams {
  query: string;
  paper_name: string;
  section_name: string;
  subsection_name: string;
  question_type: string;
  difficulty_level: string;
  include_expired: boolean;
  valid_before_date: string;
  valid_after_date: string;
  exact_match: boolean;
  advanced_mode: boolean;
  question_length?: string;
  created_after?: string;
  modified_after?: string;
  option_count?: string;
  has_explanation?: boolean;
}

// Add this near the other interfaces
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const QuestionManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('info');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  
  // Confirmation dialog state
  const [confirmDialogProps, setConfirmDialogProps] = useState<ConfirmDialogProps>({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {},
    onCancel: () => {}
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'MCQ',
    paper_id: 0,
    section_id: 0,
    subsection_id: null as number | null,
    default_difficulty_level: 'Easy',
    options: [
      { option_text: '', option_order: 0 },
      { option_text: '', option_order: 1 },
      { option_text: '', option_order: 2 },
      { option_text: '', option_order: 3 },
    ],
    correct_option_index: 0,
    explanation: '',
    valid_until: '', // Initialize valid_until
  });
  const [subsections, setSubsections] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20); // You can make this user-configurable if desired
  const [total, setTotal] = useState(0);  // --- Search State ---
  const [searchParams, setSearchParams] = useState<SearchParams>({
    query: '',
    paper_name: '',
    section_name: '',
    subsection_name: '',
    question_type: '',
    difficulty_level: '',
    include_expired: false,
    valid_before_date: '', // New filter for questions valid before a specific date
    valid_after_date: '', // New filter for questions valid after a specific date
    exact_match: false, // New option for exact text matching
    advanced_mode: false, // Toggle for advanced search options
    
    // Advanced search options
    question_length: '', // short, medium, long
    created_after: '',
    modified_after: '',
    option_count: '',
    has_explanation: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [questionsPerPage] = useState(20);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // --- Debounce search state to prevent excessive API calls ---
  const [debouncedSearchParams, setDebouncedSearchParams] = useState(searchParams);
  
  // Apply debouncing to search params changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchParams(searchParams);
    }, 500); // 500ms delay
    
    return () => clearTimeout(timer);
  }, [searchParams]);

  // Use debounced params for API calls
  useEffect(() => {
    fetchQuestions();
  }, [debouncedSearchParams, currentPage, questionsPerPage]);
    // --- Fetch Questions (Admin Search) ---
  const fetchQuestions = useCallback(async () => {
    setSearchLoading(true);
    setSearchError(null);
    try {
      // Create params object excluding empty string and false values
      const params: any = {
        ...Object.fromEntries(Object.entries(debouncedSearchParams).filter(([_, v]) => v !== '' && v !== false)),
        limit: questionsPerPage,
        offset: (currentPage - 1) * questionsPerPage,
      };
        // Add additional search parameters for the backend API
      if (debouncedSearchParams.exact_match && debouncedSearchParams.query) {
        params.exact_match = true;
      }
        // Format date parameters correctly for API
      // Convert date strings to ISO format for API with proper time set
      
      // Set valid_before_date to end of day to include the entire day
      if (params.valid_before_date) {
        const beforeDate = new Date(params.valid_before_date);
        beforeDate.setHours(23, 59, 59, 999); // Set to end of day
        params.valid_before_date = beforeDate.toISOString();
      }
      
      // Set valid_after_date to start of day
      if (params.valid_after_date) {
        const afterDate = new Date(params.valid_after_date);
        afterDate.setHours(0, 0, 0, 0); // Set to start of day
        params.valid_after_date = afterDate.toISOString();
      }
      
      // Format advanced search date parameters
      if (params.created_after) {
        const createdAfterDate = new Date(params.created_after);
        createdAfterDate.setHours(0, 0, 0, 0); // Start of day
        params.created_after = createdAfterDate.toISOString();
      }
      
      if (params.modified_after) {
        const modifiedAfterDate = new Date(params.modified_after);
        modifiedAfterDate.setHours(0, 0, 0, 0); // Start of day
        params.modified_after = modifiedAfterDate.toISOString();
      }
      
    // Advanced search parameters already formatted above
      
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/questions/admin/search?` +
          new URLSearchParams(params),
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        }
      );
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      setSearchResults(data.items || data); // Support both paginated and array response
      setTotalQuestions(data.total || data.length || 0);    } catch (err: any) {
      console.error('Error in fetchQuestions:', err);
      setSearchError(err.message || 'Failed to fetch questions');
      setSearchResults([]);
      setTotalQuestions(0);
    } finally {
      setSearchLoading(false);
      // Make sure the main loading state is also set to false
      setLoading(false);
    }  }, [debouncedSearchParams, currentPage, questionsPerPage]);

  // Removed redundant effect that was causing infinite API calls
  const fetchData = async (pageNum = 1) => {
    try {
      setLoading(true);
      console.log('Fetching questions and papers data...');
      
      // Split the Promise.all to handle individual failures better
      try {
        const questionsRes = await questionsAPI.getQuestions({ page: pageNum, page_size: pageSize });
        // Support both paginated and legacy response
        if (questionsRes.data.items) {
          setQuestions(questionsRes.data.items);
          setTotal(questionsRes.data.total);
        } else {
          setQuestions(questionsRes.data);
          setTotal(questionsRes.data.length);
        }
        console.log('Successfully loaded questions data');
      } catch (questionsErr: any) {
        console.error('Error fetching questions:', questionsErr);
        setError('Failed to load questions data');
      }
      
      try {
        const papersRes = await papersAPI.getPapers();
        setPapers(papersRes.data.items ? papersRes.data.items : papersRes.data);
        console.log('Successfully loaded papers data');
      } catch (papersErr: any) {
        console.error('Error fetching papers:', papersErr);
        setError('Failed to load papers data');
      }
    } catch (err: any) {
      console.error('General error in fetchData:', err);
      setError(err.response?.data?.detail || 'Failed to load data');
    } finally {
      // Always reset loading state
      setLoading(false);
    }
  };

  // Effect to fetch data when page changes
  useEffect(() => {
    console.log(`Page changed to ${page}, fetching new data...`);
    if (page > 0) { // Only fetch if page is valid
      fetchData(page);
    }
  }, [page]); // Depends on page state

  // Fetch subsections when section changes
  useEffect(() => {
    if (formData.section_id) {
      (async () => {
        try {
          const res = await import('../services/api').then(m => m.subsectionsAPI.getSubsections(formData.section_id));
          setSubsections(res.data);
        } catch {
          setSubsections([]);
        }
      })();
    } else {
      setSubsections([]);
    }
  }, [formData.section_id]);

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.question_text || formData.question_text.trim() === '') {
        setError('Question text is required');
        return;
      }
      
      if (!formData.paper_id || formData.paper_id <= 0) {
        setError('Please select a paper');
        return;
      }
      
      if (!formData.section_id || formData.section_id <= 0) {
        setError('Please select a section');
        return;
      }
      
      // Validate options
      const emptyOptions = formData.options.filter(opt => !opt.option_text || opt.option_text.trim() === '');
      if (emptyOptions.length > 0) {
        setError('All options must have text');
        return;
      }
      
      console.log('Submitting question data:', JSON.stringify(formData));
      
      if (selectedQuestion) {
        // Update existing question
        await questionsAPI.updateQuestion(selectedQuestion.question_id, formData);
      } else {
        // Create new question
        await questionsAPI.createQuestion(formData);
      }
      setOpenDialog(false);
      fetchData();
      setError(null); // Clear any errors on success
    } catch (err: any) {
      console.error('Error saving question:', err);
      setError(err.response?.data?.detail || 'Failed to save question');
    }
  };  // Function to validate paper IDs in the CSV content against available papers in the system
  const validatePaperIds = async (fileContent: string): Promise<{valid: boolean, missingPaperIds?: number[]}> => {
    try {
      // Get list of paper IDs from the CSV
      const lines = fileContent.split('\n');
      if (lines.length < 2) {
        return { valid: false };
      }
      
      // Extract paper_id index from header
      const headers = lines[0].split(',');
      const paperIdIdx = headers.findIndex(h => h.trim().toLowerCase() === 'paper_id');
      if (paperIdIdx === -1) {
        return { valid: false }; // No paper_id column found
      }
      
      // Skip header and extract unique paper IDs
      const uniquePaperIds = new Set<number>();
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const values = line.split(',');
        if (values.length <= paperIdIdx) continue;
        
        const paperId = parseInt(values[paperIdIdx], 10);
        if (!isNaN(paperId)) {
          uniquePaperIds.add(paperId);
        }
      }
      
      // Get available paper IDs from the system
      const availablePaperIds = papers.map(paper => paper.paper_id);
      
      // Find missing paper IDs
      const missingPaperIds: number[] = Array.from(uniquePaperIds).filter(
        id => !availablePaperIds.includes(id)
      );
      
      return { valid: missingPaperIds.length === 0, missingPaperIds };
    } catch (error) {
      console.error("Error validating paper IDs:", error);
      return { valid: false };
    }
  };

  // --- File upload handler ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file is a CSV or Excel
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      setError('Only CSV (.csv) or Excel (.xlsx) files are supported');
      return;
    }

    try {
      setUploading(true);
      console.log(`Uploading file: ${file.name} (${file.size} bytes, type: ${file.type})`);
        
      // Check if file is valid and not empty
      if (file.size === 0) {
        setError('The file is empty. Please download the sample template and fill it out.');
        setSnackbarMessage('Empty file detected. Please download and use the sample template.');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
        return;
      }
      
      // Basic client-side validation for CSV files
      if (file.name.endsWith('.csv')) {
        try {
          // Read the entire file content for validation
          const fileText = await file.text();
          
          // Log sample for debugging
          console.log('CSV header sample:', fileText.substring(0, 200));
          
          // Check for basic CSV structure (has header row with commas)
          if (!fileText.includes(',')) {
            setError('The CSV file appears to be incorrectly formatted. It should use commas as separators.');
            setSnackbarMessage('Invalid CSV format. Make sure your file uses commas as separators.');
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
          }
          
          // Check for required headers
          const requiredHeaders = ['question_text', 'question_type', 'paper_id', 'section_id', 'correct_option_index', 'option_0'];
          const headerLine = fileText.split('\n')[0].toLowerCase();
          
          const missingHeaders = requiredHeaders.filter(header => !headerLine.includes(header));
          if (missingHeaders.length > 0) {
            setError(`The CSV file is missing required headers: ${missingHeaders.join(', ')}`);
            setSnackbarMessage('CSV is missing required headers. Download and use the sample template.');
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
          }
          
          // Validate that paper IDs in the CSV exist in the system
          const paperValidation = await validatePaperIds(fileText);
          if (!paperValidation.valid) {
            const missingIds = paperValidation.missingPaperIds || [];
            if (missingIds.length > 0) {
              setError(`The CSV file references paper IDs that don't exist in the system: ${missingIds.join(', ')}. Please create these papers first or update your CSV to use existing paper IDs.`);
              setSnackbarMessage('CSV contains invalid paper IDs. See error details for more information.');
              setSnackbarSeverity('error');
              setSnackbarOpen(true);
              return;
            } else {
              setError('Failed to validate paper IDs in the CSV file.');
              setSnackbarSeverity('error');
              setSnackbarOpen(true);
              return;
            }
          }
        } catch (csvErr) {
          console.error('Error validating CSV:', csvErr);
        }
      }
      
      // We're removing the template check as it's causing false positives
      // The backend validation will catch actual issues with the file format
      
      // Attempt to upload the file
      const response = await questionsAPI.uploadQuestions(file);
      console.log('File upload successful:', response);
      
      // Show success message
      setSnackbarMessage('Questions uploaded successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      // Refresh data after successful upload
      await fetchData();
      setError(null); // Clear any previous errors on success
    } catch (err: any) {
      console.error('File upload error:', err);
      
      // Extract detailed error information with deep debugging
      let errorMessage = 'Failed to upload questions';
      console.log('Error details:', err);
      
      if (err.response && err.response.data) {
        // Handle structured error response
        if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
          
          // Special handling for known error types
          if (err.response.data.errorType === "PAPER_NOT_FOUND") {
            // Add guidance for creating missing papers
            setSnackbarMessage('Question upload failed: Referenced paper does not exist');
            // Show a more detailed error with action buttons
            setConfirmDialogProps({
              open: true,
              title: 'Missing Paper Reference',
              message: `${errorMessage}\n\nWould you like to create a sample paper with ID 1 now?`,
              confirmText: 'Create Sample Paper',
              cancelText: 'Cancel',
              onConfirm: async () => {
                // Close the dialog
                setConfirmDialogProps(prev => ({ ...prev, open: false }));
                
                try {
                  // Call an API to create the sample paper
                  setSnackbarMessage('Creating sample paper...');
                  setSnackbarSeverity('info');
                  setSnackbarOpen(true);
                  
                  // You'll need to implement this API endpoint
                  await papersAPI.createSamplePaper();
                  
                  setSnackbarMessage('Sample paper created. You can now try uploading the questions again.');
                  setSnackbarSeverity('success');
                  setSnackbarOpen(true);
                  
                  // Refresh papers list
                  await fetchData();
                } catch (createErr) {
                  console.error('Error creating sample paper:', createErr);
                  setSnackbarMessage('Failed to create sample paper. Please create it manually.');
                  setSnackbarSeverity('error');
                  setSnackbarOpen(true);
                }
              },
              onCancel: () => {
                setConfirmDialogProps(prev => ({ ...prev, open: false }));
              }
            });
            return;
          }
        } else if (typeof err.response.data === 'string' && err.response.data.includes('foreign key constraint')) {
          // Handle plaintext foreign key errors
          if (err.response.data.includes('questions_paper_id_fkey')) {
            errorMessage = 'The paper ID referenced in your CSV file does not exist in the database. Please create this paper first.';
          }
        }
      } else if (err.message) {
        // Simple error with just a message
        errorMessage = err.message;
      }
      
      // Set the error message for display
      setError(errorMessage);
      
      // Show snackbar with appropriate message
      setSnackbarMessage('Question upload failed');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setUploading(false);
      // Clear the file input so the same file can be uploaded again if needed
      event.target.value = '';
    }
  };

  // --- Handlers ---
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSearchParams((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleSearchSelect = (e: any) => {
    setSearchParams((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams((prev) => ({ ...prev, [e.target.name]: e.target.checked }));
  };  const handleClearFilters = () => {
    setSearchParams({
      query: '',
      paper_name: '',
      section_name: '',
      subsection_name: '',
      question_type: '',
      difficulty_level: '',
      include_expired: false,
      valid_before_date: '',
      valid_after_date: '',
      exact_match: false,
      advanced_mode: searchParams.advanced_mode, // Preserve the advanced mode setting
      
      // Reset advanced search options
      question_length: '',
      created_after: '',
      modified_after: '',
      option_count: '',
      has_explanation: false,
    });    setCurrentPage(1);
    // The search will happen automatically due to the useEffect hook with the debouncedSearchParams dependency
  };
    // Simple search function without redundant timers
  const handleSearch = () => {
    setCurrentPage(1);
    // The search will happen automatically due to the page change triggering the useEffect
  };

  // --- Save search preferences when they change ---
  useEffect(() => {
    try {
      // Only save non-sensitive search parameters
      const prefsToSave = {
        question_type: searchParams.question_type,
        difficulty_level: searchParams.difficulty_level,
        exact_match: searchParams.exact_match,
        advanced_mode: searchParams.advanced_mode,
      };
      localStorage.setItem('questionSearchPrefs', JSON.stringify(prefsToSave));
    } catch (err) {
      console.log('Failed to save search preferences');
    }
  }, [searchParams.question_type, searchParams.difficulty_level, 
      searchParams.exact_match, searchParams.advanced_mode]);
  // Load saved preferences on initial component mount
  useEffect(() => {
    const loadPrefs = () => {
      try {
        const savedPrefs = localStorage.getItem('questionSearchPrefs');
        if (savedPrefs) {
          const prefs = JSON.parse(savedPrefs);
          setSearchParams(prev => ({
            ...prev,
            ...prefs
          }));
        }
      } catch (err) {
        console.log('Failed to load search preferences');
      }
    };
    
    loadPrefs();
  }, []);  // --- Effect: Initial data loading and safety timeout ---
  useEffect(() => {
    console.log('Initializing QuestionManagement component');
    
    const initializeComponent = async () => {
      try {
        await fetchData();
        console.log('Initial data loaded successfully');
      } catch (err) {
        console.error('Error during initial data loading:', err);
        setError('Failed to load initial data. Please refresh the page.');
      } finally {
        // Always ensure loading state is reset
        setLoading(false);
      }
    };

    initializeComponent();

    // Safety timeout to ensure loading state is always reset
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Loading state timed out - forcing reset');
        setLoading(false);
      }
    }, 10000);

    return () => clearTimeout(safetyTimeout);
  }, []); // Only run on mount

  if (loading) {
    return <Loading message="Loading questions..." />;
  }  return (
    <Box>      {/* --- Question Management Title --- */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>Question Management</Typography>
      </Box>
      
      {/* --- Search Filters UI --- */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 3, bgcolor: 'background.default', boxShadow: 2 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: 'primary.main', letterSpacing: 1 }}>
          Search & Filter Questions
        </Typography>
        
        {/* Text search filters */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center' }}>
          <TextField
            label="General Search"
            name="query"
            value={searchParams.query}
            onChange={handleSearchInput}
            size="small"
            variant="outlined"
            sx={{ minWidth: 220, bgcolor: 'background.paper', borderRadius: 2 }}
            InputProps={{ style: { fontWeight: 500 } }}
          />
          <TextField
            label="Paper Name"
            name="paper_name"
            value={searchParams.paper_name}
            onChange={handleSearchInput}
            size="small"
            variant="outlined"
            sx={{ minWidth: 180, bgcolor: 'background.paper', borderRadius: 2 }}
          />
          <TextField
            label="Section Name"
            name="section_name"
            value={searchParams.section_name}
            onChange={handleSearchInput}
            size="small"
            variant="outlined"
            sx={{ minWidth: 180, bgcolor: 'background.paper', borderRadius: 2 }}
          />
          <TextField
            label="Subsection Name"
            name="subsection_name"
            value={searchParams.subsection_name}
            onChange={handleSearchInput}
            size="small"
            variant="outlined"
            sx={{ minWidth: 180, bgcolor: 'background.paper', borderRadius: 2 }}
          />
        </Box>        {/* Dropdown filters and validity date range */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 170, bgcolor: 'background.paper', borderRadius: 2 }} size="small">
            <InputLabel>Question Type</InputLabel>
            <Select
              name="question_type"
              value={searchParams.question_type}
              label="Question Type"
              onChange={handleSearchSelect}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="MCQ">Multiple Choice</MenuItem>
              <MenuItem value="True/False">True/False</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150, bgcolor: 'background.paper', borderRadius: 2 }} size="small">
            <InputLabel>Difficulty</InputLabel>
            <Select
              name="difficulty_level"
              value={searchParams.difficulty_level}
              label="Difficulty"
              onChange={handleSearchSelect}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Easy">Easy</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="Hard">Hard</MenuItem>
            </Select>
          </FormControl>
          
          {/* Validity date range filters */}
          <TextField
            label="Valid After"
            name="valid_after_date"
            type="date"
            value={searchParams.valid_after_date}
            onChange={handleSearchInput}
            size="small"
            variant="outlined"
            sx={{ width: 180, bgcolor: 'background.paper', borderRadius: 2 }}
            InputLabelProps={{ shrink: true }}
            inputProps={{
              title: "Show questions valid on or after this date"
            }}
            helperText="Questions valid from this date"
          />
          <TextField
            label="Valid Before"
            name="valid_before_date"
            type="date"
            value={searchParams.valid_before_date}
            onChange={handleSearchInput}
            size="small"
            variant="outlined"
            sx={{ width: 180, bgcolor: 'background.paper', borderRadius: 2 }}
            InputLabelProps={{ shrink: true }}
            inputProps={{
              title: "Show questions valid on or before this date"
            }}
            helperText="Questions valid until this date"
          />
        </Box>        {/* Additional search options */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Checkbox
                name="include_expired"
                checked={searchParams.include_expired}
                onChange={handleCheckbox}
                sx={{ color: 'primary.main' }}
              />
            }            
            label={<span style={{ fontWeight: 500 }}>Include Expired</span>}
          />          <FormControlLabel
            control={
              <Checkbox
                name="exact_match"
                checked={searchParams.exact_match}
                onChange={handleCheckbox}
                sx={{ color: 'primary.main' }}
                title="When enabled, search will match the exact phrase in the search field"
              />
            }
            label={<span style={{ fontWeight: 500 }}>Exact Match</span>}
          />
          <FormControlLabel
            control={
              <Checkbox
                name="advanced_mode"
                checked={searchParams.advanced_mode}
                onChange={handleCheckbox}
                sx={{ color: 'primary.main' }}
                title="Enable advanced search features"
              />
            }
            label={<span style={{ fontWeight: 500 }}>Advanced Mode</span>}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSearch} 
            sx={{ height: 40, px: 3, fontWeight: 600, borderRadius: 2, boxShadow: 1 }}
          >
            Search
          </Button>          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={handleClearFilters} 
            sx={{ height: 40, px: 3, fontWeight: 600, borderRadius: 2 }}
          >
            Clear Filters
          </Button>        </Box>
        
        {/* Advanced search fields (only shown when advanced mode is enabled) */}
        {searchParams.advanced_mode && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center', bgcolor: 'action.hover', p: 2, borderRadius: 2, width: '100%' }}>
            <Typography variant="subtitle1" sx={{ width: '100%', fontWeight: 600, mb: 1 }}>
              Advanced Search Options
            </Typography>
            
            {/* Content length filtering */}
            <FormControl sx={{ minWidth: 180, bgcolor: 'background.paper', borderRadius: 2 }} size="small">
              <InputLabel>Question Length</InputLabel>
              <Select
                name="question_length"
                value={searchParams.question_length || ''}
                label="Question Length"
                onChange={handleSearchSelect}
              >                <MenuItem value="">Any Length</MenuItem>
                <MenuItem value="short">Short (&lt; 50 chars)</MenuItem>
                <MenuItem value="medium">Medium (50-200 chars)</MenuItem>
                <MenuItem value="long">Long (&gt; 200 chars)</MenuItem>
              </Select>
            </FormControl>
            
            {/* Date created filtering */}
            <TextField
              label="Created After"
              name="created_after"
              type="date"
              value={searchParams.created_after || ''}
              onChange={handleSearchInput}
              size="small"
              variant="outlined"
              sx={{ width: 180, bgcolor: 'background.paper', borderRadius: 2 }}
              InputLabelProps={{ shrink: true }}
            />
            
            {/* Last modified filtering */}
            <TextField
              label="Modified After"
              name="modified_after"
              type="date"
              value={searchParams.modified_after || ''}
              onChange={handleSearchInput}
              size="small"
              variant="outlined"
              sx={{ width: 180, bgcolor: 'background.paper', borderRadius: 2 }}
              InputLabelProps={{ shrink: true }}
            />            {/* Options filter (for MCQs with specific number of options) */}
            <FormControl sx={{ minWidth: 180, bgcolor: 'background.paper', borderRadius: 2 }} size="small">
              <InputLabel>Number of Options</InputLabel>
              <Select
                name="option_count"
                value={searchParams.option_count || ''}
                label="Number of Options"
                onChange={handleSearchSelect}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="2">2 Options</MenuItem>
                <MenuItem value="3">3 Options</MenuItem>
                <MenuItem value="4">4 Options</MenuItem>
                <MenuItem value="5+">5+ Options</MenuItem>
              </Select>
            </FormControl>

            {/* Has explanation filter */}
            <FormControlLabel
              control={
                <Checkbox
                  name="has_explanation"
                  checked={searchParams.has_explanation || false}
                  onChange={handleCheckbox}
                  sx={{ color: 'primary.main' }}
                />
              }
              label={<span style={{ fontWeight: 500 }}>Has Explanation</span>}
            />
          </Box>
        )}
      </Paper>
      {/* --- Action Buttons Modernized --- */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          sx={{ fontWeight: 600, borderRadius: 2, boxShadow: 1, minWidth: 180 }}
          onClick={() => {
            setSelectedQuestion(null);
            setFormData({
              question_text: '',
              question_type: 'MCQ',
              paper_id: 0,
              section_id: 0,
              subsection_id: null,
              default_difficulty_level: 'Easy',
              options: [
                { option_text: '', option_order: 0 },
                { option_text: '', option_order: 1 },
                { option_text: '', option_order: 2 },
                { option_text: '', option_order: 3 },
              ],
              correct_option_index: 0,
              explanation: '',
              valid_until: '',
            });
            setOpenDialog(true);
          }}
        >
          Add Question
        </Button>        <Tooltip 
          title={
            <>
              <Typography variant="subtitle2" sx={{fontWeight: 'bold', mb: 1}}>
                Upload Questions File
              </Typography>
              <Typography variant="body2">
                Upload a CSV or Excel file with your questions.
                Make sure the file has all required columns:
              </Typography>
              <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
                <li>question_text</li>
                <li>question_type</li>
                <li>paper_id or paper_name</li>
                <li>section_id or section_name</li>
                <li>options and correct_option_index (for MCQs)</li>
              </ul>
              <Typography variant="body2" sx={{fontWeight: 'bold', color: '#ff9800'}}>
                Important: Download and use the sample template.
              </Typography>
              <Typography variant="body2">
                The file must not be empty and must have the correct columns.
              </Typography>
            </>
          } 
          placement="top" 
          arrow
        >
          <span>
            <label htmlFor="file-upload">
              <Button
                component="span"
                variant="outlined"
                color="primary"
                sx={{ fontWeight: 600, borderRadius: 2, minWidth: 180 }}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Questions CSV/Excel'}
              </Button>
            </label>
          </span>
        </Tooltip>
        <Tooltip
          title={
            <>
              <p style={{ margin: 0 }}>Please ensure your CSV file adheres to the following:</p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>All columns marked (REQUIRED) must be present and contain valid data.</li>
                <li>For <b>valid_until</b>, use DD-MM-YYYY format (e.g., 31-12-2025). If this column is left empty or is not present, the question will be valid indefinitely (until 31-12-9999).</li>
                <li><b>paper_name</b>, <b>section_name</b>, <b>subsection_name</b> must exactly match existing entries in the system.</li>
                <li>Ensure options <b>option_0</b>, <b>option_1</b>, etc., are provided for multiple-choice questions based on <b>correct_option_index</b>.</li>
                <li>Each row represents one question.</li>
              </ul>
              <p style={{ margin: 0 }}>Download the sample template for exact column headers.</p>
            </>
          }
          placement="top"
          arrow
        >
          <IconButton size="medium" color="info" sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
            <InfoIcon />
          </IconButton>
        </Tooltip>        <Tooltip title="Download Sample CSV Template" placement="top" arrow>
          <IconButton
            color="primary"
            onClick={() => {
              // Create a direct download from the correct template in public/assets
              fetch('/assets/samplequestions_template.csv')
                .then(response => response.blob())
                .then(blob => {
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'samplequestions_template.csv';
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                  
                  setSnackbarMessage('Sample template downloaded. Please fill it out and upload.');
                  setSnackbarSeverity('info');
                  setSnackbarOpen(true);
                })
                .catch(err => {
                  console.error('Error downloading template:', err);
                  setError('Failed to download template. Please try again.');
                });
            }}
            sx={{ ml: 1, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}
          >
            <GetAppIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Download All Questions (CSV)" placement="top" arrow>
          <IconButton
            color="secondary"
            onClick={async () => {
              try {
                const response = await questionsAPI.downloadAllQuestions();
                const blob = new Blob([response.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'all_questions.csv';
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
              } catch (err) {
                setError('Failed to download all questions.');
              }
            }}
            sx={{ ml: 1, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}
          >
            <GetAppIcon />
          </IconButton>
        </Tooltip>
        <input
          type="file"
          accept=".csv,.xlsx"
          style={{ display: 'none' }}
          id="file-upload"
          onChange={handleFileUpload}
        />
      </Box>
      {/* --- Search Results Table --- */}
      {searchLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : searchError ? (
        <Alert severity="error" sx={{ mb: 3 }}>{searchError}</Alert>
      ) : searchResults.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>No questions found matching your criteria.</Alert>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ mb: 2, borderRadius: 3, boxShadow: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: 'background.paper' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>Question</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>Difficulty</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>Validity</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>Paper</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>Section</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>Subsection</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {searchResults.map((q: any) => (
                  <TableRow key={q.question_id} hover sx={{ transition: 'background 0.2s', '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell>{q.question_id}</TableCell>
                    <TableCell>{q.question_text}</TableCell>
                    <TableCell>{q.question_type}</TableCell>
                    <TableCell>{q.default_difficulty_level}</TableCell>
                    <TableCell>{q.valid_until ? new Date(q.valid_until).toLocaleDateString() : ''}</TableCell>
                    <TableCell>{q.paper?.paper_name || q.paper_name || ''}</TableCell>
                    <TableCell>{q.section?.section_name || q.section_name || ''}</TableCell>
                    <TableCell>{q.subsection?.subsection_name || q.subsection_name || ''}</TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => {
                          setSelectedQuestion(q);
                          setFormData({
                            question_text: q.question_text,
                            question_type: q.question_type || 'MCQ',
                            paper_id: q.paper_id,
                            section_id: q.section_id,
                            subsection_id: q.subsection_id ?? null,
                            default_difficulty_level: q.default_difficulty_level || 'Easy',
                            options: q.options || [
                              { option_text: '', option_order: 0 },
                              { option_text: '', option_order: 1 },
                              { option_text: '', option_order: 2 },
                              { option_text: '', option_order: 3 },
                            ],
                            correct_option_index: q.correct_option_index ?? 0,
                            explanation: q.explanation || '',
                            valid_until: q.valid_until,
                          });
                          setOpenDialog(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={async () => {
                          if (!window.confirm('Are you sure you want to delete this question?')) return;
                          try {
                            setLoading(true);
                            console.log(`[DEBUG][DELETE] Starting delete operation for question ID: ${q.question_id}`);
                            
                            // Add pre-delete verification
                            try {
                              // First check if the question exists
                              await questionsAPI.getQuestion(q.question_id);
                            } catch (verifyErr: any) {
                              console.error(`[DEBUG][DELETE] Pre-delete verification failed:`, verifyErr);
                              if (verifyErr.response?.status === 404) {
                                setError(`Question ${q.question_id} does not exist or was already deleted`);
                                setLoading(false);
                                return;
                              }
                            }
                            
                            // Now try the delete
                            console.log(`[DEBUG][DELETE] Sending delete request for question ID: ${q.question_id}`);
                            const response = await questionsAPI.deleteQuestion(q.question_id);
                            console.log(`[DEBUG][DELETE] Delete successful for question ID: ${q.question_id}`, response);
                            fetchData();
                            fetchQuestions(); // Also refresh the search results
                          } catch (err: any) {
                            console.error(`[DEBUG][DELETE] Error deleting question ${q.question_id}:`, err);
                            console.error(`[DEBUG][DELETE] Response:`, err.response?.data);
                            console.error(`[DEBUG][DELETE] Status:`, err.response?.status);
                            
                            // Detailed error message
                            let errorMessage = `Failed to delete question ${q.question_id}`;
                            if (err.response?.data?.detail) {
                              errorMessage += `: ${err.response.data.detail}`;
                            } else if (err.message) {
                              errorMessage += `: ${err.message}`;
                            }
                            
                            setError(errorMessage);
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={Math.ceil(totalQuestions / questionsPerPage) || 1}
              page={currentPage}              onChange={(_, value) => {
                setCurrentPage(value);
                fetchQuestions(); // Fetch questions when page changes
              }}
              color="primary"
              sx={{ '& .MuiPaginationItem-root': { borderRadius: 2, fontWeight: 600 } }}
            />
          </Box>
        </>
      )}      {/* "Question Management" header and "+ Add Question" button moved to top of page */}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}      {/* Second table and pagination removed to streamline the UI */}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedQuestion ? 'Edit Question' : 'Add New Question'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Question Text"
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Question Type</InputLabel>
              <Select
                value={formData.question_type}
                onChange={e => setFormData({ ...formData, question_type: e.target.value as string })}
              >
                <MenuItem value="MCQ">MCQ</MenuItem>
                <MenuItem value="True/False">True/False</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Paper</InputLabel>
              <Select
                value={formData.paper_id}
                onChange={e => setFormData({ ...formData, paper_id: Number(e.target.value), section_id: 0, subsection_id: null })}
              >
                {papers.map((paper) => (
                  <MenuItem key={paper.paper_id} value={paper.paper_id}>
                    {paper.paper_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Section</InputLabel>
              <Select
                value={formData.section_id}
                onChange={e => setFormData({ ...formData, section_id: Number(e.target.value), subsection_id: null })}
                disabled={!formData.paper_id}
              >
                {papers.find((p) => p.paper_id === formData.paper_id)?.sections.map((section) => (
                  <MenuItem key={section.section_id} value={section.section_id}>
                    {section.section_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Subsection</InputLabel>
              <Select
                value={formData.subsection_id ?? ''}
                onChange={e => setFormData({ ...formData, subsection_id: e.target.value === '' ? null : Number(e.target.value) })}
                disabled={!formData.section_id || subsections.length === 0}
              >
                <MenuItem value="">None</MenuItem>
                {subsections.map((sub) => (
                  <MenuItem key={sub.subsection_id} value={sub.subsection_id}>
                    {sub.subsection_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {formData.options.map((option, index) => (
              <TextField
                key={index}
                fullWidth
                label={`Option ${String.fromCharCode(65 + index)}`}
                value={option.option_text}
                onChange={(e) => {
                  const newOptions = [...formData.options];
                  newOptions[index].option_text = e.target.value;
                  setFormData({ ...formData, options: newOptions });
                }}
                sx={{ mb: 2 }}
              />
            ))}

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Correct Answer</InputLabel>
              <Select
                value={formData.correct_option_index}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    correct_option_index: e.target.value as number,
                  })
                }
              >
                {formData.options.map((_, index) => (
                  <MenuItem key={index} value={index}>
                    Option {String.fromCharCode(65 + index)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Explanation"
              value={formData.explanation}
              onChange={(e) =>
                setFormData({ ...formData, explanation: e.target.value })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Valid Until"
              type="date"
              value={formData.valid_until || ''}
              onChange={e => setFormData({ ...formData, valid_until: e.target.value })}
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
              helperText="Set the last valid date for this question (required)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedQuestion ? 'Update' : 'Create'}
          </Button>        </DialogActions>
      </Dialog>
      
      {/* Confirmation Dialog for various actions */}
      <Dialog
        open={confirmDialogProps.open}
        onClose={confirmDialogProps.onCancel}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <DialogTitle id="confirm-dialog-title">{confirmDialogProps.title}</DialogTitle>
        <DialogContent>          {confirmDialogProps.message.split('\n').map((line: string, i: number) => (
            <Typography key={i} variant="body1" gutterBottom>
              {line}
            </Typography>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={confirmDialogProps.onCancel} color="inherit">
            {confirmDialogProps.cancelText}
          </Button>
          <Button onClick={confirmDialogProps.onConfirm} color="primary" autoFocus>
            {confirmDialogProps.confirmText}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity} 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
