import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { questionsAPI, papersAPI } from '../services/api';
import { Loading } from '../components/Loading';

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
  is_active: boolean;
}

export const QuestionManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);  const [questions, setQuestions] = useState<Question[]>([]);
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState({
    question_text: '',
    paper_id: 0,
    section_id: 0,
    default_difficulty_level: 'Easy',
    options: [
      { option_text: '', option_order: 0 },
      { option_text: '', option_order: 1 },
      { option_text: '', option_order: 2 },
      { option_text: '', option_order: 3 },
    ],
    correct_option_index: 0,
    explanation: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [questionsRes, papersRes] = await Promise.all([
        questionsAPI.getQuestions(),
        papersAPI.getPapers(),
      ]);
      setQuestions(questionsRes.data);
      setPapers(papersRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (selectedQuestion) {
        // Update existing question
        await questionsAPI.updateQuestion(selectedQuestion.question_id, formData);
      } else {
        // Create new question
        await questionsAPI.createQuestion(formData);
      }
      setOpenDialog(false);
      fetchData();
    } catch (err: any) {
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

  if (loading) {
    return <Loading message="Loading questions..." />;
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Question Management</Typography>
        <Box>
          <input
            type="file"
            accept=".csv,.xlsx"
            style={{ display: 'none' }}
            id="file-upload"
            onChange={handleFileUpload}
          />
          <label htmlFor="file-upload">
            <Button
              component="span"
              variant="contained"
              disabled={uploading}
              sx={{ mr: 2 }}
            >
              {uploading ? 'Uploading...' : 'Upload Questions'}
            </Button>
          </label>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedQuestion(null);
              setFormData({
                question_text: '',
                paper_id: 0,
                section_id: 0,
                default_difficulty_level: 'Easy',
                options: [
                  { option_text: '', option_order: 0 },
                  { option_text: '', option_order: 1 },
                  { option_text: '', option_order: 2 },
                  { option_text: '', option_order: 3 },
                ],
                correct_option_index: 0,
                explanation: '',
              });
              setOpenDialog(true);
            }}
          >
            Add Question
          </Button>
        </Box>
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
              <TableCell>Status</TableCell>
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
                <TableCell>{question.is_active ? 'Active' : 'Inactive'}</TableCell>
                <TableCell>                  <IconButton
                    onClick={() => {
                      setSelectedQuestion(question);
                      setFormData({
                        ...formData,
                        question_text: question.question_text,
                        paper_id: question.paper_id,
                        section_id: question.section_id,
                        default_difficulty_level: question.default_difficulty_level,
                      });
                      setOpenDialog(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={async () => {
                      try {
                        await questionsAPI.deactivateQuestion(question.question_id);
                        fetchData();
                      } catch (err: any) {
                        setError(err.response?.data?.detail || 'Failed to deactivate question');
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
              onChange={(e) =>
                setFormData({ ...formData, question_text: e.target.value })
              }
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Paper</InputLabel>
              <Select
                value={formData.paper_id}
                onChange={(e) =>
                  setFormData({ ...formData, paper_id: Number(e.target.value) })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, section_id: Number(e.target.value) })
                }
                disabled={!formData.paper_id}
              >
                {papers
                  .find((p) => p.paper_id === formData.paper_id)
                  ?.sections.map((section) => (
                    <MenuItem key={section.section_id} value={section.section_id}>
                      {section.section_name}
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
