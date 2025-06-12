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
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { questionsAPI, papersAPI } from '../services/api';
import { Loading } from '../components/Loading';
import Pagination from '@mui/material/Pagination';
import Tooltip from '@mui/material/Tooltip';
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

export const QuestionManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [papers, setPapers] = useState<ExamPaper[]>([]);
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
  const [total, setTotal] = useState(0);

  // --- Search State ---
  const [searchParams, setSearchParams] = useState({
    query: '',
    paper_name: '',
    section_name: '',
    subsection_name: '',
    question_type: '',
    difficulty_level: '',
    include_expired: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [questionsPerPage] = useState(20);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchData(page);
  }, [page]);

  // --- Fetch Questions (Admin Search) ---
  const fetchQuestions = useCallback(async () => {
    setSearchLoading(true);
    setSearchError(null);
    try {
      const params: any = {
        ...Object.fromEntries(Object.entries(searchParams).filter(([_, v]) => v !== '' && v !== false)),
        limit: questionsPerPage,
        offset: (currentPage - 1) * questionsPerPage,
      };
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
      setTotalQuestions(data.total || data.length || 0);
    } catch (err: any) {
      setSearchError(err.message || 'Failed to fetch questions');
      setSearchResults([]);
      setTotalQuestions(0);
    } finally {
      setSearchLoading(false);
    }
  }, [searchParams, currentPage, questionsPerPage]);

  // --- Effect: Fetch on mount and when search/filter/page changes ---
  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const fetchData = async (pageNum = 1) => {
    try {
      setLoading(true);
      const [questionsRes, papersRes] = await Promise.all([
        questionsAPI.getQuestions({ page: pageNum, page_size: pageSize }),
        papersAPI.getPapers(),
      ]);
      // Support both paginated and legacy response
      if (questionsRes.data.items) {
        setQuestions(questionsRes.data.items);
        setTotal(questionsRes.data.total);
      } else {
        setQuestions(questionsRes.data);
        setTotal(questionsRes.data.length);
      }
      setPapers(papersRes.data.items ? papersRes.data.items : papersRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

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
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      await questionsAPI.uploadQuestions(file);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload questions');
    } finally {
      setUploading(false);
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
  };
  const handleClearFilters = () => {
    setSearchParams({
      query: '',
      paper_name: '',
      section_name: '',
      subsection_name: '',
      question_type: '',
      difficulty_level: '',
      include_expired: false,
    });
    setCurrentPage(1);
  };
  const handleSearch = () => {
    setCurrentPage(1);
    fetchQuestions();
  };

  if (loading) {
    return <Loading message="Loading questions..." />;
  }

  return (
    <Box>
      {/* --- Search Filters UI --- */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 3, bgcolor: 'background.default', boxShadow: 2 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: 'primary.main', letterSpacing: 1 }}>
          Search & Filter Questions
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
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
            sx={{ ml: 1 }}
          />
          <Button variant="contained" color="primary" onClick={handleSearch} sx={{ height: 40, px: 3, fontWeight: 600, borderRadius: 2, boxShadow: 1 }}>
            Search
          </Button>
          <Button variant="outlined" color="secondary" onClick={handleClearFilters} sx={{ height: 40, px: 3, fontWeight: 600, borderRadius: 2 }}>
            Clear Filters
          </Button>
        </Box>
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
        </Button>
        <Tooltip title="Upload Questions CSV" placement="top" arrow>
          <span>
            <label htmlFor="file-upload">
              <Button
                component="span"
                variant="outlined"
                color="primary"
                sx={{ fontWeight: 600, borderRadius: 2, minWidth: 180 }}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Questions CSV'}
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
        </Tooltip>
        <Tooltip title="Download Sample CSV Template" placement="top" arrow>
          <IconButton
            color="primary"
            component="a"
            href="/assets/samplequestions_template.csv"
            download
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
              page={currentPage}
              onChange={(_, value) => setCurrentPage(value)}
              color="primary"
              sx={{ '& .MuiPaginationItem-root': { borderRadius: 2, fontWeight: 600 } }}
            />
          </Box>
        </>
      )}

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
        <Typography variant="h4" sx={{ mr: 5, mt: 0.5 }}>Question Management</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 180 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            fullWidth
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
                valid_until: '', // Initialize valid_until
              });
              setOpenDialog(true);
            }}
          >
            Add Question
          </Button>
        </Box>
        <Box sx={{ flex: 1 }} />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Question</TableCell>
              <TableCell>Paper</TableCell>
              <TableCell>Section</TableCell>
              <TableCell>Difficulty</TableCell>
              <TableCell>Validity</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {questions.map((question) => (
              <TableRow key={question.question_id}>
                <TableCell>{question.question_text}</TableCell>
                <TableCell>
                  {papers.find((p) => p.paper_id === question.paper_id)?.paper_name}
                </TableCell>
                <TableCell>
                  {papers
                    .find((p) => p.paper_id === question.paper_id)
                    ?.sections.find((s) => s.section_id === question.section_id)
                    ?.section_name}
                </TableCell>
                <TableCell>{question.default_difficulty_level}</TableCell>
                <TableCell>{new Date((question as any).valid_until).toLocaleDateString()}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => {
                      setSelectedQuestion(question);
                      setFormData({
                        question_text: question.question_text,
                        question_type: (question as any).question_type || 'MCQ',
                        paper_id: question.paper_id,
                        section_id: question.section_id,
                        subsection_id: (question as any).subsection_id ?? null,
                        default_difficulty_level: (question as any).default_difficulty_level || 'Easy',
                        options: (question as any).options || [
                          { option_text: '', option_order: 0 },
                          { option_text: '', option_order: 1 },
                          { option_text: '', option_order: 2 },
                          { option_text: '', option_order: 3 },
                        ],
                        correct_option_index: (question as any).correct_option_index ?? 0,
                        explanation: (question as any).explanation || '',
                        valid_until: question.valid_until, // Bind valid_until
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
                        console.log(`[DEBUG][DELETE] Starting delete operation for question ID: ${question.question_id}`);
                        
                        // Add pre-delete verification
                        try {
                          // First check if the question exists
                          await questionsAPI.getQuestion(question.question_id);
                        } catch (verifyErr: any) {
                          console.error(`[DEBUG][DELETE] Pre-delete verification failed:`, verifyErr);
                          if (verifyErr.response?.status === 404) {
                            setError(`Question ${question.question_id} does not exist or was already deleted`);
                            setLoading(false);
                            return;
                          }
                        }
                        
                        // Now try the delete
                        console.log(`[DEBUG][DELETE] Sending delete request for question ID: ${question.question_id}`);
                        const response = await questionsAPI.deleteQuestion(question.question_id);
                        console.log(`[DEBUG][DELETE] Delete successful for question ID: ${question.question_id}`, response);
                        fetchData();
                      } catch (err: any) {
                        console.error(`[DEBUG][DELETE] Error deleting question ${question.question_id}:`, err);
                        console.error(`[DEBUG][DELETE] Response:`, err.response?.data);
                        console.error(`[DEBUG][DELETE] Status:`, err.response?.status);
                        
                        // Detailed error message
                        let errorMessage = `Failed to delete question ${question.question_id}`;
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
          count={Math.ceil(total / pageSize)}
          page={page}
          onChange={(_, value) => setPage(value)}
          color="primary"
        />
      </Box>

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
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
