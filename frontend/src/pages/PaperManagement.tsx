import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper as MuiPaper,
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
  IconButton,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import { papersAPI } from '../services/api';
import { Loading } from '../components/Loading';

interface Section {
  section_id?: number;
  section_name: string;
  marks_allocated: number;
  description: string;
  subsections: Subsection[];
}

interface Subsection {
  subsection_id?: number;
  subsection_name: string;
  description: string;
}

interface ExamPaper {
  paper_id: number;
  paper_name: string;
  total_marks: number;
  description: string;
  is_active: boolean;
  sections: Section[];
}

export const PaperManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<{
    paper_name: string;
    total_marks: number;
    description: string;
    sections: Section[];
  }>({
    paper_name: '',
    total_marks: 0,
    description: '',
    sections: [],
  });

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      setLoading(true);
      const response = await papersAPI.getPapers();
      setPapers(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load papers');
    } finally {
      setLoading(false);
    }
  };
  const handleCreatePaper = async () => {
    try {
      // Validate required fields before submission
      if (!formData.paper_name || formData.paper_name.trim() === '') {
        setError('Paper name is required');
        return;
      }
      
      if (formData.total_marks <= 0) {
        setError('Total marks must be greater than 0');
        return;
      }
      
      // Log the data being sent to help with debugging
      console.log('Creating paper with data:', JSON.stringify(formData));
      
      await papersAPI.createPaper(formData);
      setOpenDialog(false);
      resetForm();
      fetchPapers();
      setError(null); // Clear any previous errors on success
    } catch (err: any) {
      console.error('Error creating paper:', err);
      setError(err.response?.data?.detail || 'Failed to create paper');
    }
  };

  const handleTogglePaperStatus = async (paperId: number, isActive: boolean) => {
    try {
      if (isActive) {
        await papersAPI.deactivatePaper(paperId);
      } else {
        await papersAPI.activatePaper(paperId);
      }
      fetchPapers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update paper status');
    }
  };

  const resetForm = () => {
    setFormData({
      paper_name: '',
      total_marks: 0,
      description: '',
      sections: [],
    });
  };

  const addSection = () => {
    setFormData({
      ...formData,
      sections: [
        ...formData.sections,
        {
          section_name: '',
          marks_allocated: 0,
          description: '',
          subsections: [],
        },
      ],
    });
  };

  const updateSection = (index: number, field: string, value: any) => {
    const updatedSections = [...formData.sections];
    updatedSections[index] = {
      ...updatedSections[index],
      [field]: value,
    };
    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  const removeSection = (index: number) => {
    const updatedSections = [...formData.sections];
    updatedSections.splice(index, 1);
    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  const addSubsection = (sectionIndex: number) => {
    const updatedSections = [...formData.sections];
    updatedSections[sectionIndex].subsections.push({
      subsection_name: '',
      description: '',
    });
    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  const updateSubsection = (
    sectionIndex: number,
    subsectionIndex: number,
    field: string,
    value: string
  ) => {
    const updatedSections = [...formData.sections];
    updatedSections[sectionIndex].subsections[subsectionIndex] = {
      ...updatedSections[sectionIndex].subsections[subsectionIndex],
      [field]: value,
    };
    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  const removeSubsection = (sectionIndex: number, subsectionIndex: number) => {
    const updatedSections = [...formData.sections];
    updatedSections[sectionIndex].subsections.splice(subsectionIndex, 1);
    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  if (loading) {
    return <Loading message="Loading papers..." />;
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Paper & Section Management</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm();
            setOpenDialog(true);
          }}
        >
          Add Paper
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {papers.length === 0 ? (
        <Alert severity="info">No papers found. Create your first paper to get started.</Alert>
      ) : (
        papers.map((paper) => (
          <MuiPaper key={paper.paper_id} sx={{ mb: 3, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">{paper.paper_name}</Typography>
              <Box>
                <IconButton
                  color={paper.is_active ? 'success' : 'error'}
                  onClick={() => handleTogglePaperStatus(paper.paper_id, paper.is_active)}
                  title={paper.is_active ? 'Deactivate Paper' : 'Activate Paper'}
                >
                  {paper.is_active ? <ActiveIcon /> : <InactiveIcon />}
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 3 }}>
                Total Marks: {paper.total_marks}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 3 }}>
                Sections: {paper.sections.length}
              </Typography>
              <Typography
                variant="body2"
                color={paper.is_active ? 'success.main' : 'error.main'}
                sx={{ fontWeight: 'bold' }}
              >
                {paper.is_active ? 'Active' : 'Inactive'}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {paper.description || 'No description provided.'}
            </Typography>

            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
              Sections:
            </Typography>

            {paper.sections.length > 0 ? (
              paper.sections.map((section) => (
                <Accordion key={section.section_id}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>{section.section_name}</Typography>
                    <Typography sx={{ ml: 2, color: 'text.secondary' }}>
                      ({section.marks_allocated} marks)
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {section.description || 'No description provided.'}
                    </Typography>
                    
                    {section.subsections?.length > 0 && (
                      <>
                        <Typography variant="subtitle2" sx={{ mt: 2 }}>
                          Subsections:
                        </Typography>
                        <TableContainer component={MuiPaper} variant="outlined" sx={{ mt: 1 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Description</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {section.subsections.map((subsection) => (
                                <TableRow key={subsection.subsection_id}>
                                  <TableCell>{subsection.subsection_name}</TableCell>
                                  <TableCell>{subsection.description || 'No description'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No sections defined for this paper.
              </Typography>
            )}
          </MuiPaper>
        ))
      )}

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add New Paper</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="Paper Name"
            value={formData.paper_name}
            onChange={(e) => setFormData({ ...formData, paper_name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Total Marks"
            type="number"
            value={formData.total_marks}
            onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) || 0 })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
          />

          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="h6">Sections</Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addSection}
              sx={{ mt: 1 }}
            >
              Add Section
            </Button>
          </Box>

          {formData.sections.map((section, sectionIndex) => (
            <Box
              key={sectionIndex}
              sx={{
                p: 2,
                border: '1px solid #ddd',
                borderRadius: '4px',
                mb: 2,
                position: 'relative',
              }}
            >
              <IconButton
                size="small"
                color="error"
                sx={{ position: 'absolute', top: 8, right: 8 }}
                onClick={() => removeSection(sectionIndex)}
              >
                <DeleteIcon />
              </IconButton>
              
              <Typography variant="subtitle1">Section {sectionIndex + 1}</Typography>
              
              <TextField
                fullWidth
                label="Section Name"
                value={section.section_name}
                onChange={(e) => updateSection(sectionIndex, 'section_name', e.target.value)}
                margin="dense"
                required
              />
              
              <TextField
                fullWidth
                label="Marks Allocated"
                type="number"
                value={section.marks_allocated}
                onChange={(e) => updateSection(sectionIndex, 'marks_allocated', parseInt(e.target.value) || 0)}
                margin="dense"
                required
              />
              
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={section.description}
                onChange={(e) => updateSection(sectionIndex, 'description', e.target.value)}
                margin="dense"
              />
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Subsections</Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => addSubsection(sectionIndex)}
                  sx={{ mt: 1, mb: 1 }}
                >
                  Add Subsection
                </Button>
                
                {section.subsections.map((subsection, subsectionIndex) => (
                  <Box
                    key={subsectionIndex}
                    sx={{
                      p: 2,
                      bgcolor: '#f9f9f9',
                      borderRadius: '4px',
                      mb: 1,
                      position: 'relative',
                    }}
                  >
                    <IconButton
                      size="small"
                      color="error"
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                      onClick={() => removeSubsection(sectionIndex, subsectionIndex)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                    
                    <TextField
                      fullWidth
                      label="Subsection Name"
                      value={subsection.subsection_name}
                      onChange={(e) => updateSubsection(sectionIndex, subsectionIndex, 'subsection_name', e.target.value)}
                      margin="dense"
                      size="small"
                      required
                    />
                    
                    <TextField
                      fullWidth
                      label="Description"
                      value={subsection.description}
                      onChange={(e) => updateSubsection(sectionIndex, subsectionIndex, 'description', e.target.value)}
                      margin="dense"
                      size="small"
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreatePaper}
            disabled={!formData.paper_name || formData.total_marks <= 0}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
